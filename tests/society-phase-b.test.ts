import { mkdtemp, readFile, rm, writeFile, mkdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectSocietyBudget, phaseBSocietyLimits, phaseBResidents, validatePhaseBApproval } from '../server/evaluation/society-plan.js';
import { runSocietyProbe } from '../server/evaluation/society-probe.js';
import { MockNeighbourhoodProvider, maximumGenerationUsd, type NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { reasoningOpportunity } from '../server/inference/selective-provider.js';
import { NeighbourhoodServerSession, type LivePlan } from '../server/session.js';
import { createTown } from '../shared/neighbourhood/town.js';
import { assertSnapshot } from '../shared/neighbourhood/snapshot.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';

const folders:string[]=[];
afterEach(async()=>{vi.restoreAllMocks();for(const path of folders.splice(0))await rm(path,{recursive:true,force:true});});
async function directory(){const path=await mkdtemp(join(tmpdir(),'unity-phase-b-'));folders.push(path);return path;}
const plan=():LivePlan=>({id:'synthetic-phase-b-only',approved:true,expiresAt:new Date(Date.now()+3600000).toISOString(),maxGenerations:12,maxEstimatedUsd:.25,allowAutonomy:true});
function synthetic():NeighbourhoodProvider{
  const offline=new MockNeighbourhoodProvider();
  return {mode:'live-meta',metrics:null,decide:vi.fn(async request=>({...await offline.decide(request),mode:'meta' as const,model:'synthetic-phase-b-contract'})),converse:vi.fn()};
}
async function run(directory:string,provider=synthetic(),extra:Partial<Parameters<typeof runSocietyProbe>[0]>={}){
  let wall=Date.now();
  return runSocietyProbe({directory,provider,selectedResidents:[...phaseBResidents],plan:plan(),kind:'offline-contract-rehearsal',limits:phaseBSocietyLimits,paceMs:0,now:()=>wall+=1000,...extra});
}

describe('twelve-generation Unity Gardens readiness (no live transport)',()=>{
  it('refuses the live CLI without approval before credential access, claims or network calls',async()=>{
    const dir=await directory();await mkdir(join(dir,'runtime'));
    await writeFile(join(dir,'runtime/approved-7g-phase-b-plan.json'),JSON.stringify({...plan(),approved:false,phase:'7g-b-unity',residents:phaseBResidents}));
    await writeFile(join(dir,'block-network.mjs'),"globalThis.fetch=()=>{throw new Error('UNEXPECTED_NETWORK');};\n");
    const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'block-network.mjs')).href,'--import',pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href,resolve('scripts/society-evaluation.ts'),'--live','--phase-b'],{cwd:dir,encoding:'utf8',windowsHide:true});
    expect(result.status).not.toBe(0);expect(result.stderr).toContain('separately approved live evaluation plan');
    expect(result.stderr).not.toContain('UNEXPECTED_NETWORK');
    await expect(access(join(dir,`runtime/society-7g-${plan().id}.claim`))).rejects.toMatchObject({code:'ENOENT'});
  });
  it('requires the explicit reviewed phase, roster, bounds, approval and start date',()=>{
    const approved={...plan(),phase:'7g-b-unity',residents:[...phaseBResidents],notBefore:'2026-10-01T00:00:00+01:00'};
    expect(()=>validatePhaseBApproval(approved)).not.toThrow();
    for(const change of [{approved:false},{phase:'7g-b'},{residents:['amina','musa']},{maxGenerations:13},{maxEstimatedUsd:.26},{notBefore:'2099-01-01T00:00:00Z'},{expiresAt:'2000-01-01T00:00:00Z'}])expect(()=>validatePhaseBApproval({...approved,...change})).toThrow();
  });
  it('preserves stricter daily limits and checks full-run headroom without modifying the ledger',()=>{
    const ledger={version:1,reservations:[{day:'2026-10-31',microUsd:97224},{day:'2026-10-30',microUsd:42286}]},before=structuredClone(ledger);
    expect(inspectSocietyBudget(ledger,.25,1,'2026-10-31')).toMatchObject({perCallMicroUsd:16204,requiredMicroUsd:194448,affordableGenerations:9,fullRunFits:false});
    expect(inspectSocietyBudget(ledger,20,1,'2026-10-31')).toMatchObject({requiredMicroUsd:194448,affordableGenerations:12,fullRunFits:true});
    expect(()=>inspectSocietyBudget(ledger,50.01,1,'2026-10-31')).toThrow();
    expect(inspectSocietyBudget(ledger,.25,1,'2026-11-01')).toMatchObject({affordableGenerations:12,fullRunFits:true});
    expect(inspectSocietyBudget(ledger,.25,.2,'2026-11-01').fullRunFits).toBe(false);
    expect(ledger).toEqual(before);
    expect(()=>inspectSocietyBudget({version:1,reservations:[{day:'bad',microUsd:-1}]},.25,1,'2026-10-31')).toThrow();
  });
  it('keeps personal care routine while retaining incoming invitations as independent choices',()=>{
    const observation=createTown('routine-routing').observe('halima');
    observation.actor.needs.rest=.9;
    expect(reasoningOpportunity(observation,['activation'])).toBeNull();
    observation.actor.needs.rest=.1;observation.actor.needs.food=.8;observation.actor.inventory.food=1;
    expect(reasoningOpportunity(observation,['activation'])).toBeNull();
    observation.encounters=[{id:'encounter-test',initiator:'chris',recipient:'halima',purpose:'introduce',message:'May we talk?',response:null,status:'pending',createdAt:0,expiresAt:90}];
    expect(reasoningOpportunity(observation,['activation'])).toBe('encounter-response');
  });
  it('rejects the exact live Chris supply-work mistake without granting skill, work or payment',()=>{
    const world=createTown('live-employment-regression'),before=world.snapshot;
    const request=world.requestInteractionDecision('chris')!;
    expect(request.observation.actor.skills).not.toContain('supply');
    expect(request.observation.town!.work.find(work=>work.id==='supply-desk')).toMatchObject({matchesSkill:false,canTakeNow:false,ineligibleReason:'missing-skill'});
    expect(request.observation.town!.eligibleWorkIds).not.toContain('supply-desk');
    const outcome=world.applyDecision(request.id,{action:{businessId:'supply-desk',type:'take-work'},goalId:'earn',reason:'At centre desk with funded opening, taking supply work for income.'},{mode:'mock',model:'recorded-live-proposal-regression'});
    expect(outcome).toMatchObject({accepted:false,reason:'missing-skill'});
    expect(world.snapshot.npcs.chris!.skills).toEqual(before.npcs.chris!.skills);
    expect(world.snapshot.npcs.chris!.activity).toEqual(before.npcs.chris!.activity);
    expect(world.snapshot.npcs.chris!.inventory).toEqual(before.npcs.chris!.inventory);
    expect(world.snapshot.town).toEqual(before.town);
    expect(world.snapshot.resources).toEqual(before.resources);
    expect(world.snapshot.tasks).toEqual(before.tasks);
  });
  it('records twelve bounded synthetic choices across four residents with scoped context and a matched baseline',async()=>{
    const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden in offline rehearsal'));
    const dir=await directory(),provider=synthetic(),result=await run(dir,provider);
    expect(network).not.toHaveBeenCalled();expect(provider.decide).toHaveBeenCalledTimes(12);
    expect(result.stopReason).toBe('generation-limit');expect(result.maximumReservedUsd).toBe(.194448);
    expect(new Set(result.reasoningActors)).toEqual(new Set(phaseBResidents));
    expect(result.town.time).toBe(result.offlineBaseline.time);
    expect(result.independentlyCommittedDeliveries).toContain('task-1');
    expect(result.actualUsage.unknownInvocations).toBe(12);
    expect(result.decisions.every(d=>d.contextAssessment.influence==='requires-human-review' && d.contextAssessment.causalImprovement==='not-established')).toBe(true);
    for(const d of result.decisions){
      expect(d.contextAssessment.suppliedHistoryIds).toContain(`history:unity-v1:self:${d.actorId}`);
      expect(d.request.observation.socialContext!.background!.id).toBe(`history:unity-v1:self:${d.actorId}`);
      expect(d.request.observation.socialContext!.publicFacts.length).toBeLessThanOrEqual(3);
      expect(d.validation).toMatchObject({type:'action-validated',data:{accepted:true}});
    }
    const checkpoint=JSON.parse(await readFile(join(dir,'session.json'),'utf8'));
    expect(checkpoint.paused).toBe(true);expect(checkpoint.plan.used).toBe(12);
    assertSnapshot(JSON.parse(checkpoint.world));
    expect(await readFile(join(dir,'report.md'),'utf8')).toContain('Exact structured decision');
    await expect(run(dir,provider)).rejects.toMatchObject({code:'EEXIST'});
    expect(provider.decide).toHaveBeenCalledTimes(12);
  },60_000);
  it('stops on the first rejected consequential proposal, without retry or offline substitution',async()=>{
    const provider=synthetic();vi.mocked(provider.decide).mockImplementation(async request=>({mode:'meta',model:'synthetic-invalid-action',decision:{goalId:request.observation.actor.goals[0]!.id,reason:'Synthetic rejection test',action:{type:'travel',destination:'invented'}}}));
    const result=await run(await directory(),provider);
    expect(provider.decide).toHaveBeenCalledTimes(1);expect(result.stopReason).toBe('rejected-proposal');
    expect(result.decisions[0]!.validation).toMatchObject({data:{accepted:false}});
    expect(result.independentlyCommittedDeliveries).toEqual([]);
  });
  it('stops before another invocation when the approved reservation allowance is exhausted',async()=>{
    const provider=synthetic(),result=await run(await directory(),provider,{plan:{...plan(),maxEstimatedUsd:maximumGenerationUsd}});
    expect(provider.decide).toHaveBeenCalledTimes(1);expect(result.stopReason).toBe('reservation-limit');
    expect(result.accounting.plan.reservedUsd).toBe(maximumGenerationUsd);
  });
  it('does not begin an invocation without time for the existing provider deadline',async()=>{
    const provider=synthetic();let checks=0;
    const result=await run(await directory(),provider,{wallNow:()=>checks++===0?0:280001});
    expect(provider.decide).not.toHaveBeenCalled();expect(result.calls).toBe(0);expect(result.stopReason).toBe('wall-bound');
  });
  it('fails closed and pauses after persisted accounting corruption',async()=>{
    const dir=await directory(),provider=synthetic();
    const original=NeighbourhoodServerSession.prototype.decide;
    vi.spyOn(NeighbourhoodServerSession.prototype,'decide').mockImplementation(async function(this:NeighbourhoodServerSession,...args){
      await original.apply(this,args);
      if(this.mode==='live-meta'){
        const path=join(dir,'session.json'),saved=JSON.parse(await readFile(path,'utf8'));
        saved.requests=99;await writeFile(path,JSON.stringify(saved));
      }
    });
    await expect(run(dir,provider)).rejects.toThrow('accounting mismatch');
    expect(provider.decide).not.toHaveBeenCalled();
    const checkpoint=JSON.parse(await readFile(join(dir,'session.json'),'utf8'));
    expect(checkpoint.paused).toBe(true);
    expect(await readFile(join(dir,'evidence.ndjson'),'utf8')).toContain('coordinator-failed');
    await expect(run(dir,provider)).rejects.toMatchObject({code:'EEXIST'});
  });
  it('always persists valid travel through co-located street/entrance connectors',()=>{
    const world=createTown('zero-length-connector');
    const request=world.requestInteractionDecision('ladi')!;
    expect(world.applyDecision(request.id,{goalId:request.observation.actor.goals[0]!.id,reason:'Reach the known posted errands site',action:{type:'travel',destination:'community-office-work'}},{mode:'mock',model:'offline-regression'}).accepted).toBe(true);
    for(let step=0;step<160;step++){world.advance(.25);expect(()=>assertSnapshot(world.snapshot)).not.toThrow();}
    const restored=Neighbourhood.restore(world.serialize());
    expect(restored.snapshot.npcs.ladi!.node).toBe('community-office-work');
    expect(restored.snapshot.npcs.ladi!.activity.kind).toBe('idle');
  });
});
