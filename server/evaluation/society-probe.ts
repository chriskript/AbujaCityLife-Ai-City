import { open, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { NeighbourhoodServerSession, validateLivePlan, type LivePlan } from '../session.js';
import { MockNeighbourhoodProvider, maximumGenerationUsd, neighbourhoodModelConfiguration, neighbourhoodSystemInstructions, type NeighbourhoodProvider } from '../inference/neighbourhood-provider.js';
import { SelectiveNeighbourhoodProvider, reasoningOpportunity } from '../inference/selective-provider.js';
import { createTown } from '../../shared/neighbourhood/town.js';
import { isNpcDecision } from '../../shared/neighbourhood/decision-schema.js';
import type { NpcDecision, NpcDecisionRequest, WorldState } from '../../shared/neighbourhood/types.js';
import { assertSnapshot } from '../../shared/neighbourhood/snapshot.js';
import { firstSocietyLimits, phaseBSocietyLimits, phaseCSocietyLimits, phaseCResidents, type SocietyLimits } from './society-plan.js';
import { societyStateChanges, societyReportMarkdown, type SocietyDecisionEvidence } from './society-report.js';
import { employmentDecisionSchema } from '../inference/employment-grounding.js';

export const societyProbeLimits=firstSocietyLimits;
// This coordinator is deliberately one-shot. Its exclusive evidence file must exist BEFORE
// dispatch; recovery reads artifacts, never resumes calls. All authority stays in the session.
export async function runSocietyProbe(options:{directory:string;provider:NeighbourhoodProvider;selectedResidents:string[];
  plan:LivePlan;kind:'live-meta'|'offline-contract-rehearsal';paceMs?:number;now?:()=>number;limits?:SocietyLimits;wallNow?:()=>number}) {
  const {directory,provider,plan}=options;
  const limits=options.limits ?? societyProbeLimits, wallNow=options.wallNow ?? (()=>performance.now());
  validateLivePlan(plan);
  const expanded=limits.maximumGenerations===36;
  if(provider.mode!=='live-meta' || ![firstSocietyLimits,phaseBSocietyLimits,phaseCSocietyLimits].some(profile=>JSON.stringify(profile)===JSON.stringify(limits)) || plan.maxGenerations>limits.maximumGenerations || plan.maxEstimatedUsd>limits.maximumIncrementalUsd || !plan.allowAutonomy || expanded && (plan.phase!=='7g-c-unity' || JSON.stringify(options.selectedResidents)!==JSON.stringify(phaseCResidents)))throw new Error('Probe exceeds the reviewed evaluation limits');
  const initial=createTown('society-7g-initial');
  if(!options.selectedResidents.length || new Set(options.selectedResidents).size!==options.selectedResidents.length || options.selectedResidents.some(id=>!initial.hasResident(id)))throw new Error('Invalid selected residents');
  // Evidence must never attach to an existing checkpoint or silently recover one.
  for (const name of ['session.json','offline-session.json','initial-world.json','report.json']) {
    try {await access(join(directory,name));throw Object.assign(new Error('Existing evaluation artifacts cannot be resumed'),{code:'EEXIST'});}
    catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  }
  const file=await open(join(directory,'evidence.ndjson'),'wx',0o600);
  const append=async(value:unknown)=>{await file.writeFile(JSON.stringify(value)+'\n');await file.sync();};
  const checkpoint=join(directory,'session.json'),offline=new MockNeighbourhoodProvider();
  const started=wallNow();let calls=0,failed=false;
  let session:NeighbourhoodServerSession|undefined,baseline:NeighbourhoodServerSession|undefined;
  let returned:object|null=null,lastRequestId='',lastActor='',lastDecision:NpcDecision|null=null;
  let pendingEvidence:{request:NpcDecisionRequest;before:WorldState;comparison:unknown}|null=null;
  const decisions:SocietyDecisionEvidence[]=[];
  const reasoningActors=new Set<string>(),proposedTasks=new Set<string>(),acceptedTasks=new Set<string>();
  let stopReason='simulation-bound';
  const recording:NeighbourhoodProvider={mode:'live-meta',metrics:null,
    async decide(request:NpcDecisionRequest){
      if(calls>=plan.maxGenerations)throw new Error('Probe call ceiling reached');calls++;
      lastRequestId=request.id;
      lastActor=request.actorId;lastDecision=null;
      const comparison=await offline.decide(structuredClone(request));
      const checkpointBefore=JSON.parse(await readFile(checkpoint,'utf8'));
      pendingEvidence={request:structuredClone(request),before:JSON.parse(checkpointBefore.world),comparison};
      await append({stage:'model-started',kind:options.kind,number:calls,opportunity:reasoningOpportunity(request.observation,request.triggers),request,decisionSchema:employmentDecisionSchema(request.observation),offlineCounterfactual:comparison,checkpointBefore});
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
    await append({stage:'started',kind:options.kind,modelConfiguration:neighbourhoodModelConfiguration,systemInstructions:neighbourhoodSystemInstructions,prioritiseResponses:expanded,limits,selectedResidents:options.selectedResidents,plan,initialWorld:initial.snapshot});
    await writeFile(join(directory,'initial-world.json'),initial.serialize());
    const selective=new SelectiveNeighbourhoodProvider(options.selectedResidents,recording,offline,expanded);
    session=await NeighbourhoodServerSession.open({checkpoint,provider:selective,plan,initialWorld:initial.serialize(),...(options.now?{now:options.now}:{})});
    baseline=await NeighbourhoodServerSession.open({checkpoint:join(directory,'offline-session.json'),provider:offline,initialWorld:initial.serialize()});
    await baseline.command({id:'normal-speed',worldId:baseline.frame.snapshot.worldId,type:'speed',speed:1});
    for(let pulse=0;pulse<limits.maximumSimulationSeconds*4 && session.frame.snapshot.time<limits.maximumSimulationSeconds;pulse++){
      if(failed)break;
      if(wallNow()-started>=limits.maximumWallMs-neighbourhoodModelConfiguration.timeoutMs){stopReason='wall-bound';break;}
      if(calls>=plan.maxGenerations){stopReason='generation-limit';break;}
      if((calls+1)*maximumGenerationUsd>plan.maxEstimatedUsd){stopReason='reservation-limit';break;}
      await session.tick(.25);await session.decide();
      await baseline.tick(.25);await baseline.decide();
      const persisted=JSON.parse(await readFile(checkpoint,'utf8'));
      const authoritative:WorldState=JSON.parse(persisted.world);assertSnapshot(authoritative);
      if(persisted.requests!==calls || persisted.plan.used!==calls || !Number.isFinite(persisted.plan.reservedUsd) || Math.abs(persisted.plan.reservedUsd-calls*maximumGenerationUsd)>1e-9)throw new Error('Evaluation accounting mismatch; stopped');
      if(returned){
        const saved=persisted;
        await append({stage:'world-committed',number:calls,frame:session.frame,world:JSON.parse(saved.world),accounting:{requests:saved.requests,routineRequests:saved.routineRequests,plan:saved.plan}});
        const rejection=session.frame.events.find(e=>e.type==='action-validated' && e.subject===lastRequestId && e.data.accepted===false);
        const validation=session.frame.events.find(e=>e.type==='action-validated' && e.subject===lastRequestId);
        if(!failed && !validation)throw new Error('Missing authoritative validation; stopped');
        if(pendingEvidence){
          const evidence=pendingEvidence as {request:NpcDecisionRequest;before:WorldState;comparison:unknown};
          const context=evidence.request.observation.socialContext;
          decisions.push({number:calls,actorId:lastActor,opportunity:reasoningOpportunity(evidence.request.observation,evidence.request.triggers),request:evidence.request,
            decision:lastDecision,offlineCounterfactual:evidence.comparison,metrics:provider.metrics,invocationEvidence:returned,validation:validation ?? null,changes:societyStateChanges(evidence.before,authoritative),
            contextAssessment:{publicExplanation:(lastDecision as NpcDecision|null)?.reason ?? null,suppliedHistoryIds:[...(context?.publicFacts.map(f=>f.id) ?? []),...(context?.background?[context.background.id]:[])],operatorInterpretation:null,influence:'requires-human-review',causalImprovement:'not-established'}});
          pendingEvidence=null;
        }
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
      if(limits.maximumGenerations===6 && reasoningActors.size>=2 && session.frame.snapshot.tasks.some(t=>t.status==='delivered'&&proposedTasks.has(t.id)&&acceptedTasks.has(t.id))){stopReason='completed-model-proposed-and-accepted-delivery';break;}
      if(session.paused){stopReason='session-paused';break;}
      if(options.paceMs!==0)await setTimeout(options.paceMs ?? 250);
    }
    await session.command({id:'evaluation-end',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});
    await baseline.command({id:'evaluation-end',worldId:baseline.frame.snapshot.worldId,type:'pause',paused:true});
    const final=JSON.parse(await readFile(checkpoint,'utf8')),other=JSON.parse(await readFile(join(directory,'offline-session.json'),'utf8'));
    const summary=(state:WorldState)=>({time:state.time,resources:state.resources,produced:state.town!.produced,consumed:state.town!.consumed,
      tasks:Object.values(state.tasks),residents:Object.values(state.npcs).map(n=>({id:n.id,node:n.node,activity:n.activity,inventory:n.inventory,relationships:n.relationships,memories:n.memories,knowledge:n.knowledge})),communication:state.communication});
    if(failed)stopReason='provider-failed';
    const finalState:WorldState=JSON.parse(final.world), baselineState:WorldState=JSON.parse(other.world);assertSnapshot(finalState);assertSnapshot(baselineState);
    const report={kind:options.kind,stage:'complete',stopReason,calls,providerFailed:failed,wallMs:Math.round(wallNow()-started),maximumReservedUsd:calls*maximumGenerationUsd,
      selectedResidents:options.selectedResidents,reasoningActors:[...reasoningActors],decisions,
      actualUsage:{knownEstimatedUsd:decisions.reduce((sum,d)=>sum+(d.metrics?.estimatedCostUsd ?? 0),0),unknownInvocations:decisions.filter(d=>!d.metrics).length},
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
