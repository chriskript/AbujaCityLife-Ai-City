import { expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { societyStatus, townPulse } from '../client/src/simulation/town-status.js';
import { LocalNeighbourhoodSession } from '../client/src/simulation/local-neighbourhood-session.js';
import { NeighbourhoodServerSession } from '../server/session.js';
import type { NeighbourhoodFrame } from '../shared/neighbourhood/presentation.js';
import type { NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { RemoteNeighbourhoodSession } from '../client/src/simulation/remote-neighbourhood-session.js';
import { projectNeighbourhood } from '../shared/neighbourhood/presentation.js';
import { createTown } from '../shared/neighbourhood/town.js';

function frame(): NeighbourhoodFrame {
  const session = new LocalNeighbourhoodSession(); let result!: NeighbourhoodFrame;
  session.subscribe(value => { result = value; }); session.dispose();
  return { ...result, mode: 'live-meta', paused: false, inference: { pending: false, lastSuccess: {wallTime:1000,simulationTime:0}, error:null } };
}

it('never equates a connected backend, mock mode or an unverified provider with live AI', () => {
  const f = frame();
  const unverified = structuredClone(f); delete unverified.inference;
  expect(societyStatus(unverified,'ready').label).toBe('AI Unavailable');
  expect(societyStatus({...f,mode:'mock'},'ready').label).toBe('Mock Society');
  expect(societyStatus(f,'ready').label).toBe('AI Society Live');
  expect(societyStatus({...f,paused:true},'ready').label).toBe('Society Paused');
  expect(societyStatus({...f,inference:{...f.inference!,pending:true}},'ready').label).toBe('Residents Thinking');
  const failed = {...f,paused:true,inference:{...f.inference!,error:'Provider failed'}};
  expect(societyStatus(failed,'ready').label).toBe('AI Unavailable');
  expect(societyStatus(failed,'ready').detail).toContain('Provider failed');
  expect(societyStatus(f,'reconnecting').label).toBe('Reconnecting');
  expect(societyStatus(f,'offline').label).toBe('AI Unavailable');
  expect(societyStatus(f,'ready').label).toBe('AI Society Live');
  expect(societyStatus({...f,suspendedReason:'Allowance exhausted',continuityActive:true},'ready').label).toBe('AI Unavailable');
  expect(societyStatus({...f,paused:true,stoppedDecisions:[{actorId:'amina',requestId:'interrupted',reason:'Restart interrupted inference',recordedAt:1000}]},'ready').label).toBe('AI Unavailable');
});

it('reads inventory and population directly and preserves event identity and simulation time across refresh', () => {
  const f = frame(); const event = {id:'recorded-1',time:42,type:'transport-delivered',actor:'musa',subject:'task-1',detail:'Delivered goods',data:{quantity:2}};
  f.pulseEvent = event;
  const before = JSON.stringify(f);
  expect(townPulse(f)).toMatchObject({market:'1 portion available',supply:`${f.snapshot.resources.supplierGoods} goods`,population:'16 residents',event});
  const next = structuredClone(f); next.snapshot.resources.marketGoods = 7; next.snapshot.resources.supplierGoods = 3; next.snapshot.time += 100;
  expect(townPulse(next)).toMatchObject({market:'7 portions available',supply:'3 goods',event});
  expect(townPulse(JSON.parse(JSON.stringify(next))).event).toEqual(event);
  next.pulseEvent = {...event,id:'recorded-2',time:142,type:'social-met'};
  expect(townPulse(next).event?.id).toBe('recorded-2');
  next.pulseEvent=null; expect(townPulse(next).event).toBeNull();
  expect(JSON.stringify(f)).toBe(before);
});

it('retains the last meaningful world event even after routine events leave the feed window', () => {
  const state = createTown('pulse-history').snapshot;
  // Use the actual event shape from the world; fixture events never enter a saved town.
  const world=createTown('pulse-event');world.setRoadBlocked('centre-market',true);
  const original=world.snapshot.events.find(item=>item.type==='road-changed')!;
  state.events=[original,...Array.from({length:70},(_,i)=>({...original,id:`routine-${i}`,type:'activity-completed',time:20+i}))];
  const projection=projectNeighbourhood(state);
  expect(projection.events).toHaveLength(64);
  expect(projection.pulseEvent).toMatchObject({id:original.id,time:original.time,type:original.type});
});

it('uses EventSource recovery without polling, preserving real frames on reconnect', async () => {
  const sources: FakeSource[]=[];
  class FakeSource {
    static CONNECTING=0;readyState=1;onmessage:((event:{data:string})=>void)|null=null;onerror:(()=>void)|null=null;
    constructor(){sources.push(this);}close(){}
  }
  const f=frame();vi.stubGlobal('EventSource',FakeSource);vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(f))));
  const session=new RemoteNeighbourhoodSession();const states:string[]=[];const received:NeighbourhoodFrame[]=[];
  session.onConnection(value=>states.push(value));session.subscribe(value=>received.push(value));
  try{
    await vi.waitFor(()=>expect(states.at(-1)).toBe('ready'));
    sources[0]!.readyState=0;sources[0]!.onerror!();expect(states.at(-1)).toBe('reconnecting');
    expect(received.at(-1)?.snapshot).toEqual(f.snapshot);
    sources[0]!.readyState=1;sources[0]!.onmessage!({data:JSON.stringify({...f,sequence:f.sequence+1})});
    expect(states.at(-1)).toBe('ready');expect(fetch).toHaveBeenCalledTimes(1);
    sources[0]!.readyState=2;sources[0]!.onerror!();expect(states.at(-1)).toBe('offline');
  }finally{session.dispose();vi.unstubAllGlobals();}
});

it('publishes real pending, successful and failed inference and restores its evidence without changing town history', async () => {
  const directory = await mkdtemp(join(tmpdir(),'town-status-'));
  let release!: () => void; let fail = false;
  const provider: NeighbourhoodProvider = {mode:'live-meta',metrics:null,async decide(request){
    await new Promise<void>(resolve => {release=resolve;});
    if(fail)throw new Error('Synthetic provider failure');
    return {mode:'meta',model:'offline-test',decision:{goalId:request.observation.actor.goals[0]!.id,reason:'Isolated test response',action:{type:'wait',seconds:10}}};
  },async converse(){
    await new Promise<void>(resolve => {release=resolve;});
    if(fail)throw new Error('Synthetic provider failure');
    return {reply:'Hello',evidenceIds:[],uncertain:true,proposedDecision:null};
  }};
  const options = {checkpoint:join(directory,'session.json'),provider,plan:{id:'status-test',approved:true as const,expiresAt:new Date(Date.now()+3600000).toISOString(),maxGenerations:12,maxEstimatedUsd:.25,allowAutonomy:true}};
  let session = await NeighbourhoodServerSession.open(options);
  try {
    const pending = session.converse({id:'success',worldId:session.frame.snapshot.worldId,actorId:'amina',message:'Hello'});
    await vi.waitFor(()=>expect(session.frame.inference?.pending).toBe(true));
    expect(societyStatus(session.frame,'ready').label).toBe('Residents Thinking'); release(); await pending;
    expect(session.frame.inference?.lastSuccess).not.toBeNull();
    fail=true;
    const failed = session.converse({id:'failure',worldId:session.frame.snapshot.worldId,actorId:'musa',message:'Hello'});
    const rejection = expect(failed).rejects.toThrow('Inference unavailable');
    await vi.waitFor(()=>expect(session.frame.inference?.pending).toBe(true)); release(); await rejection;
    expect(societyStatus(session.frame,'ready').label).toBe('AI Unavailable');
    const before=session.frame; await session.close(); session=await NeighbourhoodServerSession.open(options);
    expect(session.frame.inference).toEqual(before.inference);
    expect(session.frame.snapshot).toEqual(before.snapshot);
    expect(session.frame.events).toEqual(before.events);
    expect(session.frame.snapshot.actors).toHaveLength(16);
    fail=false;
    const decision=session.decide('zainab');
    await vi.waitFor(()=>expect(session.frame.inference?.pending).toBe(true));
    // A pending recovery must not hide the previous genuine failure.
    expect(societyStatus(session.frame,'ready').label).toBe('AI Unavailable');
    release();await decision;
    expect(societyStatus(session.frame,'ready').label).toBe('AI Society Live');
    await session.command({id:'pause-test',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});
    expect(societyStatus(session.frame,'ready').label).toBe('Society Paused');
    await session.command({id:'resume-test',worldId:session.frame.snapshot.worldId,type:'pause',paused:false});
    expect(societyStatus(session.frame,'ready').label).toBe('AI Society Live');
  } finally {await session.close();await rm(directory,{recursive:true,force:true});}
});
