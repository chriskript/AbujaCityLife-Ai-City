import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect,it,vi} from 'vitest';
import {startHttpBrowserProbe} from '../server/evaluation/http-browser-probe.js';
import {phaseCResidents} from '../server/evaluation/society-plan.js';
import type {NeighbourhoodProvider} from '../server/inference/neighbourhood-provider.js';
const state=vi.hoisted(()=>({fail:false}));
vi.mock('../server/persistence/replace-checkpoint.js',async original=>{
 const actual=await original<typeof import('../server/persistence/replace-checkpoint.js')>();
 return {...actual,replaceCheckpoint:async(source:string,target:string)=>{
  if(state.fail&&target.endsWith('session.json'))throw Object.assign(new Error('Injected persistent replacement denial'),{code:'EPERM'});
  return actual.replaceCheckpoint(source,target);
 }};
});
it('archives a terminal persistence failure without commanding a failed session, changing its checkpoint, retrying inference or losing the report',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'http-persistence-'));
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
 const decide=vi.fn<NeighbourhoodProvider['decide']>(async()=>{throw new Error('No inference expected');});
 const provider:NeighbourhoodProvider={mode:'live-meta',metrics:null,decide,async converse(){throw new Error('unused');}};
 const plan={id:'offline-persistence-probe',approved:true as const,phase:'7g-d-society',residents:[...phaseCResidents],notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),maxGenerations:3,maxEstimatedUsd:2,inputTokenLimit:8000 as const,inferenceTimeoutMs:30000 as const,allowAutonomy:true};
 try{
  const run=await startHttpBrowserProbe({directory,plan,provider,accessToken:'synthetic-access-token-long-enough-for-test',kind:'offline-contract-rehearsal',maximumWallMs:60000});
  await run.session.command({id:'start-contract',worldId:run.status().worldId,type:'pause',paused:false});
  const before=await readFile(join(directory,'session.json'),'utf8');state.fail=true;
  const report=await run.done;
  expect(report).toMatchObject({stopReason:'integrity-failed',persistenceFailed:true,terminalStopped:true,paused:false,providerInvocations:0});
  expect(await readFile(join(directory,'session.json'),'utf8')).toBe(before);
  expect((await readdir(directory)).some(p=>p.startsWith('session.json.')&&p.endsWith('.pending'))).toBe(true);
  expect(JSON.parse(await readFile(join(directory,'report.json'),'utf8')).persistenceFailed).toBe(true);
  expect(decide).not.toHaveBeenCalled();expect(network).not.toHaveBeenCalled();
 }finally{state.fail=false;vi.restoreAllMocks();await rm(directory,{recursive:true,force:true});}
},15000);
