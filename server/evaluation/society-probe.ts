import { ordinaryRejection } from '../../shared/neighbourhood/decision-recovery.js';
import { open, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { NeighbourhoodServerSession, validateLivePlan, type LivePlan } from '../session.js';
import { MockNeighbourhoodProvider, neighbourhoodModelConfiguration, type NeighbourhoodProvider } from '../inference/neighbourhood-provider.js';
import { SelectiveNeighbourhoodProvider, reasoningOpportunity } from '../inference/selective-provider.js';
import { createTown } from '../../shared/neighbourhood/town.js';
import { isNpcDecision } from '../../shared/neighbourhood/decision-schema.js';
import type { NpcDecision, NpcDecisionRequest, WorldState } from '../../shared/neighbourhood/types.js';
import { assertSnapshot } from '../../shared/neighbourhood/snapshot.js';
import { firstSocietyLimits, phaseBSocietyLimits, phaseCSocietyLimits, contextSocietyLimits, phaseDSocietyLimits, phaseCResidents, type SocietyLimits } from './society-plan.js';
import { societyStateChanges, societyReportMarkdown, type SocietyDecisionEvidence } from './society-report.js';
import { prepareModelInput } from '../inference/model-context.js';
import { generationReservation } from '../inference/model-limits.js';

export const societyProbeLimits=firstSocietyLimits;
// This coordinator is deliberately one-shot. Its exclusive evidence file must exist BEFORE
// dispatch; recovery reads artifacts, never resumes calls. All authority stays in the session.
export async function runSocietyProbe(options:{directory:string;provider:NeighbourhoodProvider;selectedResidents:string[];
  plan:LivePlan;kind:'live-meta'|'offline-contract-rehearsal';paceMs?:number;now?:()=>number;limits?:SocietyLimits;wallNow?:()=>number}) {
  const {directory,provider,plan}=options;
  const limits=options.limits ?? societyProbeLimits, wallNow=options.wallNow ?? (()=>performance.now());
  validateLivePlan(plan);
  const expanded=limits.maximumGenerations>=36,longer=limits.maximumGenerations===48,society=limits.maximumGenerations===200;
  const inferenceTimeoutMs=plan.inferenceTimeoutMs ?? neighbourhoodModelConfiguration.timeoutMs;
  if((provider.inferenceTimeoutMs ?? 20000)!==inferenceTimeoutMs)throw new Error('Provider deadline does not match reviewed execution plan');
  const perCall=generationReservation(plan.inputTokenLimit ?? 6000);
  if(provider.mode!=='live-meta' || ![firstSocietyLimits,phaseBSocietyLimits,phaseCSocietyLimits,contextSocietyLimits,phaseDSocietyLimits].some(profile=>JSON.stringify(profile)===JSON.stringify(limits)) || plan.maxGenerations>limits.maximumGenerations || plan.maxEstimatedUsd>limits.maximumIncrementalUsd || !plan.allowAutonomy || expanded && (plan.phase!==(society?'7g-d-society':longer?'7g-d-context':'7g-c-unity') || JSON.stringify(options.selectedResidents)!==JSON.stringify(phaseCResidents)))throw new Error('Probe exceeds the reviewed evaluation limits');
  const initial=createTown('society-7g-initial');
  if(society)initial.enableSocialVisits();
  if(!options.selectedResidents.length || new Set(options.selectedResidents).size!==options.selectedResidents.length || options.selectedResidents.some(id=>!initial.hasResident(id)))throw new Error('Invalid selected residents');
  // Evidence must never attach to an existing checkpoint or silently recover one.
  for (const name of ['session.json','offline-session.json','initial-world.json','report.json']) {
    try {await access(join(directory,name));throw Object.assign(new Error('Existing evaluation artifacts cannot be resumed'),{code:'EEXIST'});}
    catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  }
  const file=await open(join(directory,'evidence.ndjson'),'wx',0o600);
  const append=async(value:unknown)=>{await file.writeFile(JSON.stringify(value)+'\n');await file.sync();};
  const checkpoint=join(directory,'session.json'),offline=new MockNeighbourhoodProvider();
  const started=wallNow();let calls=0,failed=false,failureCategory:'provider-or-context'|'accounting'|null=null;
  let session:NeighbourhoodServerSession|undefined,baseline:NeighbourhoodServerSession|undefined;
  let returned:object|null=null,lastRequestId='',lastActor='',lastDecision:NpcDecision|null=null;
  let pendingEvidence:{request:NpcDecisionRequest;before:WorldState;comparison:unknown;suppliedHistoryIds:string[]}|null=null;
  const decisions:SocietyDecisionEvidence[]=[];
  const reasoningActors=new Set<string>(),proposedTasks=new Set<string>(),acceptedTasks=new Set<string>();
  let stopReason='simulation-bound';
  const recording:NeighbourhoodProvider={mode:'live-meta',metrics:null,
    async decide(request:NpcDecisionRequest){
      if(calls>=plan.maxGenerations)throw new Error('Probe call ceiling reached');calls++;
      lastRequestId=request.id;
      lastActor=request.actorId;lastDecision=null;
      const invocationStarted=performance.now();
      let dispatched=false;recording.metrics=null;
      try{
        const checkpointBefore=JSON.parse(await readFile(checkpoint,'utf8'));
        pendingEvidence={request:structuredClone(request),before:JSON.parse(checkpointBefore.world),comparison:null,suppliedHistoryIds:[]};
        const prepared=prepareModelInput(request,'decision');
        const context=prepared.observation.socialContext;
        pendingEvidence.suppliedHistoryIds=[...(context?.publicFacts.map(f=>f.id) ?? []),...(context?.background?[context.background.id]:[])];
        const unsupportedSocialResponse=prepared.observation.socialVisits?.invitations.some(i=>i.update.status==='pending'&&i.update.respondTo===request.actorId&&i.expiresAt>request.observation.time);
        const comparison=unsupportedSocialResponse?{mode:'mock',model:'town-offline-rules-v1',decision:null,limitation:'The existing offline policy has no structured social-invitation response policy. This is not evidence of superior Muse reasoning.'}:await offline.decide({...structuredClone(request),observation:prepared.observation});
        pendingEvidence.comparison=comparison;
        await append({stage:'model-started',kind:options.kind,number:calls,opportunity:reasoningOpportunity(request.observation,request.triggers),request,modelInput:prepared.input,systemInstructions:prepared.instructions,decisionSchema:prepared.schema,contextSelection:prepared.audit,offlineCounterfactual:comparison,offlineComparisonScope:'same-selected-information-before-wire-deduplication',checkpointBefore});
        dispatched=true;
        const result=await provider.decide(request);recording.metrics=provider.metrics;
        if(result.mode!=='meta')throw new Error('Muse decision expected; offline substitution refused');
        if(isNpcDecision(result.decision))lastDecision=result.decision;
        returned={stage:'model-returned',number:calls,result,latencyMs:Math.round(performance.now()-invocationStarted),retries:0,metrics:provider.metrics,attempt:'attempt' in provider?provider.attempt:null};
        await append(returned);return result;
      }catch(error){
        failed=true;recording.metrics=dispatched?provider.metrics:null;
        const attemptPhase=dispatched&&'attempt' in provider?(provider.attempt as {phase?:string}|null)?.phase:undefined;
        failureCategory=attemptPhase==='prepared'||/budget|ledger|reserv|usage|accounting|checkpoint/i.test(error instanceof Error?error.message:'')?'accounting':'provider-or-context';
        returned={stage:'model-failed',number:calls,error:error instanceof Error?error.message:'Provider failed',latencyMs:Math.round(performance.now()-invocationStarted),retries:0,metrics:recording.metrics,attempt:dispatched&&'attempt' in provider?provider.attempt:{phase:'context-preparing'}};
        await append(returned);throw error;
      }
    },
    async converse(){throw new Error('Player conversation is outside this autonomous probe');},
  };
  try{
    await append({stage:'started',kind:options.kind,modelConfiguration:{...neighbourhoodModelConfiguration,inputTokenLimit:plan.inputTokenLimit ?? 6000,timeoutMs:inferenceTimeoutMs},instructionPolicy:'scoped-v1; exact instructions per invocation',prioritiseResponses:expanded,limits,selectedResidents:options.selectedResidents,plan,initialWorld:initial.snapshot});
    await writeFile(join(directory,'initial-world.json'),initial.serialize());
    const selective=new SelectiveNeighbourhoodProvider(options.selectedResidents,recording,offline,expanded);
    session=await NeighbourhoodServerSession.open({checkpoint,provider:selective,plan,initialWorld:initial.serialize(),...(options.now?{now:options.now}:{})});
    baseline=await NeighbourhoodServerSession.open({checkpoint:join(directory,'offline-session.json'),provider:offline,initialWorld:initial.serialize()});
    await baseline.command({id:'normal-speed',worldId:baseline.frame.snapshot.worldId,type:'speed',speed:1});
    for(let pulse=0;pulse<limits.maximumSimulationSeconds*4 && session.frame.snapshot.time<limits.maximumSimulationSeconds;pulse++){
      if(failed)break;
      if(wallNow()-started>=limits.maximumWallMs-inferenceTimeoutMs){stopReason='wall-bound';break;}
      if(calls>=plan.maxGenerations){stopReason='generation-limit';break;}
      if((calls+1)*perCall>plan.maxEstimatedUsd){stopReason='reservation-limit';break;}
      await session.tick(.25);await session.decide();
      await baseline.tick(.25);await baseline.decide();
      const persisted=JSON.parse(await readFile(checkpoint,'utf8'));
      const authoritative:WorldState=JSON.parse(persisted.world);assertSnapshot(authoritative);
      if(persisted.requests!==calls || persisted.plan.used!==calls || !Number.isFinite(persisted.plan.reservedUsd) || Math.abs(persisted.plan.reservedUsd-calls*perCall)>1e-9)throw new Error('Evaluation accounting mismatch; stopped');
      if(returned){
        const saved=persisted;
        await append({stage:'world-committed',number:calls,frame:session.frame,world:JSON.parse(saved.world),accounting:{requests:saved.requests,routineRequests:saved.routineRequests,plan:saved.plan}});
        const rejection=session.frame.events.find(e=>e.type==='action-validated' && e.subject===lastRequestId && e.data.accepted===false);
        const validation=session.frame.events.find(e=>e.type==='action-validated' && e.subject===lastRequestId);
        if(!failed && !validation)throw new Error('Missing authoritative validation; stopped');
        if(pendingEvidence){
          const evidence=pendingEvidence as {request:NpcDecisionRequest;before:WorldState;comparison:unknown;suppliedHistoryIds:string[]};
          decisions.push({number:calls,actorId:lastActor,opportunity:reasoningOpportunity(evidence.request.observation,evidence.request.triggers),request:evidence.request,
            decision:lastDecision,offlineCounterfactual:evidence.comparison,metrics:recording.metrics,invocationEvidence:returned,validation:validation ?? null,changes:societyStateChanges(evidence.before,authoritative),
            contextAssessment:{publicExplanation:(lastDecision as NpcDecision|null)?.reason ?? null,suppliedHistoryIds:evidence.suppliedHistoryIds,operatorInterpretation:null,influence:'requires-human-review',causalImprovement:'not-established'}});
          pendingEvidence=null;
        }
        returned=null;if(rejection && !(society&&ordinaryRejection(rejection.detail))){stopReason='rejected-proposal';break;}
        if(!failed){
          reasoningActors.add(lastActor);
          const action=(lastDecision as NpcDecision|null)?.action;
          if(validation?.data.accepted===true&&action?.type==='propose-transport'){
            const event=session.frame.events.filter(e=>e.type==='transport-proposed'&&e.actor===lastActor).at(-1);if(event)proposedTasks.add(event.subject);
          }
          if(validation?.data.accepted===true&&action?.type==='respond-transport'&&action.accept===true)acceptedTasks.add(action.taskId);
        }
      }
      if(limits.maximumGenerations===6 && reasoningActors.size>=2 && session.frame.snapshot.tasks.some(t=>t.status==='delivered'&&proposedTasks.has(t.id)&&acceptedTasks.has(t.id))){stopReason='completed-model-proposed-and-accepted-delivery';break;}
      if(session.paused){stopReason='session-paused';break;}
      if(options.paceMs!==0)await setTimeout(options.paceMs ?? 250);
    }
    // Stop inference immediately after failure. In the isolated society only,
    // previously chosen movement/work timers may finish for at most 60 seconds.
    // No decide(), offline policy, retry, new booking, invitation or purchase runs.
    let deterministicDrainSeconds=0;
    if(society&&failed&&failureCategory!=='accounting'&&session.operational&&!session.paused){
      const beforeDrain=session.frame.snapshot.time;
      while(session.frame.snapshot.time-beforeDrain<60&&session.frame.snapshot.time<limits.maximumSimulationSeconds&&wallNow()-started<limits.maximumWallMs-neighbourhoodModelConfiguration.timeoutMs){
        await session.tick(.25);await baseline.tick(.25);
        if(session.paused)break;
      }
      deterministicDrainSeconds=session.frame.snapshot.time-beforeDrain;
      const drained=JSON.parse(await readFile(checkpoint,'utf8'));
      if(drained.requests!==calls||drained.plan.used!==calls)throw new Error('Interruption accounting mismatch');
      await append({stage:'interrupted-deterministic-drain',seconds:deterministicDrainSeconds,interruptions:session.interruptions,world:JSON.parse(drained.world),newInference:0,newPolicyDecisions:0});
    }
    await session.command({id:'evaluation-end',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});
    await baseline.command({id:'evaluation-end',worldId:baseline.frame.snapshot.worldId,type:'pause',paused:true});
    const final=JSON.parse(await readFile(checkpoint,'utf8')),other=JSON.parse(await readFile(join(directory,'offline-session.json'),'utf8'));
    const summary=(state:WorldState)=>({trade:state.trade,decisionRecovery:state.decisionRecovery,time:state.time,resources:state.resources,produced:state.town!.produced,consumed:state.town!.consumed,
      tasks:Object.values(state.tasks),residents:Object.values(state.npcs).map(n=>({id:n.id,node:n.node,activity:n.activity,inventory:n.inventory,relationships:n.relationships,memories:n.memories,knowledge:n.knowledge})),communication:state.communication,socialVisits:state.socialVisits});
    if(failed)stopReason='provider-failed';
    const finalState:WorldState=JSON.parse(final.world), baselineState:WorldState=JSON.parse(other.world);assertSnapshot(finalState);assertSnapshot(baselineState);
    const acceptedModelDecisions=decisions.filter(d=>(d.validation as {data?:{accepted?:boolean}}|null)?.data?.accepted===true);
    const modelSocialActions=acceptedModelDecisions.flatMap(d=>{
      const decision=d.decision as NpcDecision;
      return ['invite-social','respond-social','join-social','socialise','leave-social','encounter','respond-encounter','communicate','respond-communication','end-call'].includes(decision.action.type)?[{number:d.number,actorId:d.actorId,action:decision.action}]:[];
    });
    const report={kind:options.kind,stage:'complete',stopReason,calls,providerFailed:failed,failureCategory,wallMs:Math.round(wallNow()-started),maximumReservedUsd:Math.round(perCall*1_000_000)*calls/1_000_000,
      selectedResidents:options.selectedResidents,reasoningActors:[...reasoningActors],decisions,interruptions:session.interruptions,deterministicDrainSeconds,
      ordinaryRejections:decisions.filter(d=>{const v=d.validation as {detail?:string;data?:{accepted?:boolean}}|null;return v?.data?.accepted===false&&ordinaryRejection(v.detail ?? '');}).map(d=>({number:d.number,actorId:d.actorId,requestId:d.request.id,validation:d.validation})),
      modelSocialActions,
      actualUsage:{knownEstimatedUsd:decisions.reduce((sum,d)=>sum+(d.metrics?.estimatedCostUsd ?? 0),0),unknownInvocations:decisions.filter(d=>!d.metrics).length,
        measuredGenerations:decisions.filter(d=>d.metrics).length,inputTokens:decisions.reduce((sum,d)=>sum+(d.metrics?.inputTokens ?? 0),0),outputTokens:decisions.reduce((sum,d)=>sum+(d.metrics?.outputTokens ?? 0),0),measuredLatencyMs:decisions.reduce((sum,d)=>sum+(d.metrics?.latencyMs ?? 0),0)},
      independentlyCommittedDeliveries:Object.values(finalState.tasks).filter(t=>t.status==='delivered' && proposedTasks.has(t.id) && acceptedTasks.has(t.id)).map(t=>t.id),
      accounting:{requests:final.requests,routineRequests:final.routineRequests,plan:final.plan,metrics:final.metrics},town:summary(finalState),offlineBaseline:summary(baselineState),
      changesSinceStart:societyStateChanges(initial.snapshot,finalState),baselineChangesSinceStart:societyStateChanges(initial.snapshot,baselineState)};
    await append(report);await writeFile(join(directory,'report.json'),JSON.stringify(report,null,2));await writeFile(join(directory,'report.md'),societyReportMarkdown(report));return report;
  }catch(error){
    if(session?.operational)try{await session.command({id:'evaluation-failed',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});}catch{/* A failed checkpoint must not be rewritten or retried. */}
    if(baseline?.operational)try{await baseline.command({id:'evaluation-failed',worldId:baseline.frame.snapshot.worldId,type:'pause',paused:true});}catch{/* Preserve failure evidence. */}
    await append({stage:'coordinator-failed',calls,retries:0,error:error instanceof Error?error.message:'Coordinator failed'});
    throw error;
  }finally{await session?.close();await baseline?.close();await file.close();}
}
