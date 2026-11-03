import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, expect, vi } from 'vitest';
import { runSocietyProbe } from '../server/evaluation/society-probe.js';
import { phaseDSocietyLimits, phaseCResidents } from '../server/evaluation/society-plan.js';
import type { NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import type { Action, NpcDecisionRequest } from '../shared/neighbourhood/types.js';

it('continues a society evaluation through a world rejection and supplies a fresh distinct reasoning opportunity, without network or policy substitution',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  const dir=await mkdtemp(join(tmpdir(),'economic-recovery-'));let wall=Date.now();const requests:NpcDecisionRequest[]=[];
  const provider:NeighbourhoodProvider={mode:'live-meta',metrics:null,async converse(){throw new Error('unused');},async decide(r){
    requests.push(structuredClone(r));
    const action:Action=r.actorId==='amina' ? r.observation.decisionRecovery?{type:'order-external',businessId:'market',quantity:6}:!requests.slice(0,-1).some(p=>p.actorId==='amina')?{type:'buy',quantity:6}:{type:'wait',seconds:20} : {type:'wait',seconds:20};
    return {mode:'meta',model:'synthetic-independent-contract-test',decision:{goalId:r.observation.actor.goals[0]!.id,reason:'Synthetic offline contract response; not live Muse reasoning',action}};
  }};
  try {
    const report=await runSocietyProbe({directory:dir,provider,selectedResidents:[...phaseCResidents],plan:{id:'offline-recovery-contract',approved:true,phase:'7g-d-society',residents:[...phaseCResidents],notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+7200000).toISOString(),maxGenerations:36,maxEstimatedUsd:5,inputTokenLimit:8000,allowAutonomy:true},kind:'offline-contract-rehearsal',limits:phaseDSocietyLimits,paceMs:0,now:()=>wall+=61000});
    expect(network).not.toHaveBeenCalled();expect(report.calls).toBe(36);expect(report.stopReason).toBe('generation-limit');
    const rejected=report.decisions.find(d=>(d.validation as any).detail==='insufficient-stock')!;expect(rejected).toBeDefined();
    const fresh=requests.find(r=>r.actorId==='amina'&&r.observation.decisionRecovery);expect(fresh).toBeDefined();expect(fresh!.id).not.toBe(rejected.request.id);
    expect(report.town.trade!.orders.some(o=>o.actor==='amina')).toBe(true);expect(report.accounting.routineRequests ?? 0).toBe(0);
    expect(JSON.parse(await readFile(join(dir,'session.json'),'utf8')).paused).toBe(true);
  } finally {vi.restoreAllMocks();await rm(dir,{recursive:true,force:true});}
},90_000);

it('continues after the transport-purpose capability rejection with a distinct independent choice, not an automatic retry',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  const dir=await mkdtemp(join(tmpdir(),'encounter-recovery-'));let wall=Date.now(),attempted=false;
  const requests:NpcDecisionRequest[]=[];
  const provider:NeighbourhoodProvider={mode:'live-meta',metrics:null,async converse(){throw new Error('unused');},async decide(r){
    requests.push(structuredClone(r));let action:Action={type:'wait',seconds:60};
    if(['sadiq','grace'].includes(r.actorId)&&r.observation.actor.node!=='community-office-work')action={type:'travel',destination:'community-office-work'};
    if(r.actorId==='sadiq'&&!attempted&&r.observation.encounterOpportunities.includes('grace')){
      attempted=true;return {mode:'meta',model:'recorded-response-offline-replay',decision:{action:{message:"Hello, I'm Sadiq, repair apprentice. I'm short on food and work—any advice?",purpose:'request-help',recipient:'grace',type:'encounter'},goalId:'personal',reason:'Hunger 0.82 and income need 1 with 1 coin and no work available here, so I will seek help from nearby Grace before waiting or traveling.'}};
    }
    // An independently provided wait demonstrates that recovery does not force
    // the suggested ask alternative or successful cooperation.
    return {mode:'meta',model:'synthetic-independent-contract-test',decision:{goalId:r.observation.actor.goals[0]!.id,reason:'Synthetic offline choice; not live reasoning',action}};
  }};
  try{
    const report=await runSocietyProbe({directory:dir,provider,selectedResidents:[...phaseCResidents],plan:{id:'offline-encounter-recovery',approved:true,phase:'7g-d-society',residents:[...phaseCResidents],notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+7200000).toISOString(),maxGenerations:64,maxEstimatedUsd:5,inputTokenLimit:8000,allowAutonomy:true},kind:'offline-contract-rehearsal',limits:phaseDSocietyLimits,paceMs:0,now:()=>wall+=61000});
    expect(attempted).toBe(true);expect(report.stopReason).toBe('generation-limit');
    const rejected=report.decisions.find(d=>(d.validation as any)?.detail==='missing-assistance-capability')!;expect(rejected).toBeDefined();
    const fresh=requests.find(r=>r.actorId==='sadiq'&&r.observation.decisionRecovery?.reason==='missing-assistance-capability')!;
    expect(fresh).toBeDefined();expect(fresh.id).not.toBe(rejected.request.id);
    const next=report.decisions.find(d=>d.request.id===fresh.id)!;expect((next.decision as {action:Action}).action.type).toBe('wait');expect((next.validation as any).data.accepted).toBe(true);
    expect(report.ordinaryRejections).toHaveLength(1);expect(report.accounting.routineRequests??0).toBe(0);expect(network).not.toHaveBeenCalled();
  }finally{vi.restoreAllMocks();await rm(dir,{recursive:true,force:true});}
},90_000);
