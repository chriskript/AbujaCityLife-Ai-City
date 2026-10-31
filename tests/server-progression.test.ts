import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NeighbourhoodServerSession } from '../server/session.js';
import { ServerProgression } from '../server/progression.js';
import { createNeighbourhoodHttp } from '../server/http.js';
import { MockNeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { createTown } from '../shared/neighbourhood/town.js';
import { HeadlessTownRunner } from '../shared/neighbourhood/headless-runner.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { LocalNeighbourhoodSession } from '../client/src/simulation/local-neighbourhood-session.js';
import type { NeighbourhoodFrame } from '../shared/neighbourhood/presentation.js';

const directories:string[]=[],cleanup:(()=>Promise<void>)[]=[];
afterEach(async()=>{vi.useRealTimers();for(const close of cleanup.splice(0))await close();for(const path of directories.splice(0))await rm(path,{recursive:true,force:true});});
async function openSession(provider?:MockNeighbourhoodProvider){
 const dir=await mkdtemp(join(tmpdir(),'town-clock-'));directories.push(dir);const checkpoint=join(dir,'session.json');
 const session=await NeighbourhoodServerSession.open({checkpoint,...(provider?{provider}:{})});cleanup.push(()=>session.close());return {session,checkpoint};
}
describe('bounded authoritative progression',()=>{
 it('does not advance or request live reasoning without an observer',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'town-live-clock-'));directories.push(dir);
  const decide=vi.fn(),converse=vi.fn();
  const session=await NeighbourhoodServerSession.open({checkpoint:join(dir,'session.json'),provider:{mode:'live-meta',metrics:null,decide,converse},plan:{id:'offline-gate-test',approved:true,expiresAt:new Date(Date.now()+60000).toISOString(),maxGenerations:1,maxEstimatedUsd:.1,allowAutonomy:true}});cleanup.push(()=>session.close());
  vi.useFakeTimers();const http=createNeighbourhoodHttp(session,'test-only-token-with-at-least-32-characters');
  await new Promise<void>(resolve=>http.server.listen(0,'127.0.0.1',resolve));cleanup.push(()=>http.close());
  await vi.advanceTimersByTimeAsync(2000);expect(session.frame.snapshot.time).toBe(0);expect(decide).not.toHaveBeenCalled();expect(converse).not.toHaveBeenCalled();vi.useRealTimers();
 });
 it('advances and makes decisions with no login, subscriber or browser, and stops cleanly on close',async()=>{
  const {session}=await openSession();const http=createNeighbourhoodHttp(session,'test-only-token-with-at-least-32-characters');
  await new Promise<void>(resolve=>http.server.listen(0,'127.0.0.1',resolve));cleanup.push(()=>http.close());
  await vi.waitFor(()=>{expect(session.frame.snapshot.time).toBeGreaterThan(0);expect(session.frame.decisionBudget.used).toBeGreaterThan(0);},{timeout:4000});
  expect(session.frame.progression!.used).toBe(session.frame.snapshot.time);
 });
 it('serializes overlapping pulses, preserves pause and cursor across restart, and does no elapsed-time catch-up',async()=>{
  const {session,checkpoint}=await openSession();const clock=new ServerProgression(session);
  const first=clock.pulse();expect(clock.pulse()).toBe(first);await first;
  expect(session.frame.snapshot.time).toBe(.5);
  await session.command({id:'pause',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});
  const frozen=session.frame;await clock.pulse();expect(session.frame.sequence).toBe(frozen.sequence);
  await clock.stop();await session.close();
  const stored=JSON.parse(await readFile(checkpoint,'utf8'));
  const restored=await NeighbourhoodServerSession.open({checkpoint});cleanup.push(()=>restored.close());
  expect(restored.frame.snapshot).toEqual(frozen.snapshot);expect(restored.paused).toBe(true);
  expect(JSON.parse(await readFile(checkpoint,'utf8')).progression.cursor).toBe(stored.progression.cursor);
  await restored.command({id:'resume',worldId:restored.frame.snapshot.worldId,type:'pause',paused:false});
  const resumed=new ServerProgression(restored);await resumed.pulse();expect(restored.frame.snapshot.time).toBe(1);await resumed.stop();
 });
 it('clips at the persisted allowance and cannot replenish it through resume, reset or restart',async()=>{
  const {session,checkpoint}=await openSession();await session.close();
  const saved=JSON.parse(await readFile(checkpoint,'utf8'));saved.progression.used=1799.75;await writeFile(checkpoint,JSON.stringify(saved));
  const restored=await NeighbourhoodServerSession.open({checkpoint});cleanup.push(()=>restored.close());
  const clock=new ServerProgression(restored);await clock.pulse();
  expect(restored.frame.snapshot.time).toBe(.25);expect(restored.frame.progression).toMatchObject({used:1800,stopped:true});expect(restored.paused).toBe(true);
  await expect(restored.command({id:'resume',worldId:restored.frame.snapshot.worldId,type:'pause',paused:false})).rejects.toThrow('allowance exhausted');
  await restored.command({id:'reset',worldId:restored.frame.snapshot.worldId,type:'reset',experiment:'cooperate'});expect(restored.paused).toBe(true);expect(restored.frame.progression!.used).toBe(1800);
  await clock.stop();await restored.close();const again=await NeighbourhoodServerSession.open({checkpoint});cleanup.push(()=>again.close());expect(again.paused).toBe(true);expect(again.frame.progression!.used).toBe(1800);
 });
 it('keeps exhausted routine budgets paused through reset and recovery without spending live allowances',async()=>{
  const {session,checkpoint}=await openSession();await session.close();
  const saved=JSON.parse(await readFile(checkpoint,'utf8'));saved.routineRequests=2048;await writeFile(checkpoint,JSON.stringify(saved));
  const restored=await NeighbourhoodServerSession.open({checkpoint});cleanup.push(()=>restored.close());expect(restored.paused).toBe(true);
  await restored.command({id:'reset',worldId:restored.frame.snapshot.worldId,type:'reset',experiment:'cooperate'});
  const clock=new ServerProgression(restored);await clock.pulse();expect(restored.paused).toBe(true);expect(restored.frame.snapshot.time).toBe(0);expect(restored.frame.decisionBudget.used).toBe(2048);
  await expect(restored.command({id:'resume',worldId:restored.frame.snapshot.worldId,type:'pause',paused:false})).rejects.toThrow('allowance exhausted');
  expect(JSON.parse(await readFile(checkpoint,'utf8')).requests).toBe(0);await clock.stop();
 });
 it('upgrades old session metadata without replacing the world or replenishing request accounting',async()=>{
  const {session,checkpoint}=await openSession();await session.decide('musa');await session.tick(.25);const before=session.frame;await session.close();
  const saved=JSON.parse(await readFile(checkpoint,'utf8'));delete saved.progression;await writeFile(checkpoint,JSON.stringify(saved));
  const restored=await NeighbourhoodServerSession.open({checkpoint});cleanup.push(()=>restored.close());expect(restored.frame.snapshot.worldId).toBe(before.snapshot.worldId);expect(restored.frame.snapshot.time).toBe(before.snapshot.time);
  const upgraded=JSON.parse(await readFile(checkpoint,'utf8'));expect(upgraded.requests).toBe(saved.requests);expect(upgraded.last).toEqual(saved.last);expect(upgraded.progression).toEqual({used:0,limit:1800,cursor:0});
 });
 it('fails closed on corrupted progression accounting and invalid clock steps',async()=>{
  const {session,checkpoint}=await openSession();const before=session.frame;
  for(const seconds of [NaN,Infinity,0,-1,61])await expect(session.tick(seconds)).rejects.toThrow('Clock step');expect(session.frame).toEqual(before);
  await session.close();const saved=JSON.parse(await readFile(checkpoint,'utf8'));saved.progression.used=-1;await writeFile(checkpoint,JSON.stringify(saved));
  await expect(NeighbourhoodServerSession.open({checkpoint})).rejects.toThrow('Invalid progression');
 });
 it('stops progression on a checkpoint failure without retrying or overlapping inference',async()=>{
  const {session,checkpoint}=await openSession();const clock=new ServerProgression(session);
  await rm(checkpoint);await mkdir(checkpoint);
  await expect(clock.pulse()).rejects.toThrow('Checkpoint write failed');const sequence=session.frame.sequence;await clock.pulse();expect(session.frame.sequence).toBe(sequence);
  expect(session.operational).toBe(false);
  const http=createNeighbourhoodHttp(session,'test-only-token-with-at-least-32-characters',{tick:false});await new Promise<void>(resolve=>http.server.listen(0,'127.0.0.1',resolve));cleanup.push(()=>http.close());
  const health=await fetch(`http://127.0.0.1:${(http.server.address() as {port:number}).port}/api/health`);expect(health.status).toBe(503);expect(await health.json()).toMatchObject({status:'unavailable'});
 });
});

describe('persistent environmental consequences',()=>{
 it('exposes the same validated closure through the local browser adapter',async()=>{
  const session=new LocalNeighbourhoodSession();let frame!:NeighbourhoodFrame;session.subscribe(value=>{frame=value;});
  expect((await session.send({id:'close',worldId:frame.snapshot.worldId,type:'road',edgeId:'centre-market',blocked:true})).accepted).toBe(true);
  expect(frame.snapshot.blockedEdges).toContain('centre-market');expect(frame.events.some(e=>e.type==='road-observed')).toBe(true);
  expect((await session.send({id:'open',worldId:frame.snapshot.worldId,type:'road',edgeId:'centre-market',blocked:false})).accepted).toBe(true);expect(frame.snapshot.blockedEdges).not.toContain('centre-market');session.dispose();
 });
 it('locally discovers a closure and autonomously reroutes a paid delivery, delaying stock and payment until actual completion',async()=>{
  // Preserve the 7C timing baseline; 7D remote-policy trajectories have separate tests.
  const normal=new HeadlessTownRunner(createTown('comparison',16,{communication:false,map:'legacy-v1'})),closed=new HeadlessTownRunner(createTown('comparison',16,{communication:false,map:'legacy-v1'}));
  expect(closed.world.setRoadBlocked('centre-market',true)).toBe(true);
  expect(closed.world.observe('amina').knownBlockedEdges).toContain('centre-market');
  expect(closed.world.observe('musa').knownBlockedEdges).not.toContain('centre-market');
  expect(closed.world.observe('ibrahim').knownBlockedEdges).not.toContain('centre-market');
  await normal.advance(68);await closed.advance(68);
  expect(normal.world.snapshot.tasks['task-1']!.status).toBe('delivered');
  const delayed=closed.world.snapshot.tasks['task-1']!;expect(delayed.status).toBe('collected');expect(delayed.escrow).toBe(2);expect(delayed.rewardPaid).toBe(false);
  const saved=closed.world.serialize(),restored=Neighbourhood.restore(saved);
  const {triggers:_newTriggers,...recovered}=restored.snapshot,{triggers:_oldTriggers,...original}=closed.world.snapshot;expect(recovered).toEqual(original);
  const runner=new HeadlessTownRunner(restored);await runner.advance(12);
  const complete=restored.snapshot.tasks['task-1']!;expect(complete.status).toBe('delivered');expect(complete.escrow).toBe(0);expect(complete.rewardPaid).toBe(true);
  expect(restored.observe('musa').knownBlockedEdges).toContain('centre-market');
  expect(restored.snapshot.events.some(e=>e.type==='transport-paid' && e.actor==='musa')).toBe(true);
  expect(restored.snapshot.events.some(e=>e.type==='road-observed')).toBe(true);
  expect(restored.snapshot.npcs.musa!.memories.some(m=>m.subject==='centre-market')).toBe(true);
  expect(Object.values(restored.snapshot.npcs).some(n=>n.id!=='musa' && n.activity.kind==='work')).toBe(true);
  expect(restored.setRoadBlocked('centre-market',false)).toBe(true);
  expect(restored.snapshot.tasks['task-1']!.status).toBe('delivered');
 },15000);
 it('rejects invalid or occupied closures without changing world state',()=>{
  const world=createTown('occupied');const request=world.requestInteractionDecision('musa')!;
  world.applyDecision(request.id,{goalId:request.observation.actor.goals[0]!.id,reason:'Test route',action:{type:'travel',destination:'centre'}},{mode:'mock',model:'offline'});world.advance(.25);
  const before=world.serialize();expect(world.setRoadBlocked('stand-centre',true)).toBe(false);expect(world.setRoadBlocked('missing',true)).toBe(false);expect(world.serialize()).toBe(before);
 });
});
