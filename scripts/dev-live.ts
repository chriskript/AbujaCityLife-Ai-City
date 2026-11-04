import { access, readFile, readdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import { legacyOperatingMigrationAuthorized, LocalMusePolicy } from '../server/controls/local-policy.js';
import { MetaNeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { effectiveDailyProbeUsd, effectiveTotalProbeUsd, inspectProbeBudget } from '../server/controls/probe-budget.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { startLocalApplication } from '../server/local-application.js';

// No key, access token, raw provider exception or context reaches the console.
let stage='local configuration';
try {
  if(process.argv.slice(2).some(a=>a!=='--check'))throw new Error();
  const check=process.argv.includes('--check');
  let local:Record<string,string|undefined>={};try{local=parseEnv(await readFile('.env','utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  const env={...local,...process.env};
  stage='credentials: set MODEL_API_KEY in ignored .env or the process environment (npm run meta:check is offline)';
  if(!env.MODEL_API_KEY?.trim())throw new Error();
  stage='browser access: run npm run backend:init once, then use runtime/demo-access.json locally';
  const credentials=JSON.parse(await readFile('runtime/demo-access.json','utf8'));
  if(credentials.version!==1||typeof credentials.token!=='string'||credentials.token.length<32)throw new Error();
  stage='policy: run npm run muse:policy -- init, then configure and explicitly authorize; status shows remaining allowances';
  const dailyUsd=Number(env.META_PROBE_DAILY_USD??'.25'),totalUsd=Number(env.META_PROBE_TOTAL_USD??'1');
  const limits={dailyUsd,totalUsd,...(env.META_PROBE_DAILY_USD_UNTIL?{dailyUsdUntil:env.META_PROBE_DAILY_USD_UNTIL}:{}),...(env.META_PROBE_TOTAL_USD_UNTIL?{totalUsdUntil:env.META_PROBE_TOTAL_USD_UNTIL}:{})};
  const policy=new LocalMusePolicy('runtime/muse-policy.json','runtime/muse-usage.json',{path:'runtime/meta-probe-budget.json',limits}),p=await policy.read();
  for(const file of ['runtime/muse-policy.json.lock','runtime/muse-usage.json.lock']){
    try{await access(file);throw new Error();}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  }
  stage='upstream ledger: preserve runtime/meta-probe-budget.json and inspect pending transactions/locks; allowances and expiry are unchanged';
  await inspectProbeBudget('runtime/meta-probe-budget.json',limits);
  for(const file of ['runtime/meta-probe-budget.json.pending','runtime/meta-probe-budget.json.lock']){
    try{await access(file);throw new Error();}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  }
  effectiveDailyProbeUsd(dailyUsd,env.META_PROBE_DAILY_USD_UNTIL);effectiveTotalProbeUsd(totalUsd,env.META_PROBE_TOTAL_USD_UNTIL);
  const status=await policy.refresh();if(status.status.startsWith('Policy or spending'))throw new Error();
  stage='checkpoint recovery: inspect pending checkpoint files before startup; do not remove active locks';
  try{await access('runtime/neighbourhood-session.lock');throw new Error();}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  if((await readdir('runtime')).some(f=>['neighbourhood-session.json.','muse-policy.json.','muse-usage.json.'].some(prefix=>f.startsWith(prefix))&&f.endsWith('.pending')))throw new Error();
  stage='frontend build: npm install and npm run build must succeed';
  if(check)await access('dist/index.html');
  else await new Promise<void>((resolve,reject)=>{const child=spawn(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.config.ts'],{stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error()));});
  const port=Number(env.PORT??8787);stage='port: PORT must be an integer from 1 to 65535';if(!Number.isInteger(port)||port<1||port>65535)throw new Error();
  const provider=new MetaNeighbourhoodProvider({apiKey:env.MODEL_API_KEY,ledgerPath:'runtime/meta-probe-budget.json',dailyUsd,totalUsd,inputTokenLimit:p.inputTokenLimit,inferenceTimeoutMs:30000,
    ...(env.META_PROBE_DAILY_USD_UNTIL?{dailyUsdUntil:env.META_PROBE_DAILY_USD_UNTIL}:{}),...(env.META_PROBE_TOTAL_USD_UNTIL?{totalUsdUntil:env.META_PROBE_TOTAL_USD_UNTIL}:{})});
  stage='society startup: inspect operating checkpoint, ownership lock and port; evaluation worlds are not accepted';
  if(check){
    try{await access('runtime/neighbourhood-session.lock');throw new Error();}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    try{const text=await readFile('runtime/neighbourhood-session.json','utf8'),saved=JSON.parse(text);if(saved.version!==1||saved.plan&&!legacyOperatingMigrationAuthorized(text,p))throw new Error();Neighbourhood.restore(saved.world);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    console.log(`PASS: offline startup preflight; ${status.status}. No API calls, locks, checkpoint writes or build changes.`);
    console.log(JSON.stringify(status,null,2));
  }else{
  const run=await startLocalApplication({checkpoint:'runtime/neighbourhood-session.json',provider,policy,accessToken:credentials.token,port,dist:'dist'});
  console.log(`Unity Gardens — Live Muse: http://127.0.0.1:${run.port}/`);
  console.log(`16 residents · persistent authoritative world · ${policy.status.status}. Sign in using the existing local access token.`);
  console.log('Application allowances are additional to the unchanged upstream ledger. No mock fallback. Ctrl+C shuts down cleanly.');
  process.once('SIGINT',()=>{void run.close().then(()=>process.exit(0));});process.once('SIGTERM',()=>{void run.close().then(()=>process.exit(0));});
  }
}catch(error){
  const code=(error as NodeJS.ErrnoException).code;
  console.error(`Live startup failed${code?` (${code})`:''}: ${stage}. No inference retry or mock substitution.`);
  process.exitCode=1;
}
