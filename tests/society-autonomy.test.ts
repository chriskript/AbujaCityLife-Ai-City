import { mkdtemp, readFile, rm, writeFile, mkdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NeighbourhoodServerSession, validateLivePlan, type LivePlan } from '../server/session.js';
import { phaseDSocietyLimits, phaseCResidents, validatePhaseDApproval, inspectSocietyBudget } from '../server/evaluation/society-plan.js';
import { runSocietyProbe } from '../server/evaluation/society-probe.js';
import { SelectiveNeighbourhoodProvider, reasoningOpportunity } from '../server/inference/selective-provider.js';
import { MetaNeighbourhoodProvider, MockNeighbourhoodProvider, type NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { createTown } from '../shared/neighbourhood/town.js';
import { effectiveDailyProbeUsd, effectiveTotalProbeUsd, initializeProbeBudget, withProbeBudget } from '../server/controls/probe-budget.js';
import { generationReservation } from '../server/inference/model-limits.js';

const folders:string[]=[],sessions:NeighbourhoodServerSession[]=[];
afterEach(async()=>{vi.restoreAllMocks();for(const s of sessions.splice(0))await s.close();for(const p of folders.splice(0))await rm(p,{recursive:true,force:true});});
async function directory(){const p=await mkdtemp(join(tmpdir(),'unity-muse-society-'));folders.push(p);return p;}
const plan=(maximum=200):LivePlan=>({id:'synthetic-society-contract-only',approved:true,phase:'7g-d-society',residents:[...phaseCResidents],notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+7200000).toISOString(),maxGenerations:maximum,maxEstimatedUsd:5,inputTokenLimit:8000,allowAutonomy:true});
function fake():NeighbourhoodProvider{const offline=new MockNeighbourhoodProvider();return{mode:'live-meta',metrics:null,async decide(request){return{...await offline.decide(request),mode:'meta',model:'synthetic-society-only'};},async converse(){throw new Error('Not used');}};}

describe('Muse society readiness without hidden policy substitution',()=>{
  it('rehearses the entire 200-attempt profile offline with all residents eligible and reservations retained',async()=>{
    const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
    let wall=Date.now();const dir=await directory();
    const report=await runSocietyProbe({directory:dir,provider:fake(),selectedResidents:[...phaseCResidents],plan:plan(),kind:'offline-contract-rehearsal',limits:phaseDSocietyLimits,paceMs:0,now:()=>wall+=1000});
    expect(network).not.toHaveBeenCalled();expect(report.calls).toBe(200);expect(report.stopReason).toBe('generation-limit');
    expect(report.reasoningActors).toHaveLength(16);expect(report.town.time).toBeLessThanOrEqual(1800);expect(report.town.time).toBe(report.offlineBaseline.time);
    expect(report.maximumReservedUsd).toBeCloseTo(3.7408,8);expect(report.accounting.plan).toMatchObject({used:200,profile:'7g-d-society',inputTokenLimit:8000});
    expect(report.decisions.every(d=>(d.validation as any)?.data.accepted===true)).toBe(true);
    expect(report.interruptions).toEqual([]);expect(JSON.parse(await readFile(join(dir,'session.json'),'utf8')).paused).toBe(true);
    await expect(runSocietyProbe({directory:dir,provider:fake(),selectedResidents:[...phaseCResidents],plan:plan(),kind:'offline-contract-rehearsal',limits:phaseDSocietyLimits})).rejects.toMatchObject({code:'EEXIST'});
  },180_000);
  it('requires a new reviewed profile, verifies all 200 reservations and preserves old plan bounds',()=>{
    expect(()=>validatePhaseDApproval(plan())).not.toThrow();
    for(const overrides of [{maxGenerations:201},{maxEstimatedUsd:5.01},{maxEstimatedUsd:3.74},{inputTokenLimit:6000},{residents:['amina','musa']},{approved:false},{allowAutonomy:false}])expect(()=>validateLivePlan({...plan(),...overrides})).toThrow();
    expect(()=>validatePhaseDApproval({...plan(),phase:'7g-d-context',maxGenerations:48,maxEstimatedUsd:.90})).toThrow();
    expect(()=>validateLivePlan({...plan(),phase:'7g-c-unity'})).toThrow();
    const ledger={version:1,reservations:[{day:'2026-11-01',microUsd:333958}]},before=structuredClone(ledger);
    expect(inspectSocietyBudget(ledger,50,100,'2026-11-01',200,8000)).toMatchObject({requiredMicroUsd:3740800,perCallMicroUsd:18704,fullRunFits:true});expect(ledger).toEqual(before);
    expect(inspectSocietyBudget(ledger,.25,1,'2026-11-05',200,8000).fullRunFits).toBe(false);
    expect(()=>inspectSocietyBudget(ledger,51,100,'2026-11-01',200,8000)).toThrow();
    expect(()=>inspectSocietyBudget(ledger,50,101,'2026-11-01',200,8000)).toThrow();
  });
  it('restores conservative allowances at exactly Lagos midnight and never deletes historical reservations',async()=>{
    const until='2026-11-04';
    expect(effectiveDailyProbeUsd(50,until,new Date('2026-11-04T22:59:59Z'))).toBe(50);
    expect(effectiveTotalProbeUsd(100,until,new Date('2026-11-04T22:59:59Z'))).toBe(100);
    expect(effectiveDailyProbeUsd(50,until,new Date('2026-11-04T23:00:00Z'))).toBe(.25);
    expect(effectiveTotalProbeUsd(100,until,new Date('2026-11-04T23:00:00Z'))).toBe(1);
    const path=join(await directory(),'ledger.json');await initializeProbeBudget(path);
    await withProbeBudget(path,{dailyUsd:50,totalUsd:100,dailyUsdUntil:until,totalUsdUntil:until},async reserve=>reserve(2),new Date('2026-11-04T22:59:59Z'));
    const before=await readFile(path,'utf8');
    await expect(withProbeBudget(path,{dailyUsd:50,totalUsd:100,dailyUsdUntil:until,totalUsdUntil:until},async reserve=>reserve(.01),new Date('2026-11-04T23:00:00Z'))).rejects.toThrow('exhausted');
    expect(await readFile(path,'utf8')).toBe(before);
  });
  it('makes all sixteen residents eligible for personal, economic and social choices, including solitude and rest',async()=>{
    const w=createTown('full-reasoning');w.enableSocialVisits();const muse=fake(),offline=new MockNeighbourhoodProvider(),fallback=vi.spyOn(offline,'decide');
    const provider=new SelectiveNeighbourhoodProvider(phaseCResidents,muse,offline,true);
    for(const id of w.residentIds){const o=w.observe(id);expect(provider.sourceFor(o,w.decisionTriggers(id))).toBe('live-meta');expect(reasoningOpportunity(o,w.decisionTriggers(id))).not.toBeNull();}
    const relationships=structuredClone(w.snapshot.npcs.fatima!.relationships),request=w.requestInteractionDecision('fatima')!;
    muse.decide=vi.fn<NeighbourhoodProvider['decide']>(async()=>({mode:'meta',model:'synthetic-solitude',decision:{goalId:request.observation.actor.goals[0]!.id,reason:'I prefer to rest at home alone.',action:{type:'rest',seconds:60}}}));
    const response=await provider.decide(request);expect(w.applyDecision(request.id,response.decision,{mode:response.mode,model:response.model}).accepted).toBe(true);
    expect(fallback).not.toHaveBeenCalled();expect(w.snapshot.npcs.fatima!.activity).toMatchObject({kind:'wait',resting:60});
    expect(w.snapshot.socialVisits!.invitations).toEqual({});expect(w.snapshot.npcs.fatima!.relationships).toEqual(relationships);
  });
  it('persists a failed Muse decision, blocks retries and offline substitution across restart, while unrelated work completes',async()=>{
    const w=createTown('pending-muse');w.enableSocialVisits();
    const job=w.requestInteractionDecision('tunde')!;expect(w.applyDecision(job.id,{goalId:job.observation.actor.goals[0]!.id,reason:'Offline pre-existing work fixture',action:{type:'take-work',businessId:'repair-workshop'}},{mode:'mock',model:'offline-fixture'}).accepted).toBe(true);
    const start=w.snapshot.npcs.tunde!.inventory.coins!,muse=fake(),seen:string[]=[];
    muse.decide=vi.fn<NeighbourhoodProvider['decide']>(async request=>{seen.push(request.actorId);if(request.actorId==='musa')throw new Error('Meta HTTP 503');return{mode:'meta',model:'synthetic-independent-other-resident',decision:{goalId:request.observation.actor.goals[0]!.id,reason:'Take a moment alone.',action:{type:'wait',seconds:60}}};});
    const offline=new MockNeighbourhoodProvider(),fallback=vi.spyOn(offline,'decide');let wall=Date.now();const checkpoint=join(await directory(),'session.json');
    const provider=new SelectiveNeighbourhoodProvider(phaseCResidents,muse,offline,true);
    const s=await NeighbourhoodServerSession.open({checkpoint,provider,plan:plan(),initialWorld:w.serialize(),now:()=>wall+=61000});
    await s.decide();expect(s.interruptions.map(i=>i.actorId)).toEqual(['musa']);
    const interrupted=JSON.parse(await readFile(checkpoint,'utf8')).interruptedDecisions.musa;
    expect(interrupted.request.actorId).toBe('musa');expect(interrupted.request.observation.actor.id).toBe('musa');
    await s.tick(60);expect(s.frame.snapshot.actors.find(a=>a.id==='tunde')!.coins).toBe(start+2);await s.close();
    const restored=await NeighbourhoodServerSession.open({checkpoint,provider,plan:plan(),now:()=>wall+=61000});sessions.push(restored);
    for(let n=0;n<17;n++){await restored.decide();await restored.tick(1);}
    expect(seen.filter(id=>id==='musa')).toHaveLength(1);expect(fallback).not.toHaveBeenCalled();
    const saved=JSON.parse(await readFile(checkpoint,'utf8'));expect(saved.interruptedDecisions.musa).toEqual(interrupted);
    expect(saved.plan.profile).toBe('7g-d-society');expect(saved.plan.inputTokenLimit).toBe(8000);
    await expect(restored.command({id:'no-reset-pending',worldId:restored.frame.snapshot.worldId,type:'reset',experiment:'cooperate'})).rejects.toThrow('manual review');
    await restored.close();sessions.splice(sessions.indexOf(restored),1);
    await expect(NeighbourhoodServerSession.open({checkpoint,provider:new MockNeighbourhoodProvider()})).rejects.toThrow('cannot resume');
  });
  it('rejects a provider returning an offline result when Muse was expected, retaining the original opportunity',async()=>{
    const w=createTown('no-disguised-fallback');w.enableSocialVisits();const muse=fake();muse.decide=async request=>new MockNeighbourhoodProvider().decide(request);
    let wall=Date.now();const checkpoint=join(await directory(),'session.json');
    const session=await NeighbourhoodServerSession.open({checkpoint,provider:new SelectiveNeighbourhoodProvider(phaseCResidents,muse),plan:plan(),initialWorld:w.serialize(),now:()=>wall+=61000});sessions.push(session);
    await session.decide();expect(session.interruptions).toHaveLength(1);
    const state=JSON.parse(JSON.parse(await readFile(checkpoint,'utf8')).world);
    expect(state.events.some((e:any)=>e.type==='inference-interrupted')).toBe(true);
    expect(state.events.some((e:any)=>e.type==='action-proposed'&&e.actor==='musa')).toBe(false);
  });
  it.each([['Meta HTTP 503',60],['Probe budget exhausted',0],['Invalid usage',0]] as const)('stops inference on %s with only the permitted deterministic drain',async(error,seconds)=>{
    const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden')),muse=fake();muse.decide=vi.fn(async()=>{throw new Error(error);});
    let wall=Date.now();const dir=await directory();
    const report=await runSocietyProbe({directory:dir,provider:muse,selectedResidents:[...phaseCResidents],plan:plan(1),kind:'offline-contract-rehearsal',limits:phaseDSocietyLimits,paceMs:0,now:()=>wall+=61000});
    expect(muse.decide).toHaveBeenCalledOnce();expect(network).not.toHaveBeenCalled();expect(report.calls).toBe(1);expect(report.providerFailed).toBe(true);
    expect(report.interruptions).toHaveLength(1);expect(report.deterministicDrainSeconds).toBe(seconds);expect(report.modelSocialActions).toEqual([]);
    expect(report.accounting.plan.used).toBe(1);expect(report.maximumReservedUsd).toBe(generationReservation(8000));
    expect(JSON.parse(await readFile(join(dir,'session.json'),'utf8')).paused).toBe(true);
    await expect(runSocietyProbe({directory:dir,provider:muse,selectedResidents:[...phaseCResidents],plan:plan(1),kind:'offline-contract-rehearsal',limits:phaseDSocietyLimits})).rejects.toMatchObject({code:'EEXIST'});
  },30_000);
  it('recognises a corrupt ledger before reservation as accounting failure without network or deterministic drain',async()=>{
    const dir=await directory(),ledgerPath=join(dir,'bad-ledger.json');await writeFile(ledgerPath,'{');
    const fetcher=vi.fn<typeof fetch>(async()=>{throw new Error('Network forbidden');});
    const provider=new MetaNeighbourhoodProvider({apiKey:'fake-offline-only',ledgerPath,dailyUsd:50,totalUsd:100,inputTokenLimit:8000,fetcher});
    let wall=Date.now();const report=await runSocietyProbe({directory:dir,provider,selectedResidents:[...phaseCResidents],plan:plan(1),kind:'offline-contract-rehearsal',limits:phaseDSocietyLimits,paceMs:0,now:()=>wall+=61000});
    expect(fetcher).not.toHaveBeenCalled();expect(report.failureCategory).toBe('accounting');expect(report.deterministicDrainSeconds).toBe(0);expect(report.interruptions).toHaveLength(1);
    expect(await readFile(ledgerPath,'utf8')).toBe('{');
  });
  it('does not upgrade an old context session or launch the revised live CLI without its reviewed approval',async()=>{
    const dir=await directory();await mkdir(join(dir,'runtime'));
    await writeFile(join(dir,'runtime/approved-7g-phase-d-plan.json'),JSON.stringify({...plan(),phase:'7g-d-context',maxGenerations:48,maxEstimatedUsd:.90}));
    await writeFile(join(dir,'block-network.mjs'),"globalThis.fetch=()=>{throw new Error('UNEXPECTED_NETWORK');};\n");
    const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'block-network.mjs')).href,'--import',pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href,resolve('scripts/society-evaluation.ts'),'--live','--phase-d'],{cwd:dir,encoding:'utf8',windowsHide:true});
    expect(result.status).not.toBe(0);expect(result.stderr).toContain('separately approved');expect(result.stderr).not.toContain('UNEXPECTED_NETWORK');
    await expect(access(join(dir,`runtime/society-7g-${plan().id}.claim`))).rejects.toMatchObject({code:'ENOENT'});
  });
});
