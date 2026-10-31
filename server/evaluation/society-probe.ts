import { open, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { NeighbourhoodServerSession, type LivePlan } from '../session.js';
import { MockNeighbourhoodProvider, maximumGenerationUsd, type NeighbourhoodProvider } from '../inference/neighbourhood-provider.js';
import { SelectiveNeighbourhoodProvider, reasoningOpportunity } from '../inference/selective-provider.js';
import { createTown } from '../../shared/neighbourhood/town.js';
import { isNpcDecision } from '../../shared/neighbourhood/decision-schema.js';
import type { NpcDecision, NpcDecisionRequest, WorldState } from '../../shared/neighbourhood/types.js';

export const societyProbeLimits={maximumGenerations:6,maximumIncrementalUsd:.10,maximumSimulationSeconds:180,maximumWallMs:300000} as const;
// This coordinator is deliberately one-shot. Its exclusive evidence file must exist BEFORE
// dispatch; recovery reads artifacts, never resumes calls. All authority stays in the session.
export async function runSocietyProbe(options:{directory:string;provider:NeighbourhoodProvider;selectedResidents:string[];
  plan:LivePlan;kind:'live-meta'|'offline-contract-rehearsal';paceMs?:number;now?:()=>number}) {
  const {directory,provider,plan}=options;
  if(provider.mode!=='live-meta' || plan.maxGenerations>societyProbeLimits.maximumGenerations || plan.maxEstimatedUsd>societyProbeLimits.maximumIncrementalUsd || !plan.allowAutonomy)throw new Error('Probe exceeds the first-evaluation limits');
  const initial=createTown('society-7g-initial');
  if(options.selectedResidents.some(id=>!initial.hasResident(id)))throw new Error('Unknown selected resident');
  const file=await open(join(directory,'evidence.ndjson'),'wx',0o600);
  const append=async(value:unknown)=>{await file.writeFile(JSON.stringify(value)+'\n');await file.sync();};
  const checkpoint=join(directory,'session.json'),offline=new MockNeighbourhoodProvider();
  const started=performance.now();let calls=0,failed=false;
  let session:NeighbourhoodServerSession|undefined,baseline:NeighbourhoodServerSession|undefined;
  let returned:object|null=null,lastRequestId='',lastActor='',lastDecision:NpcDecision|null=null;
  const reasoningActors=new Set<string>(),proposedTasks=new Set<string>(),acceptedTasks=new Set<string>();
  let stopReason='simulation-bound';
  const recording:NeighbourhoodProvider={mode:'live-meta',metrics:null,
    async decide(request:NpcDecisionRequest){
      if(calls>=plan.maxGenerations)throw new Error('Probe call ceiling reached');calls++;
      lastRequestId=request.id;
      lastActor=request.actorId;lastDecision=null;
      const comparison=await offline.decide(structuredClone(request));
      await append({stage:'model-started',kind:options.kind,number:calls,opportunity:reasoningOpportunity(request.observation,request.triggers),request,offlineCounterfactual:comparison,checkpointBefore:JSON.parse(await readFile(checkpoint,'utf8'))});
      const invocationStarted=performance.now();
      try{
        const result=await provider.decide(request);recording.metrics=provider.metrics;
        if(isNpcDecision(result.decision))lastDecision=result.decision;
        returned={stage:'model-returned',number:calls,result,latencyMs:Math.round(performance.now()-invocationStarted),retries:0,metrics:provider.metrics,attempt:'attempt' in provider?provider.attempt:null};
        await append(returned);return result;
      }catch(error){
        failed=true;recording.metrics=provider.metrics;
        returned={stage:'model-failed',number:calls,error:error instanceof Error?error.message:'Provider failed',latencyMs:Math.round(performance.now()-invocationStarted),retries:0,metrics:provider.metrics,attempt:'attempt' in provider?provider.attempt:null};
        await append(returned);throw error;
      }
    },
    async converse(){throw new Error('Player conversation is outside this autonomous probe');},
  };
  try{
    await append({stage:'started',kind:options.kind,modelConfiguration:{model:'muse-spark-1.3',reasoning:'low',inputTokenLimit:6000,outputTokenLimit:2048,timeoutMs:20000,store:false,retries:0},limits:societyProbeLimits,selectedResidents:options.selectedResidents,plan,initialWorld:initial.snapshot});
    await writeFile(join(directory,'initial-world.json'),initial.serialize());
    const selective=new SelectiveNeighbourhoodProvider(options.selectedResidents,recording);
    session=await NeighbourhoodServerSession.open({checkpoint,provider:selective,plan,initialWorld:initial.serialize(),...(options.now?{now:options.now}:{})});
    baseline=await NeighbourhoodServerSession.open({checkpoint:join(directory,'offline-session.json'),provider:offline,initialWorld:initial.serialize()});
    await baseline.command({id:'normal-speed',worldId:baseline.frame.snapshot.worldId,type:'speed',speed:1});
    for(let pulse=0;pulse<720 && session.frame.snapshot.time<180 && performance.now()-started<societyProbeLimits.maximumWallMs;pulse++){
      if(failed)break;
      await session.tick(.25);await session.decide();
      await baseline.tick(.25);await baseline.decide();
      if(returned){
        const saved=JSON.parse(await readFile(checkpoint,'utf8'));
        await append({stage:'world-committed',number:calls,frame:session.frame,world:JSON.parse(saved.world),accounting:{requests:saved.requests,routineRequests:saved.routineRequests,plan:saved.plan}});
        const rejection=session.frame.events.find(e=>e.type==='action-validated' && e.subject===lastRequestId && e.data.accepted===false);
        returned=null;if(rejection){stopReason='rejected-proposal';break;}
        if(!failed){
          reasoningActors.add(lastActor);
          const action=(lastDecision as NpcDecision|null)?.action;
          if(action?.type==='propose-transport'){
            const event=session.frame.events.filter(e=>e.type==='transport-proposed'&&e.actor===lastActor).at(-1);if(event)proposedTasks.add(event.subject);
          }
          if(action?.type==='respond-transport'&&action.accept===true)acceptedTasks.add(action.taskId);
        }
      }
      if(reasoningActors.size>=2 && session.frame.snapshot.tasks.some(t=>t.status==='delivered'&&proposedTasks.has(t.id)&&acceptedTasks.has(t.id))){stopReason='completed-model-proposed-and-accepted-delivery';break;}
      if(session.paused)break;
      if(options.paceMs!==0)await setTimeout(options.paceMs ?? 250);
    }
    await session.command({id:'evaluation-end',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});
    await baseline.command({id:'evaluation-end',worldId:baseline.frame.snapshot.worldId,type:'pause',paused:true});
    const final=JSON.parse(await readFile(checkpoint,'utf8')),other=JSON.parse(await readFile(join(directory,'offline-session.json'),'utf8'));
    const summary=(state:WorldState)=>({time:state.time,resources:state.resources,produced:state.town!.produced,consumed:state.town!.consumed,
      tasks:Object.values(state.tasks),residents:Object.values(state.npcs).map(n=>({id:n.id,node:n.node,activity:n.activity,inventory:n.inventory,relationships:n.relationships,memories:n.memories,knowledge:n.knowledge})),communication:state.communication});
    if(failed)stopReason='provider-failed';else if(performance.now()-started>=societyProbeLimits.maximumWallMs)stopReason='wall-bound';
    const report={kind:options.kind,stage:'complete',stopReason,calls,providerFailed:failed,wallMs:Math.round(performance.now()-started),maximumReservedUsd:calls*maximumGenerationUsd,accounting:{requests:final.requests,routineRequests:final.routineRequests,plan:final.plan,metrics:final.metrics},town:summary(JSON.parse(final.world)),offlineBaseline:summary(JSON.parse(other.world))};
    await append(report);await writeFile(join(directory,'report.json'),JSON.stringify(report,null,2));return report;
  }finally{await session?.close();await baseline?.close();await file.close();}
}
