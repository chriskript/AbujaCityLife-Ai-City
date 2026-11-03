import {readFile,writeFile,open,mkdir,access,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
import {join,basename,resolve,sep} from 'node:path';
import {channel} from 'node:diagnostics_channel';
import {inspectPhaseB} from './inspect-phase-b.js';
import {validateLivePlan,type LivePlan} from '../server/session.js';
import {Neighbourhood} from '../shared/neighbourhood/world.js';
import {MetaNeighbourhoodProvider,neighbourhoodModelConfiguration} from '../server/inference/neighbourhood-provider.js';
import {generationReservation} from '../server/inference/model-limits.js';
import {modelRates} from '../server/inference/model-pricing.js';
import {startHttpBrowserProbe} from '../server/evaluation/http-browser-probe.js';

// Never opens the operating session or enables live mode by default. A fresh
// exclusive, expiring approval must be created after explicit user authorisation.
const args=process.argv.slice(2).join(' '),reliability=args==='--live --reliability';
if(args!=='--live'&&!reliability)throw new Error('Use --live only after explicit approval of the bounded HTTP acceptance plan');
const generations=reliability?64:96,maximumUsd=reliability?1.25:2,wallMinutes=reliability?15:30;
const reservationMicroUsd=Math.round(generationReservation(8000)*generations*1e6);
const approvalPath=reliability?'runtime/approved-7g-http-reliability-plan.json':'runtime/approved-7g-http-browser-plan.json';
const plan:LivePlan&{maximumSimulationSeconds:number;maximumWallMs:number;outputTokenLimit:number}=JSON.parse(await readFile(approvalPath,'utf8'));validateLivePlan(plan);
assert.equal(plan.phase,'7g-d-society');assert.equal(plan.maxGenerations,generations);assert.equal(plan.maxEstimatedUsd,maximumUsd);assert.equal(plan.inputTokenLimit,8000);assert.equal(plan.inferenceTimeoutMs,30000);assert.equal(plan.maximumSimulationSeconds,1800);assert.equal(plan.maximumWallMs,wallMinutes*60000);
assert.equal(plan.outputTokenLimit,2048);assert.equal(neighbourhoodModelConfiguration.outputTokenLimit,2048);
const readiness=await inspectPhaseB(generations,8000);assert(readiness.keyConfigured&&readiness.budget.fullRunFits&&!readiness.ledgerLockPresent);assert.equal(readiness.dailyUsd,50);assert.equal(readiness.totalUsd,100);assert.equal(readiness.dailyUsdUntil,'2026-11-04');assert.equal(readiness.totalUsdUntil,'2026-11-04');
try{await access('runtime/meta-probe-budget.json.pending');throw new Error('Unresolved spending transaction');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
assert.equal(modelRates['muse-spark-1.3'].input,1.25);assert.equal(modelRates['muse-spark-1.3'].output,4.25);assert.equal(reservationMicroUsd,reliability?1197056:1795584);
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const previous=JSON.parse(await readFile('runtime/7g-continuity-followup-20261103T090800Z-preflight.json','utf8'));
const oldDir='output/society-7g/7g-continuity-followup-20261103T090800Z/';
const accepted=JSON.parse(await readFile(oldDir+'analysis.json','utf8'));
const protectedPaths=[...Object.keys(previous.protectedHashes),'runtime/approved-7g-continuity-followup-plan.json',...['session.json','offline-session.json','evidence.ndjson','report.json'].map(p=>oldDir+p),approvalPath];
const failedDir='output/http-muse-acceptance/7g-http-20261103T111807Z';
let failedPreflight:any,failedAudit:any;
if(reliability){
  failedPreflight=JSON.parse(await readFile(failedDir+'/preflight.json','utf8'));failedAudit=JSON.parse(await readFile(failedDir+'/interrupted-audit.json','utf8'));
  for(const[p,h]of Object.entries(failedPreflight.protectedHashes))assert.equal(hash(await readFile(p)),h);
  assert.equal(hash(await readFile(failedDir+'/evidence.ndjson')),failedAudit.integrity.evidenceSha256);
  assert.equal(hash(await readFile(failedDir+'/session.json')),failedAudit.integrity.checkpointSha256);
  for(const p of failedAudit.integrity.pending)assert.equal(hash(await readFile(failedDir+'/'+p.file)),p.sha256);
  protectedPaths.push(...(await readdir(failedDir)).map(p=>failedDir+'/'+p),'runtime/approved-7g-http-browser-plan.json','runtime/http-acceptance-7g-http-20261103T111807Z.claim');
}
const protectedHashes:Record<string,string>={};for(const p of protectedPaths)protectedHashes[p]=hash(await readFile(p));
for(const[p,h]of Object.entries(previous.protectedHashes))assert.equal(protectedHashes[p],h);
assert.equal(hash(await readFile(oldDir+'evidence.ndjson')),accepted.integrity.evidenceSha256);
const operating=JSON.parse(await readFile('runtime/neighbourhood-session.json','utf8'));assert(operating.paused);Neighbourhood.restore(operating.world);Neighbourhood.restore(await readFile('runtime/town-headless.json','utf8'));
const ledgerPath='runtime/meta-probe-budget.json',ledgerBefore=JSON.parse(await readFile(ledgerPath,'utf8'));
if(reliability){
  assert.deepEqual(ledgerBefore.reservations.slice(0,failedPreflight.ledgerBefore.reservations.length),failedPreflight.ledgerBefore.reservations);
  const priorAdded=ledgerBefore.reservations.slice(failedPreflight.ledgerBefore.reservations.length);assert.equal(priorAdded.length,43);assert(priorAdded.every((r:any)=>r.microUsd===18704));
}else assert.deepEqual(ledgerBefore,{version:1,reservations:[...previous.ledgerBefore.reservations,...accepted.integrity.newReservations]});
const sources=execFileSync('rg',['--files','server','shared','scripts','tests','client','-g','*.ts','-g','*.css','-g','*.html'],{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/);
const distFiles=execFileSync('rg',['--files','dist'],{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/);
const sourceHashes:Record<string,string>={};for(const p of [...sources,...distFiles,'package.json','package-lock.json'])sourceHashes[p]=hash(await readFile(p));
const claim=await open(`runtime/http-acceptance-${plan.id}.claim`,'wx',0o600);
await claim.writeFile(JSON.stringify({id:plan.id,createdAt:new Date().toISOString(),approval:'Explicit November 3 request to prepare and execute one bounded fresh real Meta HTTP/browser acceptance run'}));await claim.sync();
const directory=join('output','http-muse-acceptance',plan.id);await mkdir(directory,{recursive:true});
const env={...parseEnv(await readFile('.env','utf8')),...process.env},token=randomBytes(32).toString('hex');
const apiKey=env.MODEL_API_KEY;assert(typeof apiKey==='string'&&apiKey.trim().length>0);assert.equal(env.META_MODEL??'muse-spark-1.3','muse-spark-1.3');
for(const p of distFiles)assert(!(await readFile(p)).includes(Buffer.from(apiKey)),'Credential found in client build');
await writeFile(join(directory,'access.json'),JSON.stringify({token}),{flag:'wx',mode:0o600});
const preflight={id:plan.id,checkedAt:new Date().toISOString(),plan,readiness,protectedHashes,sourceHashes,ledgerBefore,maximumReservationMicroUsd:reservationMicroUsd,authentication:'First bounded invocation only; no extra paid probe',pricingSources:['https://dev.meta.ai/docs/pricing-rate-limits','https://dev.meta.ai/docs/models'],port:8791};
await writeFile(join(directory,'preflight.json'),JSON.stringify(preflight,null,2)+'\n',{flag:'wx',mode:0o600});
let sink:((row:unknown)=>Promise<void>)|undefined;
const network:any[]=[];
const replacements:any[]=[],diagnostics=channel('citylab.checkpoint.replace'),start=performance.now();
const replacementListener=(value:unknown)=>{
  const r=value as any;if(!resolve(r.target).startsWith(resolve(directory)+sep))return;
  const row={stage:'checkpoint-replacement',target:basename(r.target),source:basename(r.source),outcome:r.outcome,attempt:r.attempt,code:r.code??null,elapsedMs:r.elapsedMs,wallMs:Math.round(performance.now()-start)};
  replacements.push(row);void sink?.(row).catch(()=>{});
};
diagnostics.subscribe(replacementListener);
const provider=new MetaNeighbourhoodProvider({apiKey,ledgerPath,dailyUsd:50,totalUsd:100,dailyUsdUntil:'2026-11-04',totalUsdUntil:'2026-11-04',inputTokenLimit:8000,inferenceTimeoutMs:30000,fetcher:async(url,init)=>{
  const u=new URL(String(url));if(u.origin!=='https://api.meta.ai'||!['/v1/responses/input_tokens','/v1/responses'].includes(u.pathname)||init?.method!=='POST')throw new Error('Unapproved provider endpoint');
  const entry:any={number:network.length+1,path:u.pathname,startedAt:new Date().toISOString()};network.push(entry);await sink?.({stage:'provider-http-started',...entry});
  const began=performance.now();
  try{const result=await fetch(url,init);entry.status=result.status;entry.headersLatencyMs=Math.round(performance.now()-began);await sink?.({stage:'provider-http-headers',...entry});return result;}
  catch(e){entry.error=e instanceof Error?e.message:'Provider network interruption';entry.latencyMs=Math.round(performance.now()-began);await sink?.({stage:'provider-http-failed',...entry});throw e;}
}});
try{
  const run=await startHttpBrowserProbe({directory,plan,provider,accessToken:token,kind:'live-meta',port:8791,dist:'dist',maximumWallMs:plan.maximumWallMs,attempt:()=>provider.attempt,forbiddenPublicStrings:[apiKey,token]});
  sink=run.appendEvidence;
  console.log(JSON.stringify({stage:'http-ready',id:plan.id,url:`http://127.0.0.1:${run.port}`,directory,paused:true,maximumGenerations:generations,maximumUsd,maximumReservationUsd:reservationMicroUsd/1e6,maximumWallMinutes:wallMinutes,maximumSimulationSeconds:1800}));
  const report=await run.done;
  const after=JSON.parse(await readFile(ledgerPath,'utf8'));
  assert.deepEqual(after.reservations.slice(0,ledgerBefore.reservations.length),ledgerBefore.reservations);
  const added=after.reservations.slice(ledgerBefore.reservations.length);assert(added.every((r:any)=>r.microUsd===18704));assert(added.length<=generations);assert(added.length<=report.providerInvocations);
  if(!report.providerFailed&&!report.recordingFailed)assert.equal(added.length,report.providerInvocations);
  const protectedChecks:Record<string,boolean>={};for(const[p,h]of Object.entries(protectedHashes)){protectedChecks[p]=hash(await readFile(p))===h;assert(protectedChecks[p]);}
  const sourceChecks:Record<string,boolean>={};for(const[p,h]of Object.entries(sourceHashes)){sourceChecks[p]=hash(await readFile(p))===h;assert(sourceChecks[p]);}
  const audit={id:plan.id,protectedChecks,sourceFilesUnchanged:Object.values(sourceChecks).every(Boolean),priorReservationsPreserved:true,newReservations:added,newReservedMicroUsd:added.reduce((s:number,r:any)=>s+r.microUsd,0),providerHttp:network,actualGenerationsDispatched:network.filter(e=>e.path==='/v1/responses').length,actualTokenPreflights:network.filter(e=>e.path==='/v1/responses/input_tokens').length,evidenceSha256:hash(await readFile(join(directory,'evidence.ndjson')))};
  Object.assign(audit,{checkpointReplacements:replacements});
  await writeFile(join(directory,'integrity-audit.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({stage:'complete',id:plan.id,stopReason:report.stopReason,providerInvocations:report.providerInvocations,returned:report.returned,accepted:report.accepted,rejected:report.rejected,time:report.time,usage:report.usage,maximumReservedUsd:report.maximumReservedUsd,integrityPassed:true}));
}finally{diagnostics.unsubscribe(replacementListener);await claim.close();}
