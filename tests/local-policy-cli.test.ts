import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { afterEach, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { createTown } from '../shared/neighbourhood/town.js';
const dirs:string[]=[];
afterEach(async()=>{for(const d of dirs.splice(0))await rm(d,{recursive:true,force:true});});
async function fixture(){
  const dir=await mkdtemp(join(tmpdir(),'muse-owner-cli-'));dirs.push(dir);
  await writeFile(join(dir,'block.mjs'),"globalThis.fetch=()=>{throw new Error('UNEXPECTED_NETWORK');};");return dir;
}
function cli(dir:string,script:string,...args:string[]){
  return spawnSync(process.execPath,['--import',pathToFileURL(join(dir,'block.mjs')).href,'--import',pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href,resolve('scripts/'+script+'.ts'),...args],{cwd:dir,encoding:'utf8',windowsHide:true,timeout:15000,
    env:{...process.env,MODEL_API_KEY:'synthetic-key-never-print',META_PROBE_DAILY_USD:'.25',META_PROBE_TOTAL_USD:'1',META_PROBE_DAILY_USD_UNTIL:undefined,META_PROBE_TOTAL_USD_UNTIL:undefined}});
}
it('lets the owner initialize, configure, authorize and revoke without JSON edits or resetting consumption',async()=>{
  const d=await fixture();expect(cli(d,'muse-policy','init').status).toBe(0);
  const path=join(d,'runtime/muse-policy.json'),usage=join(d,'runtime/muse-usage.json');
  expect(JSON.parse(await readFile(path,'utf8')).enabled).toBe(false);
  const spent=JSON.stringify({version:1,reservations:[{at:Date.now(),run:'previous-process',microUsd:18704,tokens:10048}]});await writeFile(usage,spent);
  expect(cli(d,'muse-policy','configure','--daily-usd=.5','--total-usd=2','--requests=100','--tokens=1000000','--run-requests=12','--rate=3').status).toBe(0);
  expect(cli(d,'muse-policy','authorize').status).toBe(0);
  const authorized=JSON.parse(await readFile(path,'utf8'));expect(authorized).toMatchObject({enabled:true,expiresAt:null,dailyUsd:.5,totalUsd:2,maximumRequests:100,requestsPerMinute:3,runRequests:12});
  const status=cli(d,'muse-policy','status');expect(status.status,status.stderr).toBe(0);expect(JSON.parse(status.stdout).allowances.requests).toBe(1);
  expect(cli(d,'muse-policy','disable').status).toBe(0);expect(JSON.parse(await readFile(path,'utf8')).enabled).toBe(false);
  expect(await readFile(usage,'utf8')).toBe(spent);expect(cli(d,'muse-policy','init').status).toBe(1);expect(await readFile(usage,'utf8')).toBe(spent);
},15000);

it('requires reauthorization after changes, validates limits and preserves an existing Meta ledger',async()=>{
  const d=await fixture();expect(cli(d,'muse-policy','init').status).toBe(0);
  expect(cli(d,'muse-policy','authorize','--until=2000-01-01T00:00:00Z').status).toBe(1);
  expect(cli(d,'muse-policy','configure','--concurrency=2').status).toBe(1);
  expect(cli(d,'muse-policy','init-meta-ledger').status).toBe(0);
  const ledger=join(d,'runtime/meta-probe-budget.json'),before=await readFile(ledger,'utf8');
  expect(cli(d,'muse-policy','init-meta-ledger').status).toBe(1);expect(await readFile(ledger,'utf8')).toBe(before);
});

it('preflights reusable authorization offline without claiming a session, spending, migrating or printing credentials',async()=>{
  const d=await fixture();expect(cli(d,'muse-policy','init').status).toBe(0);expect(cli(d,'muse-policy','authorize').status).toBe(0);expect(cli(d,'muse-policy','init-meta-ledger').status).toBe(0);
  await mkdir(join(d,'dist'));await writeFile(join(d,'dist/index.html'),'synthetic-ui');await writeFile(join(d,'runtime/demo-access.json'),JSON.stringify({version:1,token:'synthetic-access-secret-that-must-not-be-printed'}));
  const before=await readdir(join(d,'runtime')),ledger=await readFile(join(d,'runtime/meta-probe-budget.json'),'utf8');
  const result=cli(d,'dev-live','--check');expect(result.status,result.stderr).toBe(0);expect(result.stdout).toContain('offline startup preflight');
  expect(result.stdout+result.stderr).not.toMatch(/synthetic-key-never-print|synthetic-access-secret|UNEXPECTED_NETWORK/);
  expect(await readdir(join(d,'runtime'))).toEqual(before);expect(await readFile(join(d,'runtime/meta-probe-budget.json'),'utf8')).toBe(ledger);
  await writeFile(join(d,'runtime/neighbourhood-session.lock'),'active-owner');
  const locked=cli(d,'dev-live','--check');expect(locked.status).toBe(1);expect(locked.stderr).toContain('checkpoint recovery');expect(await readFile(join(d,'runtime/neighbourhood-session.lock'),'utf8')).toBe('active-owner');
});

it('authorizes only the exact canonical legacy operating checkpoint for migration, without modifying it or enabling spending',async()=>{
  const d=await fixture();expect(cli(d,'muse-policy','init').status).toBe(0);expect(cli(d,'muse-policy','authorize').status).toBe(0);
  const path=join(d,'runtime/neighbourhood-session.json'),policyPath=join(d,'runtime/muse-policy.json');
  const saved={version:1,world:createTown('server-'+randomUUID()).serialize(),plan:{id:'legacy',used:1,reservedUsd:.016204},requests:12};
  const text=JSON.stringify(saved);await writeFile(path,text);
  const result=cli(d,'muse-policy','authorize-migration');expect(result.status,result.stderr).toBe(0);expect(result.stdout).toContain('Exact canonical legacy checkpoint');
  const policy=JSON.parse(await readFile(policyPath,'utf8'));expect(policy.enabled).toBe(false);expect(policy.migrationCheckpointHash).toBe(createHash('sha256').update(text).digest('hex'));expect(await readFile(path,'utf8')).toBe(text);
  await writeFile(path,JSON.stringify({...saved,plan:{...saved.plan,profile:'7g-d-society'}}));
  expect(cli(d,'muse-policy','authorize-migration').status).toBe(1);expect(await readFile(policyPath,'utf8')).toBe(JSON.stringify(policy,null,2)+'\n');
});
