import { mkdtemp, readFile, rm, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { contextSocietyLimits, phaseCResidents, validateContextApproval, inspectSocietyBudget } from '../server/evaluation/society-plan.js';
import { validateLivePlan, type LivePlan } from '../server/session.js';
import { runSocietyProbe } from '../server/evaluation/society-probe.js';
import { MockNeighbourhoodProvider, type NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';

const folders:string[]=[];
afterEach(async()=>{vi.restoreAllMocks();for(const p of folders.splice(0))await rm(p,{recursive:true,force:true});});
async function directory(){const p=await mkdtemp(join(tmpdir(),'unity-context-evaluation-'));folders.push(p);return p;}
const plan=():LivePlan=>({id:'synthetic-context-contract-only',approved:true,phase:'7g-d-context',residents:[...phaseCResidents],notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),maxGenerations:48,maxEstimatedUsd:.90,inputTokenLimit:8000,allowAutonomy:true});
function synthetic():NeighbourhoodProvider{const offline=new MockNeighbourhoodProvider();return{mode:'live-meta',metrics:null,async decide(request){return{...await offline.decide(request),mode:'meta',model:'synthetic-context-only'};},async converse(){throw new Error('Not used');}};}

describe('separately approved longer context-managed evaluation',()=>{
  it('requires explicit new limits without enlarging previously approved plans or reservations',()=>{
    expect(()=>validateContextApproval(plan())).not.toThrow();
    for(const overrides of [{approved:false},{maxGenerations:49},{maxEstimatedUsd:.91},{inputTokenLimit:6000},{residents:['amina','musa']},{allowAutonomy:false}])expect(()=>validateLivePlan({...plan(),...overrides})).toThrow();
    expect(()=>validateLivePlan({...plan(),phase:'7g-c-unity',maxGenerations:36,maxEstimatedUsd:.60})).toThrow();
    expect(()=>validateContextApproval({...plan(),phase:'7g-c-unity',maxGenerations:36,maxEstimatedUsd:.60,inputTokenLimit:6000})).toThrow();
    const ledger={version:1,reservations:[{day:'2026-11-01',microUsd:333958}]},prior=structuredClone(ledger);
    expect(inspectSocietyBudget(ledger,20,5,'2026-11-01',48,8000)).toMatchObject({perCallMicroUsd:18704,requiredMicroUsd:897792,fullRunFits:true});
    expect(inspectSocietyBudget(ledger,20,1,'2026-11-01',48,8000).fullRunFits).toBe(false);
    expect(ledger).toEqual(prior);
  });
  it('rehearses 48 isolated decisions with selected-context counterfactuals, precise reservations and no network or resumption',async()=>{
    const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
    let wall=Date.now();const dir=await directory();
    const report=await runSocietyProbe({directory:dir,provider:synthetic(),selectedResidents:[...phaseCResidents],plan:plan(),kind:'offline-contract-rehearsal',limits:contextSocietyLimits,paceMs:0,now:()=>wall+=1000});
    expect(fetch).not.toHaveBeenCalled();expect(report.selectedResidents).toHaveLength(16);
    expect(report.calls).toBe(48);expect(report.stopReason).toBe('generation-limit');
    expect(report.maximumReservedUsd).toBeCloseTo(.897792,9);expect(report.accounting.plan.used).toBe(48);
    expect(report.town.time).toBeLessThanOrEqual(1200);expect(report.offlineBaseline.time).toBe(report.town.time);
    for(const decision of report.decisions)expect(decision.validation).toMatchObject({data:{accepted:true}});
    const events=(await readFile(join(dir,'evidence.ndjson'),'utf8')).trim().split('\n').map(line=>JSON.parse(line));
    const starts=events.filter(e=>e.stage==='model-started');expect(starts).toHaveLength(48);
    for(const start of starts){
      expect(start.offlineComparisonScope).toBe('same-selected-information-before-wire-deduplication');
      expect(start.modelInput.observation.actor.id).toBe(start.request.actorId);
      expect(start.modelInput.observation.socialContext.background.id).toBe(`history:unity-v1:self:${start.request.actorId}`);
      expect(JSON.stringify(start.modelInput).length).toBeLessThanOrEqual(24000);
      expect(start.contextSelection.version).toBe(1);
    }
    const saved=JSON.parse(await readFile(join(dir,'session.json'),'utf8'));expect(saved.paused).toBe(true);
    await expect(runSocietyProbe({directory:dir,provider:synthetic(),selectedResidents:[...phaseCResidents],plan:plan(),kind:'offline-contract-rehearsal',limits:contextSocietyLimits,paceMs:0})).rejects.toMatchObject({code:'EEXIST'});
  },90_000);
  it('reserves the timeout margin and refuses an unapproved CLI before any provider access',async()=>{
    let checks=0,wall=Date.now();const provider=synthetic(),decide=vi.spyOn(provider,'decide');
    const report=await runSocietyProbe({directory:await directory(),provider,selectedResidents:[...phaseCResidents],plan:plan(),kind:'offline-contract-rehearsal',limits:contextSocietyLimits,paceMs:0,now:()=>wall+=1000,wallNow:()=>checks++===0?0:1780001});
    expect(report.stopReason).toBe('wall-bound');expect(decide).not.toHaveBeenCalled();
    const dir=await directory();await mkdir(join(dir,'runtime'));
    await writeFile(join(dir,'runtime/approved-7g-phase-d-plan.json'),JSON.stringify({...plan(),approved:false}));
    await writeFile(join(dir,'block-network.mjs'),"globalThis.fetch=()=>{throw new Error('UNEXPECTED_NETWORK');};\n");
    const result=spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'block-network.mjs')).href,'--import',pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href,resolve('scripts/society-evaluation.ts'),'--live','--phase-d'],{cwd:dir,encoding:'utf8',windowsHide:true});
    expect(result.status).not.toBe(0);expect(result.stderr).toContain('separately approved');expect(result.stderr).not.toContain('UNEXPECTED_NETWORK');
    await expect(access(join(dir,`runtime/society-7g-${plan().id}.claim`))).rejects.toMatchObject({code:'ENOENT'});
  });
});
