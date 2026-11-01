import { readFile, access, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import { pathToFileURL } from 'node:url';
import { inspectSocietyBudget } from '../server/evaluation/society-plan.js';
import { effectiveDailyProbeUsd, effectiveTotalProbeUsd } from '../server/controls/probe-budget.js';
import type { InputTokenLimit } from '../server/inference/model-limits.js';

// No provider construction, authentication attempt, ledger mutation or network.
export async function inspectPhaseB(generations=12,inputTokenLimit:InputTokenLimit=6000) {
  const envBytes=await readFile('.env');
  const env={...parseEnv(envBytes.toString()),...process.env};
  if((env.META_MODEL ?? 'muse-spark-1.3')!=='muse-spark-1.3')throw new Error('Configured model does not match the reviewed model');
  const configuredDailyUsd=Number(env.META_PROBE_DAILY_USD ?? '.25'),configuredTotalUsd=Number(env.META_PROBE_TOTAL_USD ?? '1');
  const dailyUsd=effectiveDailyProbeUsd(configuredDailyUsd,env.META_PROBE_DAILY_USD_UNTIL);
  const totalUsd=effectiveTotalProbeUsd(configuredTotalUsd,env.META_PROBE_TOTAL_USD_UNTIL);
  const ledger=JSON.parse(await readFile('runtime/meta-probe-budget.json','utf8'));
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let ledgerLockPresent=false;
  try{await access('runtime/meta-probe-budget.json.lock');ledgerLockPresent=true;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  let matchesPriorSuccessfulConfiguration:boolean|null=null;
  try{
    const previous=JSON.parse(await readFile('runtime/7g-b-20261031T083448-before.json','utf8'));
    if(!process.env.MODEL_API_KEY)matchesPriorSuccessfulConfiguration=previous.hashes?.['.env']===createHash('sha256').update(envBytes).digest('hex');
  }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  return {mode:'offline-read-only',checkedAt:new Date().toISOString(),timezone:'Africa/Lagos',model:'muse-spark-1.3',
    keyConfigured:Boolean(env.MODEL_API_KEY?.trim()),keySource:process.env.MODEL_API_KEY?'process-environment':'ignored-env-file',
    matchesPriorSuccessfulConfiguration,currentAuthentication:'unverified-no-api-calls',modelAccess:'unverified-no-api-calls',
    configuredDailyUsd,dailyUsd,dailyUsdUntil:env.META_PROBE_DAILY_USD_UNTIL ?? null,configuredTotalUsd,totalUsd,totalUsdUntil:env.META_PROBE_TOTAL_USD_UNTIL ?? null,ledgerLockPresent,inputTokenLimit,budget:inspectSocietyBudget(ledger,dailyUsd,totalUsd,day,generations,inputTokenLimit),
    approval:'not-created-by-this-preparation',generations:0};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const report=await inspectPhaseB();
  await writeFile(new URL('../docs/7g-phase-b-readiness.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
