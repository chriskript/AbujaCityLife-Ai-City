import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import {NeighbourhoodServerSession,type LivePlan} from '../server/session.js';
import {createNeighbourhoodHttp} from '../server/http.js';
import {SelectiveNeighbourhoodProvider} from '../server/inference/selective-provider.js';
import type {NeighbourhoodProvider} from '../server/inference/neighbourhood-provider.js';
import {phaseCResidents} from '../server/evaluation/society-plan.js';
import {createTown} from '../shared/neighbourhood/town.js';
const directories:string[]=[],closers:(()=>Promise<void>)[]=[];
afterEach(async()=>{for(const close of closers.splice(0))await close();for(const dir of directories.splice(0))await rm(dir,{recursive:true,force:true});vi.restoreAllMocks();});
async function fixture(society:boolean,allowAutonomy:boolean,behaviour:'wait'|'throw'|'serious'|'ordinary'='wait'){
  const directory=await mkdtemp(join(tmpdir(),'http-autonomy-'));directories.push(directory);
  let supplied=0;
  const decide=vi.fn<NeighbourhoodProvider['decide']>(async r=>{
    supplied++;if(behaviour==='throw')throw new Error('Synthetic provider interruption');
    return {mode:'meta',model:'synthetic-offline-http-contract',decision:{goalId:r.observation.actor.goals[0]!.id,reason:'Synthetic offline response, not live Muse evidence',action:behaviour==='serious'?{type:'propose-transport',recipient:'amina',quantity:1}:behaviour==='ordinary'&&supplied===1?{type:'buy',quantity:1}:{type:'wait',seconds:60}}};
  });
  const provider:NeighbourhoodProvider={mode:'live-meta',metrics:null,decide,async converse(){throw new Error('unused');}};
  const now=Date.now(),plan:LivePlan={id:'offline-http-observer-contract',approved:true,expiresAt:new Date(now+3600000).toISOString(),maxGenerations:behaviour==='wait'?1:3,maxEstimatedUsd:society?5:.10,allowAutonomy,...(society?{phase:'7g-d-society',residents:[...phaseCResidents],notBefore:new Date(now-1000).toISOString(),inputTokenLimit:8000,inferenceTimeoutMs:30000}:{})};
  const town=createTown('offline-http-society');town.enableSocialVisits();
  const session=await NeighbourhoodServerSession.open({checkpoint:join(directory,'session.json'),provider:society?new SelectiveNeighbourhoodProvider(phaseCResidents,provider,undefined,true):provider,plan,...(society?{initialWorld:town.serialize()}:{townPopulation:false})});
  const http=createNeighbourhoodHttp(session,'offline-http-test-access-token-long-enough');closers.push(()=>http.close());
  await new Promise<void>(resolve=>http.server.listen(0,'127.0.0.1',resolve));
  return {session,decide};
}
it('advances an explicitly approved autonomous society without SSE, preserving the generation cap and pause',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden; all responses synthetic'));
  const {session,decide}=await fixture(true,true);
  expect(session.advancesWithoutObserver).toBe(true);
  await vi.waitFor(()=>expect(session.frame.events.some(e=>e.type==='action-validated')).toBe(true),{timeout:5000});
  expect(session.frame.snapshot.time).toBeGreaterThan(0);expect(decide).toHaveBeenCalledOnce();
  expect(session.frame.decisionBudget.used).toBe(1);
  await new Promise(r=>setTimeout(r,550));expect(decide).toHaveBeenCalledOnce();
  await session.command({id:'pause-contract',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});
  const pausedTime=session.frame.snapshot.time;await new Promise(r=>setTimeout(r,350));
  expect(session.frame.snapshot.time).toBe(pausedTime);expect(decide).toHaveBeenCalledOnce();expect(network).not.toHaveBeenCalled();
});
it('retains the observer gate for legacy live demonstrations',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  const {session,decide}=await fixture(false,true);
  expect(session.advancesWithoutObserver).toBe(false);await new Promise(r=>setTimeout(r,600));
  expect(session.frame.snapshot.time).toBe(0);expect(decide).not.toHaveBeenCalled();expect(network).not.toHaveBeenCalled();
});
it('refuses a society session without autonomy approval before creating a running HTTP driver',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  await expect(fixture(true,false)).rejects.toThrow('valid separately approved live evaluation plan');
  expect(network).not.toHaveBeenCalled();
});
it.each(['throw','serious'] as const)('pauses observer-free society HTTP after %s failure with no retry or new resident inference',async behaviour=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  const {session,decide}=await fixture(true,true,behaviour);
  await vi.waitFor(()=>expect(session.paused).toBe(true),{timeout:5000});
  expect(decide).toHaveBeenCalledOnce();const time=session.frame.snapshot.time;
  await new Promise(r=>setTimeout(r,550));expect(decide).toHaveBeenCalledOnce();expect(session.frame.snapshot.time).toBe(time);
  if(behaviour==='throw')expect(session.interruptions).toHaveLength(1);
  else expect(session.frame.events.some(e=>e.type==='action-validated'&&e.data.accepted===false)).toBe(true);
  expect(network).not.toHaveBeenCalled();
});
it('continues observer-free HTTP after an ordinary rejection using a fresh independently supplied response',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  const {session,decide}=await fixture(true,true,'ordinary');
  await vi.waitFor(()=>expect(decide.mock.calls.length).toBeGreaterThanOrEqual(2),{timeout:5000});
  expect(session.paused).toBe(false);expect(decide.mock.calls[0]![0].id).not.toBe(decide.mock.calls[1]![0].id);
  expect(session.frame.events.some(e=>e.type==='action-rejected')).toBe(true);expect(session.interruptions).toEqual([]);expect(network).not.toHaveBeenCalled();
});
it('refuses resetting an approved society into an offline town or discarding its established state',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  const {session}=await fixture(true,true);
  await session.command({id:'pause-before-reset-check',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});
  const before=session.frame;
  await expect(session.command({id:'forbidden-society-reset',worldId:before.snapshot.worldId,type:'reset',experiment:'cooperate'})).rejects.toThrow('fresh isolated approved session');
  expect(session.frame.snapshot).toEqual(before.snapshot);expect(session.frame.decisionBudget).toEqual(before.decisionBudget);
  expect(network).not.toHaveBeenCalled();
});
