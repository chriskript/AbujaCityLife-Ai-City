import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect,it,vi} from 'vitest';
import {startHttpBrowserProbe} from '../server/evaluation/http-browser-probe.js';
import {phaseCResidents} from '../server/evaluation/society-plan.js';
import type {NeighbourhoodProvider} from '../server/inference/neighbourhood-provider.js';
const plan=(maxGenerations:number)=>({id:'offline-http-probe',approved:true as const,phase:'7g-d-society',residents:[...phaseCResidents],notBefore:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),maxGenerations,maxEstimatedUsd:2,inputTokenLimit:8000 as const,inferenceTimeoutMs:30000 as const,allowAutonomy:true});
it('runs the real HTTP driver without an observer, records independent responses, and stops exactly at its bound without network or resumption',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  const directory=await mkdtemp(join(tmpdir(),'http-browser-probe-'));
  const decide=vi.fn<NeighbourhoodProvider['decide']>(async r=>({mode:'meta',model:'synthetic-offline-contract',decision:{goalId:r.observation.actor.goals[0]!.id,reason:'Synthetic offline response; not Muse evidence',action:{type:'wait',seconds:60}}}));
  const provider:NeighbourhoodProvider={mode:'live-meta',metrics:null,decide,async converse(){throw new Error('unused');}};
  try{
    const run=await startHttpBrowserProbe({directory,plan:plan(3),provider,accessToken:'synthetic-access-token-long-enough-for-test',kind:'offline-contract-rehearsal',maximumWallMs:60000});
    expect(run.status().paused).toBe(true);
    await run.session.command({id:'start-contract',worldId:run.status().worldId,type:'pause',paused:false});
    const report=await run.done;expect(report.stopReason).toBe('generation-limit');expect(report.returned).toBe(3);expect(report.accepted).toBe(3);expect(report.maximumPending).toBe(1);expect(report.peakObservers).toBe(0);expect(report.paused).toBe(true);
    expect(decide).toHaveBeenCalledTimes(3);expect(network).not.toHaveBeenCalled();
    const checkpoint=JSON.parse(await readFile(join(directory,'session.json'),'utf8'));expect(checkpoint.requests).toBe(3);
    await expect(startHttpBrowserProbe({directory,plan:plan(3),provider,accessToken:'synthetic-access-token-long-enough-for-test',kind:'offline-contract-rehearsal',maximumWallMs:60000})).rejects.toThrow('cannot be resumed');
  }finally{vi.restoreAllMocks();await rm(directory,{recursive:true,force:true});}
},20000);
it('accounts for a real pause boundary without executing a late result, retrying it, or stalling quota completion',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  const directory=await mkdtemp(join(tmpdir(),'http-browser-pause-'));
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  const decide=vi.fn<NeighbourhoodProvider['decide']>(async r=>{await gate;return {mode:'meta',model:'synthetic-pause-contract',decision:{goalId:r.observation.actor.goals[0]!.id,reason:'Synthetic late response after operator pause',action:{type:'wait',seconds:60}}};});
  const provider:NeighbourhoodProvider={mode:'live-meta',metrics:null,decide,async converse(){throw new Error('unused');}};
  try{
    const run=await startHttpBrowserProbe({directory,plan:plan(1),provider,accessToken:'synthetic-access-token-long-enough-for-test',kind:'offline-contract-rehearsal',maximumWallMs:60000});
    await run.session.command({id:'start-pause-contract',worldId:run.status().worldId,type:'pause',paused:false});
    await vi.waitFor(()=>expect(run.status().inFlight).toBe(1));
    await run.session.command({id:'pause-in-flight',worldId:run.status().worldId,type:'pause',paused:true});release();
    const report=await run.done;expect(report.stopReason).toBe('generation-limit');expect(report.returned).toBe(1);expect(report.accepted).toBe(0);expect(report.unexecutedReturned).toEqual([1]);expect(report.interruptions).toEqual([]);expect(decide).toHaveBeenCalledOnce();expect(network).not.toHaveBeenCalled();
  }finally{release();vi.restoreAllMocks();await rm(directory,{recursive:true,force:true});}
},20000);
it('keeps ordinary rejection recovery but stops serious validation through the core HTTP guard',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  const folders:string[]=[];
  try{
    for(const serious of [false,true]){
      const directory=await mkdtemp(join(tmpdir(),'http-browser-validation-'));folders.push(directory);let supplied=0;
      const provider:NeighbourhoodProvider={mode:'live-meta',metrics:null,async decide(r){supplied++;return {mode:'meta',model:'synthetic-validation-contract',decision:{goalId:r.observation.actor.goals[0]!.id,reason:'Synthetic offline validation response',action:serious?{type:'propose-transport',recipient:'amina',quantity:1}:supplied===1?{type:'buy',quantity:1}:{type:'wait',seconds:60}}};},async converse(){throw new Error('unused');}};
      const run=await startHttpBrowserProbe({directory,plan:plan(3),provider,accessToken:'synthetic-access-token-long-enough-for-test',kind:'offline-contract-rehearsal',maximumWallMs:60000});
      await run.session.command({id:'start-validation-contract',worldId:run.status().worldId,type:'pause',paused:false});
      const report=await run.done;
      if(serious){expect(report.stopReason).toBe('validation-failed');expect(supplied).toBe(1);expect(report.coreFailurePauseObserved).toBe(true);}
      else{expect(report.stopReason).toBe('generation-limit');expect(supplied).toBe(3);expect(report.accepted).toBe(2);expect(report.ordinaryRejections).toHaveLength(1);}
    }
    expect(network).not.toHaveBeenCalled();
  }finally{vi.restoreAllMocks();for(const folder of folders)await rm(folder,{recursive:true,force:true});}
},20000);
it('observes the core HTTP provider safe-stop, retains the pending request, and makes no retry',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  const directory=await mkdtemp(join(tmpdir(),'http-browser-failure-'));
  const decide=vi.fn<NeighbourhoodProvider['decide']>(async()=>{throw new Error('Synthetic provider failure');});
  const provider:NeighbourhoodProvider={mode:'live-meta',metrics:null,decide,async converse(){throw new Error('unused');}};
  try{
    const run=await startHttpBrowserProbe({directory,plan:plan(3),provider,accessToken:'synthetic-access-token-long-enough-for-test',kind:'offline-contract-rehearsal',maximumWallMs:60000});
    await run.session.command({id:'start-failure-contract',worldId:run.status().worldId,type:'pause',paused:false});
    const report=await run.done;expect(report.stopReason).toBe('provider-failed');expect(report.coreFailurePauseObserved).toBe(true);expect(report.interruptions).toHaveLength(1);expect(report.returned).toBe(0);expect(decide).toHaveBeenCalledOnce();expect(network).not.toHaveBeenCalled();
  }finally{vi.restoreAllMocks();await rm(directory,{recursive:true,force:true});}
},20000);
