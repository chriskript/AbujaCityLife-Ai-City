import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {it,expect,vi} from 'vitest';
import {createTown} from '../shared/neighbourhood/town.js';
import {MetaNeighbourhoodProvider,type NeighbourhoodProvider} from '../server/inference/neighbourhood-provider.js';
import {initializeProbeBudget} from '../server/controls/probe-budget.js';
import {reviewedInferenceDeadline,generationReservation} from '../server/inference/model-limits.js';
import {validateLivePlan,NeighbourhoodServerSession,type LivePlan} from '../server/session.js';
import {phaseCResidents,phaseDSocietyLimits} from '../server/evaluation/society-plan.js';
import {runSocietyProbe} from '../server/evaluation/society-probe.js';
const plan=(timeout:20000|30000):LivePlan=>({id:'offline-deadline-contract',approved:true,phase:'7g-d-society',residents:[...phaseCResidents],notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+7200000).toISOString(),maxGenerations:200,maxEstimatedUsd:5,inputTokenLimit:8000,inferenceTimeoutMs:timeout,allowAutonomy:true});

it('keeps legacy deadlines, explicitly bounds the opt-in increase and leaves reservations unchanged',()=>{
  expect(reviewedInferenceDeadline()).toBe(20000);expect(reviewedInferenceDeadline(30000)).toBe(30000);
  for(const n of [0,20001,30001,60000])expect(()=>reviewedInferenceDeadline(n)).toThrow();
  expect(()=>validateLivePlan(plan(30000))).not.toThrow();expect(()=>validateLivePlan({...plan(30000),inferenceTimeoutMs:30001})).toThrow();
  expect(()=>validateLivePlan({...plan(30000),phase:'7g-c-unity',maxGenerations:36,maxEstimatedUsd:.60,inputTokenLimit:6000})).toThrow();
  expect(generationReservation(8000)*200).toBeCloseTo(3.7408,9);
  expect(generationReservation(12000)).toBeCloseTo(0.023704,9);
  expect(()=>generationReservation(10000 as 8000)).toThrow('Unsupported reviewed input ceiling');
});
it('shares one deadline across count and generation, with no retry or refund on a synthetic generation timeout',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'deadline-contract-')),ledger=join(dir,'ledger.json');
  const timeoutSpy=vi.spyOn(AbortSignal,'timeout');
  try{
    await initializeProbeBudget(ledger);const signals:AbortSignal[]=[];
    const fetcher=vi.fn(async(url:unknown,init?:RequestInit)=>{signals.push(init!.signal as AbortSignal);if(String(url).endsWith('input_tokens'))return new Response(JSON.stringify({input_tokens:1000}));throw new DOMException('Synthetic offline timeout','TimeoutError');});
    const provider=new MetaNeighbourhoodProvider({apiKey:'fake-only',ledgerPath:ledger,dailyUsd:50,totalUsd:100,inputTokenLimit:8000,inferenceTimeoutMs:30000,fetcher:fetcher as typeof fetch});
    await expect(provider.decide(createTown('deadline').requestDecision('musa')!)).rejects.toThrow('Synthetic offline timeout');
    expect(timeoutSpy).toHaveBeenCalledWith(30000);expect(fetcher).toHaveBeenCalledTimes(2);expect(signals[0]).toBe(signals[1]);
    expect(JSON.parse(await readFile(ledger,'utf8')).reservations).toHaveLength(1);expect(provider.metrics).toBeNull();expect(provider.attempt!.preflightTokens).toBe(1000);
  }finally{vi.restoreAllMocks();await rm(dir,{recursive:true,force:true});}
});
it('reserves the larger wall-time margin and refuses mismatched provider deadlines before dispatch',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'deadline-wall-'));
  const decide=vi.fn(async()=>{throw new Error('Dispatch forbidden');});
  const provider:NeighbourhoodProvider={mode:'live-meta',inferenceTimeoutMs:30000,metrics:null,decide,async converse(){throw new Error('unused');}};
  try{
    let checks=0;const report=await runSocietyProbe({directory:dir,provider,selectedResidents:[...phaseCResidents],plan:plan(30000),kind:'offline-contract-rehearsal',limits:phaseDSocietyLimits,paceMs:0,wallNow:()=>checks++===0?0:5375000});
    expect(report.stopReason).toBe('wall-bound');expect(decide).not.toHaveBeenCalled();
    await expect(runSocietyProbe({directory:dir,provider:{...provider,inferenceTimeoutMs:20000},selectedResidents:[...phaseCResidents],plan:plan(30000),kind:'offline-contract-rehearsal',limits:phaseDSocietyLimits})).rejects.toThrow('deadline does not match');
  }finally{await rm(dir,{recursive:true,force:true});}
});
it('persists the approved deadline and refuses to change it on an existing isolated checkpoint',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'deadline-persistence-'));const w=createTown('deadline-world');w.enableSocialVisits();
  const provider:NeighbourhoodProvider={mode:'live-meta',inferenceTimeoutMs:30000,routineDecisions:true,sourceFor:()=> 'live-meta',metrics:null,async decide(){throw new Error('Dispatch forbidden');},async converse(){throw new Error('unused');}};
  try{
    const checkpoint=join(dir,'session.json');const s=await NeighbourhoodServerSession.open({checkpoint,provider,plan:plan(30000),initialWorld:w.serialize()});
    await s.command({id:'offline-end',worldId:s.frame.snapshot.worldId,type:'pause',paused:true});await s.close();
    const before=await readFile(checkpoint,'utf8');expect(JSON.parse(before).plan.inferenceTimeoutMs).toBe(30000);
    await expect(NeighbourhoodServerSession.open({checkpoint,provider,plan:plan(20000)})).rejects.toThrow('Different inference deadline');expect(await readFile(checkpoint,'utf8')).toBe(before);
  }finally{await rm(dir,{recursive:true,force:true});}
});
