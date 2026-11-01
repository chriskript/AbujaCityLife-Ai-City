import { mkdtemp, readFile, rm, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { phaseCSocietyLimits, phaseCResidents, validatePhaseCApproval, inspectSocietyBudget } from '../server/evaluation/society-plan.js';
import { NeighbourhoodServerSession, validateLivePlan, type LivePlan } from '../server/session.js';
import { runSocietyProbe } from '../server/evaluation/society-probe.js';
import { SelectiveNeighbourhoodProvider } from '../server/inference/selective-provider.js';
import { MockNeighbourhoodProvider, type NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { createTown } from '../shared/neighbourhood/town.js';

const folders:string[]=[],sessions:NeighbourhoodServerSession[]=[];
afterEach(async()=>{vi.restoreAllMocks();for(const s of sessions.splice(0))await s.close();for(const p of folders.splice(0))await rm(p,{recursive:true,force:true});});
async function directory(){const p=await mkdtemp(join(tmpdir(),'unity-phase-c-'));folders.push(p);return p;}
const plan=():LivePlan=>({id:'synthetic-phase-c-contract-only',approved:true,phase:'7g-c-unity',residents:[...phaseCResidents],notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),maxGenerations:36,maxEstimatedUsd:.60,allowAutonomy:true});
function synthetic():NeighbourhoodProvider{const offline=new MockNeighbourhoodProvider();return{mode:'live-meta',metrics:null,async decide(request){return{...await offline.decide(request),mode:'meta',model:'synthetic-phase-c-only'};},async converse(){throw new Error('Not used');}};}

describe('36-generation offline readiness and independent social priority',()=>{
  it('requires the new separately approved exact profile and never enlarges old plans',()=>{
    expect(()=>validatePhaseCApproval(plan())).not.toThrow();
    for(const overrides of [{approved:false},{phase:'7g-b-unity'},{phase:undefined},{maxGenerations:37},{maxEstimatedUsd:.61},{residents:['amina','musa']},{allowAutonomy:false},{notBefore:'2099-01-01T00:00:00Z'}])expect(()=>validateLivePlan({...plan(),...overrides})).toThrow();
    expect(()=>validatePhaseCApproval({...plan(),phase:'7g-b-unity',maxGenerations:12,maxEstimatedUsd:.25})).toThrow();
    const budget=inspectSocietyBudget({version:1,reservations:[{day:'2026-10-31',microUsd:171918}]},20,1,'2026-10-31',36);
    expect(budget).toMatchObject({requiredMicroUsd:583344,totalRemainingMicroUsd:828082,fullRunFits:true});
  });
  it('prioritises an actually delivered recipient invitation without forcing acceptance or revealing its inbox',async()=>{
    const world=createTown('recipient-priority'),request=world.requestInteractionDecision('halima')!;
    expect(world.applyDecision(request.id,{goalId:request.observation.actor.goals[0]!.id,reason:'Actual offline invitation',action:{type:'communicate',recipient:'fatima',channel:'text',purpose:'chat',message:'Do you have time to talk?',memoryId:null}},{mode:'mock',model:'offline-priority-fixture'}).accepted).toBe(true);
    const muse=synthetic(),seen:string[]=[];
    muse.decide=async r=>{seen.push(r.actorId);expect(r.observation.communication!.threads[0]!.recipient).toBe('fatima');return{mode:'meta',model:'synthetic-independent-refusal',decision:{goalId:r.observation.actor.goals[0]!.id,reason:'I prefer to rest before talking.',action:{type:'respond-communication',communicationId:r.observation.communication!.threads[0]!.id,response:'defer',message:'I need rest now.',memoryId:null}}};};
    const provider=new SelectiveNeighbourhoodProvider(phaseCResidents,muse,new MockNeighbourhoodProvider(),true);
    expect(provider.priorityFor!(world.observe('fatima'),world.decisionTriggers('fatima'))).toBe(0);
    world.advance(5);
    expect(provider.priorityFor!(world.observe('fatima'),world.decisionTriggers('fatima'))).toBe(2);
    expect(world.observe('chris').communication!.threads).toEqual([]);
    const checkpoint=join(await directory(),'session.json'),session=await NeighbourhoodServerSession.open({checkpoint,provider,plan:plan(),initialWorld:world.serialize()});sessions.push(session);
    await session.decide();
    expect(seen).toEqual(['fatima']);
    const saved=JSON.parse(await readFile(checkpoint,'utf8')),state=JSON.parse(saved.world);
    expect(state.communication.threads['communication-1'].response).toBe('defer');
    expect(state.tasks).toEqual({});expect(saved.plan.used).toBe(1);
  });
  it('rehearses the full ceiling with all sixteen eligible, preserved scoping, priority and no network',async()=>{
    const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
    let wall=Date.now();const dir=await directory();
    const report=await runSocietyProbe({directory:dir,provider:synthetic(),selectedResidents:[...phaseCResidents],plan:plan(),kind:'offline-contract-rehearsal',limits:phaseCSocietyLimits,paceMs:0,now:()=>wall+=1000});
    expect(fetch).not.toHaveBeenCalled();expect(report.selectedResidents).toHaveLength(16);
    expect(report.calls).toBe(36);expect(report.stopReason).toBe('generation-limit');
    expect(report.maximumReservedUsd).toBe(.583344);expect(report.accounting.plan.used).toBe(36);
    expect(report.town.time).toBeLessThanOrEqual(600);expect(report.offlineBaseline.time).toBe(report.town.time);
    expect(report.decisions.some(d=>['incoming-communication','encounter-response','commitment-choice'].includes(d.opportunity!))).toBe(true);
    for(const decision of report.decisions){
      expect(decision.request.observation.socialContext!.background!.id).toBe(`history:unity-v1:self:${decision.actorId}`);
      expect(JSON.stringify(decision.request).length).toBeLessThan(24_000);
      expect(decision.contextAssessment.causalImprovement).toBe('not-established');
    }
    const saved=JSON.parse(await readFile(join(dir,'session.json'),'utf8'));expect(saved.paused).toBe(true);
    await expect(runSocietyProbe({directory:dir,provider:synthetic(),selectedResidents:[...phaseCResidents],plan:plan(),kind:'offline-contract-rehearsal',limits:phaseCSocietyLimits,paceMs:0})).rejects.toMatchObject({code:'EEXIST'});
  },90_000);
  it('stops at the 20-minute margin without beginning a model invocation',async()=>{
    let checks=0,wall=Date.now();const provider=synthetic();const decide=vi.spyOn(provider,'decide');
    const report=await runSocietyProbe({directory:await directory(),provider,selectedResidents:[...phaseCResidents],plan:plan(),kind:'offline-contract-rehearsal',limits:phaseCSocietyLimits,paceMs:0,now:()=>wall+=1000,wallNow:()=>checks++===0?0:1180001});
    expect(report.stopReason).toBe('wall-bound');expect(decide).not.toHaveBeenCalled();
  });
  it('refuses the new live CLI with an unapproved plan before any claim, credential read or API call',async()=>{
    const dir=await directory();await mkdir(join(dir,'runtime'));
    await writeFile(join(dir,'runtime/approved-7g-phase-c-plan.json'),JSON.stringify({...plan(),approved:false}));
    await writeFile(join(dir,'block-network.mjs'),"globalThis.fetch=()=>{throw new Error('UNEXPECTED_NETWORK');};\n");
    const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'block-network.mjs')).href,'--import',pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href,resolve('scripts/society-evaluation.ts'),'--live','--phase-c'],{cwd:dir,encoding:'utf8',windowsHide:true});
    expect(result.status).not.toBe(0);expect(result.stderr).toContain('separately approved');expect(result.stderr).not.toContain('UNEXPECTED_NETWORK');
    await expect(access(join(dir,`runtime/society-7g-${plan().id}.claim`))).rejects.toMatchObject({code:'ENOENT'});
  });
});
