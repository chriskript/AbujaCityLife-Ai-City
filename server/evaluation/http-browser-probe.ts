import {mkdir,open,readFile,writeFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {NeighbourhoodServerSession,validateLivePlan,type LivePlan} from '../session.js';
import {createNeighbourhoodHttp} from '../http.js';
import {replaceCheckpoint} from '../persistence/replace-checkpoint.js';
import {SelectiveNeighbourhoodProvider} from '../inference/selective-provider.js';
import type {NeighbourhoodProvider} from '../inference/neighbourhood-provider.js';
import {prepareModelInput} from '../inference/model-context.js';
import {generationReservation} from '../inference/model-limits.js';
import {createTown} from '../../shared/neighbourhood/town.js';
import {assertSnapshot} from '../../shared/neighbourhood/snapshot.js';
import {ordinaryRejection} from '../../shared/neighbourhood/decision-recovery.js';
import type {NeighbourhoodFrame} from '../../shared/neighbourhood/presentation.js';

// Acceptance instrumentation only: the normal HTTP server owns progression and
// the existing selective provider owns the Muse/mechanics boundary. No clock,
// resident choice, retry, fallback, or extra HTTP route is introduced here.
export async function startHttpBrowserProbe(options:{
  directory:string;plan:LivePlan;provider:NeighbourhoodProvider;accessToken:string;
  kind:'live-meta'|'offline-contract-rehearsal';port?:number;dist?:string;
  maximumWallMs:number;attempt?:()=>unknown;forbiddenPublicStrings?:string[];
}){
  validateLivePlan(options.plan);
  if(options.plan.phase!=='7g-d-society'||options.plan.inputTokenLimit!==8000||options.provider.mode!=='live-meta'||options.maximumWallMs<60000||options.maximumWallMs>90*60000)throw new Error('Invalid bounded HTTP society profile');
  await mkdir(options.directory,{recursive:true});
  for(const name of ['session.json','evidence.ndjson','initial-world.json','report.json']){
    try{await access(join(options.directory,name));throw Object.assign(new Error('Existing HTTP evaluation cannot be resumed'),{code:'EEXIST'});}
    catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  }
  const file=await open(join(options.directory,'evidence.ndjson'),'wx',0o600),checkpoint=join(options.directory,'session.json');
  let queue=Promise.resolve(),recordingError:unknown=null;
  const append=(row:unknown)=>{
    const text=JSON.stringify(row)+'\n';
    const job=queue.then(async()=>{await file.writeFile(text);await file.sync();});
    queue=job.catch(e=>{recordingError=e;});return job;
  };
  const started=performance.now(),events=new Map<string,any>(),validations=new Map<string,any>(),discarded=new Set<string>(),attempts:any[]=[];
  let active=0,maximumPending=0,stopping=false,providerFailed=false,privacyFailed=false,blockedAfterStop=0,observers=0,peakObservers=0;
  let failureSeenAt:number|null=null,coreFailurePauseObserved=false,lastPaused:boolean|undefined;
  let session!:NeighbourhoodServerSession;
  const initial=createTown(options.plan.id+'-world');initial.enableSocialVisits();
  await writeFile(join(options.directory,'initial-world.json'),initial.serialize(),{flag:'wx'});
  const recording:NeighbourhoodProvider={mode:'live-meta',metrics:null,
    async decide(request){
      if(stopping||providerFailed||privacyFailed||recordingError||attempts.length>=options.plan.maxGenerations||performance.now()-started>=options.maximumWallMs-30000||Date.now()>=Date.parse(options.plan.expiresAt)-30000){blockedAfterStop++;throw new Error('HTTP acceptance boundary reached; no provider call made');}
      const number=attempts.length+1,prepared=prepareModelInput(request,'decision');
      const row:any={number,requestId:request.id,actor:request.actorId,time:request.observation.time,status:'prepared'};attempts.push(row);
      await append({stage:'model-started',kind:options.kind,number,request,modelInput:prepared.input,systemInstructions:prepared.instructions,decisionSchema:prepared.schema,contextSelection:prepared.audit,checkpointBefore:JSON.parse(await readFile(checkpoint,'utf8'))});
      if(stopping||recordingError){blockedAfterStop++;throw new Error('Evidence unavailable; provider not invoked');}
      active++;maximumPending=Math.max(maximumPending,active);recording.metrics=null;
      if(active!==1)throw new Error('Overlapping inference refused');
      const begin=performance.now();
      try{
        row.status='provider-started';
        const result=await options.provider.decide(request);recording.metrics=options.provider.metrics;
        if(result.mode!=='meta')throw new Error('Muse decision expected; offline substitution refused');
        Object.assign(row,{status:'returned',decision:result.decision,metrics:recording.metrics,latencyMs:Math.round(performance.now()-begin),attempt:options.attempt?.()??null});
        await append({stage:'model-returned',kind:options.kind,...row});return result;
      }catch(e){
        providerFailed=true;failureSeenAt=performance.now();recording.metrics=options.provider.metrics;
        Object.assign(row,{status:'failed',error:e instanceof Error?e.message:'Provider unavailable',metrics:recording.metrics,latencyMs:Math.round(performance.now()-begin),attempt:options.attempt?.()??null});
        await append({stage:'model-failed',kind:options.kind,...row});throw e;
      }finally{active--;}
    },
    async converse(){throw new Error('Player-triggered inference is outside this bounded autonomous acceptance run');},
  };
  session=await NeighbourhoodServerSession.open({checkpoint,provider:new SelectiveNeighbourhoodProvider(options.plan.residents!,recording,undefined,true),plan:options.plan,initialWorld:initial.serialize()});
  await session.command({id:'http-acceptance-initial-pause',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});
  const observe=(frame:NeighbourhoodFrame)=>{
    const publicText=JSON.stringify(frame);
    if(options.forbiddenPublicStrings?.some(s=>s.length>0&&publicText.includes(s))||frame.snapshot.actors.some(a=>['knowledge','memories','needs'].some(key=>Object.hasOwn(a,key))))privacyFailed=true;
    const fresh=frame.events.filter(e=>!events.has(e.id));
    for(const e of fresh){events.set(e.id,e);if(e.type==='action-validated')validations.set(e.subject,e);if(e.type==='inference-unavailable')discarded.add(e.subject);}
    if(fresh.length||frame.paused!==lastPaused)void append({stage:'committed-frame',kind:options.kind,frame,newEventIds:fresh.map(e=>e.id)}).catch(()=>{});
    lastPaused=frame.paused;
  };
  const unsubscribe=session.subscribe(observe);
  const http=createNeighbourhoodHttp(session,options.accessToken,{...(options.dist?{dist:options.dist}:{})});
  http.server.on('request',(request,response)=>{
    if(new URL(request.url??'/','http://127.0.0.1').pathname!=='/api/events'||!response.headersSent||response.statusCode!==200)return;
    observers++;peakObservers=Math.max(peakObservers,observers);
    void append({stage:'observer-connected',time:session.frame.snapshot.time,observers}).catch(()=>{});
    response.once('close',()=>{observers--;void append({stage:'observer-disconnected',time:session.frame.snapshot.time,observers}).catch(()=>{});});
  });
  await new Promise<void>((resolve,reject)=>{http.server.once('error',reject);http.server.listen(options.port??0,'127.0.0.1',()=>{http.server.off('error',reject);resolve();});});
  const port=(http.server.address() as {port:number}).port;
  const status=()=>({id:options.plan.id,kind:options.kind,mode:session.mode,sessionId:session.frame.sessionId,worldId:session.frame.snapshot.worldId,sequence:session.frame.sequence,time:session.frame.snapshot.time,paused:session.paused,requests:attempts.length,returned:attempts.filter(a=>a.status==='returned').length,inFlight:active,observers,providerFailed,stopping,wallMs:Math.round(performance.now()-started)});
  let resolveDone!:(v:any)=>void,rejectDone!:(e:unknown)=>void;
  const done=new Promise<any>((resolve,reject)=>{resolveDone=resolve;rejectDone=reject;});void done.catch(()=>{});
  let stopJob:Promise<void>|null=null,statusJob:Promise<void>|null=null;
  const stop=(reason:string)=>{
    if(stopJob)return stopJob;
    stopping=true;clearInterval(watcher);
    stopJob=(async()=>{
      // A failed persistence boundary cannot accept another durable command.
      // Preserve the last good checkpoint and pending file, even if not paused.
      let persistenceFailed=!session.operational;
      if(!persistenceFailed){
        try{await session.command({id:'http-acceptance-end',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});}
        catch(e){if(session.operational)throw e;persistenceFailed=true;}
      }
      await http.close();unsubscribe();if(statusJob)await statusJob;await queue;
      const saved=JSON.parse(await readFile(checkpoint,'utf8')),world=JSON.parse(saved.world);assertSnapshot(world);
      if(!saved.paused&&!persistenceFailed||saved.requests>options.plan.maxGenerations||saved.plan.used!==saved.requests||Math.round(saved.plan.reservedUsd*1e6)!==saved.requests*Math.round(generationReservation(8000)*1e6)||maximumPending>1)throw new Error('HTTP acceptance accounting mismatch');
      const accepted=attempts.filter(a=>validations.get(a.requestId)?.data.accepted===true),rejected=attempts.filter(a=>validations.get(a.requestId)?.data.accepted===false);
      const measured=attempts.filter(a=>a.metrics),used={inputTokens:measured.reduce((s,a)=>s+a.metrics.inputTokens,0),outputTokens:measured.reduce((s,a)=>s+a.metrics.outputTokens,0),knownEstimatedUsd:measured.reduce((s,a)=>s+a.metrics.estimatedCostUsd,0),unknownInvocations:attempts.filter(a=>a.status==='provider-started'||a.status==='failed'&&!a.metrics).length};
      const report={kind:options.kind,id:options.plan.id,stopReason:reason,limits:{plan:options.plan,maximumSimulationSeconds:1800,maximumWallMs:options.maximumWallMs},wallMs:Math.round(performance.now()-started),time:world.time,sessionId:saved.sessionId,worldId:world.id,requests:saved.requests,routineRequests:saved.routineRequests??0,providerInvocations:attempts.filter(a=>a.status==='returned'||a.status==='failed'||a.status==='provider-started').length,returned:attempts.filter(a=>a.status==='returned').length,accepted:accepted.length,rejected:rejected.length,ordinaryRejections:rejected.filter(a=>ordinaryRejection(validations.get(a.requestId).detail)).map(a=>({number:a.number,actor:a.actor,reason:validations.get(a.requestId).detail})),unexecutedReturned:attempts.filter(a=>a.status==='returned'&&!validations.has(a.requestId)).map(a=>a.number),usage:used,maximumPending,peakObservers,providerFailed,privacyFailed,recordingFailed:!!recordingError,blockedAfterStop,coreFailurePauseObserved,actors:[...new Set(attempts.map(a=>a.actor))],attempts:attempts.map(a=>({...a,validation:validations.get(a.requestId)??null})),eventCount:events.size,events:[...events.values()],interruptions:session.interruptions,paused:saved.paused,maximumReservedUsd:saved.plan.reservedUsd};
      Object.assign(report,{persistenceFailed,terminalStopped:true});
      await append({stage:'completed',kind:options.kind,report:{...report,events:undefined,attempts:undefined},world});await queue;
      await writeFile(join(options.directory,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
      await writeFile(join(options.directory,'status.json'),JSON.stringify({...status(),complete:true,stopReason:reason},null,2));
      await file.close();if(recordingError)throw new Error('HTTP acceptance evidence persistence failed');resolveDone(report);
    })().catch(async e=>{await file.close().catch(()=>{});rejectDone(e);});void stopJob.catch(()=>{});return stopJob;
  };
  const watcher=setInterval(()=>{
    if(stopping)return;
    const frame=session.frame;
    const interrupted=session.interruptions.length>0;
    const serious=[...validations.values()].some(v=>v.data.accepted===false&&!ordinaryRejection(v.detail));
    if((providerFailed||interrupted||serious)&&session.paused){coreFailurePauseObserved=true;void stop(providerFailed?'provider-failed':interrupted?'inference-failed':'validation-failed');return;}
    if((providerFailed||interrupted||serious)&&failureSeenAt===null)failureSeenAt=performance.now();
    if((providerFailed||interrupted||serious)&&performance.now()-(failureSeenAt??performance.now())>1500){void stop('http-safe-stop-not-observed');return;}
    if(privacyFailed||recordingError||!session.operational){void stop(privacyFailed?'privacy-failed':'integrity-failed');return;}
    // A request being durably recorded has not yet entered the provider. It
    // must not be mistaken for a completed last invocation at the quota edge.
    const settled=active===0&&attempts.every(a=>a.status==='returned'&&(validations.has(a.requestId)||discarded.has(a.requestId)));
    if(attempts.length>=options.plan.maxGenerations&&settled){void stop('generation-limit');return;}
    if(frame.snapshot.time>=1800){void stop('simulation-limit');return;}
    if(performance.now()-started>=options.maximumWallMs-30000){void stop('wall-limit');return;}
    if(!statusJob){
      statusJob=(async()=>{const path=join(options.directory,'status.json');await writeFile(path+'.pending',JSON.stringify(status(),null,2),{flag:'wx'});await replaceCheckpoint(path+'.pending',path);})().catch(e=>{recordingError=e;}).finally(()=>{statusJob=null;});
    }
  },250);
  await append({stage:'http-ready',kind:options.kind,plan:options.plan,maximumWallMs:options.maximumWallMs,maximumSimulationSeconds:1800,url:`http://127.0.0.1:${port}`,sessionId:session.frame.sessionId,worldId:session.frame.snapshot.worldId});
  return {session,port,done,status,stop,appendEvidence:append};
}
