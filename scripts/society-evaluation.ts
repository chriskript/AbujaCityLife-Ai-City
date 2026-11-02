import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import { join } from 'node:path';
import { MetaNeighbourhoodProvider, MockNeighbourhoodProvider, type NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { validateLivePlan, type LivePlan } from '../server/session.js';
import { runSocietyProbe } from '../server/evaluation/society-probe.js';
import { phaseBSocietyLimits, phaseBResidents, validatePhaseBApproval, phaseCSocietyLimits, phaseCResidents, validatePhaseCApproval, phaseDSocietyLimits, validatePhaseDApproval } from '../server/evaluation/society-plan.js';
import { inspectPhaseB } from './inspect-phase-b.js';

// Default is a clearly labelled synthetic contract rehearsal: no env, ledger or network.
const live=process.argv.includes('--live');
const phaseB=process.argv.includes('--phase-b');
const phaseC=process.argv.includes('--phase-c');
const phaseD=process.argv.includes('--phase-d');
if(process.argv.slice(2).some(arg=>!['--live','--offline','--phase-b','--phase-c','--phase-d'].includes(arg)) || process.argv.includes('--offline') && live || [phaseB,phaseC,phaseD].filter(Boolean).length>1)throw new Error('Use --offline or --live, with at most one phase flag');
let provider:NeighbourhoodProvider,selectedResidents=phaseD||phaseC?[...phaseCResidents]:phaseB?[...phaseBResidents]:['amina','musa'];
let plan:LivePlan={id:`offline-${randomUUID()}`,approved:true,expiresAt:new Date(Date.now()+7200000).toISOString(),maxGenerations:phaseD?200:phaseC?36:phaseB?12:6,maxEstimatedUsd:phaseD?5:phaseC?.60:phaseB?.25:.10,allowAutonomy:true,
  ...(phaseD||phaseC?{phase:phaseD?'7g-d-society':'7g-c-unity',residents:[...phaseCResidents],notBefore:new Date().toISOString()} : {}),...(phaseD?{inputTokenLimit:8000}:{})};
const protectedPaths=['.env','runtime/neighbourhood-session.json','runtime/town-headless.json'];
const fingerprints=async()=>Object.fromEntries(await Promise.all(protectedPaths.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
let before:Record<string,string>|undefined;
let readiness:Awaited<ReturnType<typeof inspectPhaseB>>|undefined,evaluationDirectory:string|undefined;
let claim:Awaited<ReturnType<typeof open>>|undefined;
try{
  if(live){
    // This file may only be created after explicit approval in the working session.
    const approval=JSON.parse(await readFile(phaseD?'runtime/approved-7g-phase-d-plan.json':phaseC?'runtime/approved-7g-phase-c-plan.json':phaseB?'runtime/approved-7g-phase-b-plan.json':'runtime/approved-7g-plan.json','utf8'));
    const {phase,residents}=approval;
    validateLivePlan(approval);
    if(phaseD)validatePhaseDApproval(approval);
    else if(phaseC)validatePhaseCApproval(approval);
    else if(phaseB)validatePhaseBApproval(approval);
    else if(phase!=='7g-b' || approval.maxGenerations>6 || approval.maxEstimatedUsd>.10 || !approval.allowAutonomy || !Array.isArray(residents) || !residents.length || residents.some((id:unknown)=>typeof id!=='string'))throw new Error('Not the approved first 7G evaluation');
    plan=approval;selectedResidents=residents;
    if(phaseB || phaseC || phaseD){
      readiness=await inspectPhaseB(phaseD?200:phaseC?36:12,plan.inputTokenLimit ?? 6000);
      if(!readiness.keyConfigured || readiness.ledgerLockPresent || !readiness.budget.fullRunFits)throw new Error('Evaluation readiness failed: key, ledger lock or full-run budget headroom');
      before=await fingerprints();
    }
    claim=await open(`runtime/society-7g-${plan.id}.claim`,'wx',0o600);
    await claim.writeFile(JSON.stringify({stage:'claimed',planId:plan.id,createdAt:new Date().toISOString()}));await claim.sync();
    const env={...parseEnv(await readFile('.env','utf8')),...process.env};
    if(!env.MODEL_API_KEY?.trim() || (env.META_MODEL ?? 'muse-spark-1.3')!=='muse-spark-1.3')throw new Error('Missing Meta credential or mismatched model');
    const dailyUsd=Number(env.META_PROBE_DAILY_USD??'.25'),totalUsd=Number(env.META_PROBE_TOTAL_USD??'1');
    if(!Number.isFinite(dailyUsd) || dailyUsd<=0 || dailyUsd>50 || !Number.isFinite(totalUsd) || totalUsd<=0 || totalUsd>100)throw new Error('Invalid daily or total application allowance');
    provider=new MetaNeighbourhoodProvider({apiKey:env.MODEL_API_KEY,ledgerPath:'runtime/meta-probe-budget.json',dailyUsd,totalUsd,inputTokenLimit:plan.inputTokenLimit ?? 6000,...(env.META_PROBE_DAILY_USD_UNTIL?{dailyUsdUntil:env.META_PROBE_DAILY_USD_UNTIL}:{}),...(env.META_PROBE_TOTAL_USD_UNTIL?{totalUsdUntil:env.META_PROBE_TOTAL_USD_UNTIL}:{})});
  }else{
    const offline=new MockNeighbourhoodProvider();
    provider={mode:'live-meta',metrics:null,async decide(request){const result=await offline.decide(request);return {...result,mode:'meta',model:'offline-7g-contract-fixture'};},async converse(){throw new Error('Unsupported in offline contract rehearsal');}};
  }
  await mkdir('output/society-7g',{recursive:true});const directory=join('output/society-7g',plan.id);await mkdir(directory);
  evaluationDirectory=directory;
  if(before)await writeFile(join(directory,'protected-files-before.json'),JSON.stringify(before,null,2));
  if(readiness)await writeFile(join(directory,'readiness-before.json'),JSON.stringify(readiness,null,2));
  let wall=Date.now();
  const result=await runSocietyProbe({directory,provider,selectedResidents,plan,kind:live?'live-meta':'offline-contract-rehearsal',...(phaseD?{limits:phaseDSocietyLimits}:phaseC?{limits:phaseCSocietyLimits}:phaseB?{limits:phaseBSocietyLimits}:{}),...(live?{}:{paceMs:0,now:()=>wall+=1000})});
  console.log(JSON.stringify({kind:result.kind,directory,modelInvocations:result.calls,providerFailed:result.providerFailed,simulationTime:result.town.time,maximumReservationUsd:result.maximumReservedUsd}));
}finally{
  try{
    if(before && evaluationDirectory){
      const after=await fingerprints();await writeFile(join(evaluationDirectory,'protected-files-after.json'),JSON.stringify(after,null,2));
      if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Protected operating files changed; investigate before any further live run');
    }
  }finally{await claim?.close();}
}
