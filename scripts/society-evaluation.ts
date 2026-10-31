import { mkdir, open, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';
import { join } from 'node:path';
import { MetaNeighbourhoodProvider, MockNeighbourhoodProvider, type NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { validateLivePlan, type LivePlan } from '../server/session.js';
import { runSocietyProbe } from '../server/evaluation/society-probe.js';

// Default is a clearly labelled synthetic contract rehearsal: no env, ledger or network.
const live=process.argv.includes('--live');
if(process.argv.slice(2).some(arg=>!['--live','--offline'].includes(arg)) || process.argv.includes('--offline') && live)throw new Error('Use --offline or --live');
let provider:NeighbourhoodProvider,selectedResidents=['amina','musa'];
let plan:LivePlan={id:`offline-${randomUUID()}`,approved:true,expiresAt:new Date(Date.now()+3600000).toISOString(),maxGenerations:6,maxEstimatedUsd:.10,allowAutonomy:true};
let claim:Awaited<ReturnType<typeof open>>|undefined;
try{
  if(live){
    // This file may only be created after explicit approval in the working session.
    const approval=JSON.parse(await readFile('runtime/approved-7g-plan.json','utf8'));
    const {phase,residents}=approval;
    validateLivePlan(approval);
    if(phase!=='7g-b' || approval.maxGenerations>6 || approval.maxEstimatedUsd>.10 || !approval.allowAutonomy || !Array.isArray(residents) || !residents.length || residents.some((id:unknown)=>typeof id!=='string'))throw new Error('Not the approved first 7G evaluation');
    plan=approval;selectedResidents=residents;
    claim=await open(`runtime/society-7g-${plan.id}.claim`,'wx',0o600);
    await claim.writeFile(JSON.stringify({stage:'claimed',planId:plan.id,createdAt:new Date().toISOString()}));await claim.sync();
    const env={...parseEnv(await readFile('.env','utf8')),...process.env};
    if(!env.MODEL_API_KEY)throw new Error('Missing Meta credential');
    const dailyUsd=Number(env.META_PROBE_DAILY_USD??'.25'),totalUsd=Number(env.META_PROBE_TOTAL_USD??'1');
    if(![dailyUsd,totalUsd].every(value=>Number.isFinite(value)&&value>0&&value<=10))throw new Error('First 7G budget must also respect the $10 ceiling');
    provider=new MetaNeighbourhoodProvider({apiKey:env.MODEL_API_KEY,ledgerPath:'runtime/meta-probe-budget.json',dailyUsd,totalUsd});
  }else{
    const offline=new MockNeighbourhoodProvider();
    provider={mode:'live-meta',metrics:null,async decide(request){const result=await offline.decide(request);return {...result,mode:'meta',model:'offline-7g-contract-fixture'};},async converse(){throw new Error('Unsupported in offline contract rehearsal');}};
  }
  await mkdir('output/society-7g',{recursive:true});const directory=join('output/society-7g',plan.id);await mkdir(directory);
  let wall=Date.now();
  const result=await runSocietyProbe({directory,provider,selectedResidents,plan,kind:live?'live-meta':'offline-contract-rehearsal',...(live?{}:{paceMs:0,now:()=>wall+=1000})});
  console.log(JSON.stringify({kind:result.kind,directory,modelInvocations:result.calls,providerFailed:result.providerFailed,simulationTime:result.town.time,maximumReservationUsd:result.maximumReservedUsd}));
}finally{await claim?.close();}
