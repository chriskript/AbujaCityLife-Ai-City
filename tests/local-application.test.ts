import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { defaultLocalPolicy, durableJson, LocalMusePolicy } from '../server/controls/local-policy.js';
import { startLocalApplication } from '../server/local-application.js';
import { NeighbourhoodServerSession } from '../server/session.js';
import type { NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { generationReservation } from '../server/inference/model-limits.js';
import { MetaNeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { initializeProbeBudget } from '../server/controls/probe-budget.js';
import { ServerProgression } from '../server/progression.js';
import { townResidents } from '../shared/neighbourhood/population.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { createHash } from 'node:crypto';
import { RemoteNeighbourhoodSession } from '../client/src/simulation/remote-neighbourhood-session.js';
import type { NeighbourhoodFrame } from '../shared/neighbourhood/presentation.js';

const dirs:string[]=[],closers:(()=>Promise<void>)[]=[];
afterEach(async()=>{for(const close of closers.splice(0))await close();vi.restoreAllMocks();vi.unstubAllGlobals();for(const d of dirs.splice(0))await rm(d,{recursive:true,force:true});});
async function fixture(overrides:Partial<typeof defaultLocalPolicy>={}) {
  const dir=await mkdtemp(join(tmpdir(),'local-muse-'));dirs.push(dir);
  const policy=new LocalMusePolicy(join(dir,'policy.json'),join(dir,'usage.json'));
  await durableJson(policy.path,{...defaultLocalPolicy,enabled:true,authorizedAt:new Date().toISOString(),...overrides},true);
  await durableJson(policy.usagePath,{version:1,reservations:[]},true);
  const decide=vi.fn<NeighbourhoodProvider['decide']>(async r=>({mode:'meta',model:'synthetic-offline',decision:{goalId:r.observation.actor.goals[0]!.id,reason:'Synthetic offline contract response',action:{type:'wait',seconds:10}}}));
  const provider:NeighbourhoodProvider={mode:'live-meta',metrics:null,decide,converse:vi.fn(async()=>({reply:'Synthetic offline reply',uncertain:true,evidenceIds:[],claims:[],proposedDecision:null}))};
  const options={checkpoint:join(dir,'session.json'),policy,provider,accessToken:'synthetic-browser-access-token-long-enough',port:0,tick:false};
  return {dir,policy,provider,decide,options};
}
async function start(f:Awaited<ReturnType<typeof fixture>>) {const run=await startLocalApplication(f.options);closers.push(run.close);return run;}
function clock(){let now=Date.now();vi.spyOn(Date,'now').mockImplementation(()=>now);return ()=>{now+=11000;};}

it('runs all sixteen through the normal scheduler without observers or an evaluation plan, then restores the same society',async()=>{
  const f=await fixture({maximumRequests:150,maximumTokens:2000000,totalUsd:5,dailyUsd:5});
  const elapse=clock(),run=await start(f),progression=new ServerProgression(run.session);
  // Direct pulses exercise the same autonomous driver without wall timer races.
  await run.session.command({id:'initial-pause',worldId:run.session.frame.snapshot.worldId,type:'pause',paused:true});
  await run.session.command({id:'start',worldId:run.session.frame.snapshot.worldId,type:'pause',paused:false});
  for(let i=0;i<100;i++){elapse();await progression.pulse();await run.session.tick(21);}
  expect(run.session.frame.snapshot.time).toBeGreaterThan(1800);
  expect(new Set(f.decide.mock.calls.map(([r])=>r.actorId))).toEqual(new Set(townResidents(16).map(r=>r.id)));
  expect(run.session.frame.snapshot.actors).toHaveLength(16);expect(run.session.advancesWithoutObserver).toBe(true);
  await run.session.command({id:'save-pause',worldId:run.session.frame.snapshot.worldId,type:'pause',paused:true});
  const before=JSON.parse(await readFile(f.options.checkpoint,'utf8'));await run.close();
  const reopened=await start({...f,options:{...f.options,policy:new LocalMusePolicy(f.policy.path,f.policy.usagePath)}});
  const after=JSON.parse(await readFile(f.options.checkpoint,'utf8'));
  expect(after.sessionId).toBe(before.sessionId);expect(after.requests).toBe(before.requests);expect(after.plan).toBeNull();
  const a=Neighbourhood.restore(after.world).snapshot,b=Neighbourhood.restore(before.world).snapshot;
  expect(a).toEqual(b);expect(reopened.session.frame.paused).toBe(true);
  expect(reopened.session.frame.muse?.requests).toBe(f.decide.mock.calls.length);
},20000);

it('migrates the operating mock checkpoint with an exact rollback copy and prohibits mock takeover or evaluation import',async()=>{
  const f=await fixture({enabled:false});
  const mock=await NeighbourhoodServerSession.open({checkpoint:f.options.checkpoint});await mock.tick(12);
  const before=await readFile(f.options.checkpoint,'utf8');await mock.close();
  const run=await start(f);const backups=(await readdir(f.dir)).filter(n=>n.includes('pre-local-muse'));
  expect(backups).toHaveLength(1);expect(await readFile(join(f.dir,backups[0]!),'utf8')).toBe(before);
  expect(run.session.frame.snapshot.worldId).toBe(JSON.parse(JSON.parse(before).world).id);
  expect(run.session.frame.snapshot.time).toBe(24);expect(f.decide).not.toHaveBeenCalled();await run.close();
  await expect(NeighbourhoodServerSession.open({checkpoint:f.options.checkpoint})).rejects.toThrow('dev:live');
  const saved=JSON.parse(await readFile(f.options.checkpoint,'utf8'));saved.operating=undefined;saved.plan={id:'historical-evaluation',used:1,reservedUsd:.02};
  await writeFile(f.options.checkpoint,JSON.stringify(saved));
  await expect(startLocalApplication(f.options)).rejects.toThrow('Evaluation checkpoints');
});

it('requires exact owner review to migrate a canonical legacy live world and retains all prior plan consumption',async()=>{
  const f=await fixture({enabled:false});
  const legacy=await NeighbourhoodServerSession.open({checkpoint:f.options.checkpoint,provider:f.provider,plan:{id:'legacy-operating-plan',approved:true,expiresAt:new Date(Date.now()+60000).toISOString(),maxGenerations:1,maxEstimatedUsd:.025,allowAutonomy:false}});
  await legacy.converse({id:'historical-conversation',worldId:legacy.frame.snapshot.worldId,actorId:'amina',message:'Synthetic history to preserve'});
  await legacy.command({id:'legacy-pause',worldId:legacy.frame.snapshot.worldId,type:'pause',paused:true});await legacy.close();
  const before=await readFile(f.options.checkpoint,'utf8'),saved=JSON.parse(before);
  await expect(startLocalApplication(f.options)).rejects.toThrow('migration authorization');
  expect(await readFile(f.options.checkpoint,'utf8')).toBe(before);
  await durableJson(f.policy.path,{...await f.policy.read(),migrationCheckpointHash:createHash('sha256').update(before).digest('hex')});
  const run=await start(f),after=JSON.parse(await readFile(f.options.checkpoint,'utf8'));
  expect(after.legacyPlan).toEqual(saved.plan);expect(after.plan).toBeNull();expect(after.requests).toBe(saved.requests);expect(after.history).toEqual(saved.history);expect(after.metrics).toEqual(saved.metrics);
  const oldWorld=Neighbourhood.restore(saved.world).snapshot,newWorld=Neighbourhood.restore(after.world).snapshot;
  expect(newWorld.id).toBe(oldWorld.id);expect(newWorld.town).toEqual(oldWorld.town);expect(newWorld.tasks).toEqual(oldWorld.tasks);expect(newWorld.communication).toEqual(oldWorld.communication);
  for(const id of Object.keys(oldWorld.npcs))for(const field of ['goals','needs','inventory','memories','relationships','activity'] as const)expect(newWorld.npcs[id]![field]).toEqual(oldWorld.npcs[id]![field]);
  await run.close();const restored=await start(f);expect(restored.session.frame.sessionId).toBe(saved.sessionId);expect(restored.session.paused).toBe(true);
});

it.each([{enabled:false},{dailyUsd:.001},{totalUsd:.001},{maximumTokens:1},{expiresAt:'2000-01-01T00:00:00Z'}])('fails closed for unavailable authorization or allowance: %j',async limits=>{
  const f=await fixture(limits),run=await start(f);await run.session.decide();
  expect(f.decide).not.toHaveBeenCalled();expect(run.session.frame.mode).toBe('live-meta');
  expect(run.session.frame.events.some(e=>e.type==='action-proposed'&&e.data.mode==='mock')).toBe(false);
  expect((await f.policy.refresh()).available).toBe(false);
});

it('preserves spent request/token/cost allowances after restart and reauthorization',async()=>{
  const f=await fixture({maximumRequests:1}),run=await start(f);await run.session.decide();
  expect(f.decide).toHaveBeenCalledOnce();await run.close();
  await durableJson(f.policy.path,{...await f.policy.read(),enabled:true,authorizedAt:new Date().toISOString()});
  const next=await start({...f,options:{...f.options,policy:new LocalMusePolicy(f.policy.path,f.policy.usagePath)}});
  await next.session.tick(21);await next.session.decide();expect(f.decide).toHaveBeenCalledOnce();
  expect(next.session.frame.muse?.remainingRequests).toBe(0);
  expect(next.session.frame.muse?.reservedUsd).toBe(generationReservation(8000));
});

it.each(['pause','inference-stop'] as const)('discards a pending response after %s',async type=>{
  const f=await fixture();let release!:()=>void;
  f.decide.mockImplementation(async r=>{await new Promise<void>(resolve=>{release=resolve;});return {mode:'meta',model:'offline',decision:{goalId:r.observation.actor.goals[0]!.id,reason:'Late synthetic result',action:{type:'wait',seconds:10}}};});
  const run=await start(f),pending=run.session.decide();await vi.waitFor(()=>expect(release).toBeTypeOf('function'));
  const saved=JSON.parse(await readFile(f.options.checkpoint,'utf8'));expect(Object.keys(saved.interruptedDecisions)).toHaveLength(1);
  await run.session.command({id:'stop',worldId:run.session.frame.snapshot.worldId,...(type==='pause'?{type,paused:true}:{type})});
  release();await pending;
  expect(run.session.frame.events.some(e=>e.type==='action-validated')).toBe(false);expect(f.decide).toHaveBeenCalledOnce();
});

it('stops on network failure without substitution/retry, retains review evidence, and permits explicit recovery',async()=>{
  const f=await fixture();f.decide.mockRejectedValue(new Error('secret-upstream-response'));
  const run=await start(f);await run.session.decide();await run.session.decide();
  expect(f.decide).toHaveBeenCalledOnce();expect(run.session.paused).toBe(true);expect(run.session.interruptions).toHaveLength(1);
  expect((await f.policy.read()).enabled).toBe(false);expect(JSON.stringify(run.session.frame)).not.toContain('secret-upstream');
  await run.close();const restored=await start(f);expect(restored.session.paused).toBe(true);expect(restored.session.interruptions).toHaveLength(1);
  await expect(restored.session.command({id:'premature-resume',worldId:restored.session.frame.snapshot.worldId,type:'pause',paused:false})).rejects.toThrow('acknowledge');
  await restored.session.command({id:'review',worldId:restored.session.frame.snapshot.worldId,type:'review-inference'});
  expect(restored.session.interruptions).toEqual([]);expect((await f.policy.read()).enabled).toBe(false);
});

it('enforces concurrency, rate and optional run ceilings using durable reservations',async()=>{
  const f=await fixture({runRequests:1}),run=await start(f);await run.session.decide();
  expect((await f.policy.refresh()).status).toBe('Per-run allowance exhausted');expect(f.decide).toHaveBeenCalledOnce();
  await run.close();const fresh=new LocalMusePolicy(f.policy.path,f.policy.usagePath);expect((await fresh.refresh()).available).toBe(true);
  await durableJson(f.policy.path,{...await fresh.read(),runRequests:null,requestsPerMinute:1});
  expect((await fresh.refresh()).status).toBe('Rate limit; waiting');
});

it('keeps ambiguous pending results across crash recovery without replaying them',async()=>{
  const f=await fixture();let release!:()=>void;
  f.decide.mockImplementation(async r=>{await new Promise<void>(resolve=>{release=resolve;});return {mode:'meta',model:'offline',decision:{goalId:r.observation.actor.goals[0]!.id,reason:'Synthetic pending result',action:{type:'wait',seconds:10}}};});
  const run=await start(f),pending=run.session.decide();await vi.waitFor(()=>expect(release).toBeTypeOf('function'));
  const crashSnapshot=await readFile(f.options.checkpoint,'utf8');
  await run.session.command({id:'pause-crash-fixture',worldId:run.session.frame.snapshot.worldId,type:'pause',paused:true});release();await pending;await run.close();
  // Emulate the last durable envelope before a process died, with the spending reservation retained.
  await writeFile(f.options.checkpoint,crashSnapshot);const recovered=await start(f);
  expect(recovered.session.paused).toBe(true);expect(recovered.session.interruptions).toHaveLength(1);
  await recovered.session.decide();expect(f.decide).toHaveBeenCalledOnce();expect((await f.policy.refresh()).requests).toBe(1);
});

it('rejects overlapping provider entry and enforces a per-run dollar ceiling before dispatch',async()=>{
  const f=await fixture({runUsd:generationReservation(8000)});let release!:()=>void;
  const context={observation:new Neighbourhood().observe('amina'),message:'Synthetic test',history:[]};
  f.provider.converse=vi.fn(async()=>{await new Promise<void>(resolve=>{release=resolve;});return {reply:'Synthetic reply',evidenceIds:[],uncertain:true,claims:[],proposedDecision:null};});
  const provider=f.policy.wrap(f.provider),first=provider.converse(context);await vi.waitFor(()=>expect(release).toBeTypeOf('function'));
  await expect(provider.converse(context)).rejects.toMatchObject({code:'EEXIST'});release();await first;
  await expect(provider.converse(context)).rejects.toThrow('prohibits');expect(f.provider.converse).toHaveBeenCalledOnce();expect((await f.policy.refresh()).requests).toBe(1);
});

it('retains upstream ceilings and expiry even when local policy allows more, without sending HTTP',async()=>{
  const f=await fixture({dailyUsd:5,totalUsd:5});const ledger=join(f.dir,'meta.json');await initializeProbeBudget(ledger);
  const fetcher=vi.fn<typeof fetch>().mockRejectedValue(new Error('Network must not be called'));
  f.options.provider=new MetaNeighbourhoodProvider({apiKey:'synthetic',ledgerPath:ledger,dailyUsd:.001,totalUsd:.001,inputTokenLimit:8000,fetcher});
  const run=await start(f);await run.session.decide();expect(fetcher).not.toHaveBeenCalled();expect(run.session.paused).toBe(true);
  expect(JSON.parse(await readFile(ledger,'utf8')).reservations).toEqual([]);
});

it('rejects concurrent ownership and leaves the active lock intact',async()=>{
  const f=await fixture({enabled:false}),run=await start(f),lockPath=f.options.checkpoint.replace(/\.json$/,'')+'.lock',before=await readFile(lockPath,'utf8');
  await expect(startLocalApplication(f.options)).rejects.toThrow('Society lock');expect(await readFile(lockPath,'utf8')).toBe(before);
  expect(run.session.operational).toBe(true);
});

it('runs the local HTTP scheduler without observers and publishes pending and disabled status even while paused',async()=>{
  const f=await fixture();let release!:()=>void;
  f.decide.mockImplementation(async r=>{await new Promise<void>(resolve=>{release=resolve;});return {mode:'meta',model:'offline',decision:{goalId:r.observation.actor.goals[0]!.id,reason:'Synthetic HTTP scheduling',action:{type:'wait',seconds:10}}};});
  const run=await start({...f,options:{...f.options,tick:true}});
  await vi.waitFor(()=>expect(release).toBeTypeOf('function'),{timeout:3000});
  await vi.waitFor(()=>expect(run.session.frame.muse?.inFlight).toBe(true),{timeout:3000});
  expect(run.session.frame.snapshot.time).toBeGreaterThan(0);
  await run.session.command({id:'http-local-pause',worldId:run.session.frame.snapshot.worldId,type:'pause',paused:true});release();
  await vi.waitFor(()=>expect(run.session.frame.muse?.inFlight).toBe(false),{timeout:3000});
  expect(run.session.frame.events.some(e=>e.type==='action-validated')).toBe(false);
  await durableJson(f.policy.path,{...await f.policy.read(),enabled:false});
  await vi.waitFor(()=>expect(run.session.frame.muse?.enabled).toBe(false),{timeout:3000});
  expect(f.decide).toHaveBeenCalledOnce();
});

it('serves authenticated current frames across browser refresh and exposes stop controls without credentials',async()=>{
  const f=await fixture({enabled:false}),run=await start(f),base=`http://127.0.0.1:${run.port}`;
  expect((await fetch(base+'/api/session')).status).toBe(401);
  const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-City-Lab':'1'},body:JSON.stringify({token:f.options.accessToken})});
  const cookie=login.headers.get('set-cookie')!.split(';')[0]!;expect(login.status).toBe(200);
  const first=await (await fetch(base+'/api/session',{headers:{cookie}})).json();
  const second=await (await fetch(base+'/api/session',{headers:{cookie}})).json();
  expect(second.sessionId).toBe(first.sessionId);expect(second.snapshot.worldId).toBe(first.snapshot.worldId);expect(second.snapshot.actors).toHaveLength(16);
  expect(JSON.stringify(second)).not.toContain(f.options.accessToken);expect(JSON.stringify(second)).not.toContain('authorizedAt');
  const stop=await fetch(base+'/api/commands',{method:'POST',headers:{cookie,Origin:base,'Content-Type':'application/json','X-City-Lab':'1'},body:JSON.stringify({id:'browser-stop',worldId:first.snapshot.worldId,type:'inference-stop'})});
  expect(stop.status).toBe(200);expect((await f.policy.read()).enabled).toBe(false);
});

it('connects the existing remote browser adapter to the authoritative society and preserves it on reconnect',async()=>{
  const f=await fixture({enabled:false}),run=await start(f),base=`http://127.0.0.1:${run.port}`;
  const nativeFetch=globalThis.fetch;let cookie='';
  vi.spyOn(globalThis,'fetch').mockImplementation(async(input,options)=>{
    const headers=new Headers(options?.headers);headers.set('Cookie',cookie);if(options?.method==='POST')headers.set('Origin',base);
    const response=await nativeFetch(base+String(input),{...options,headers});cookie=response.headers.get('set-cookie')?.split(';')[0]??cookie;return response;
  });
  // Event delivery itself is covered by the existing SSE/auth tests; this fixture
  // checks the real adapter's initial fetch, login, commands and reconnect path.
  vi.stubGlobal('EventSource',class {onmessage:unknown=null;onerror:unknown=null;close(){} });
  const remote=new RemoteNeighbourhoodSession();closers.push(async()=>remote.dispose());
  let connection='',latest:NeighbourhoodFrame|undefined;remote.onConnection(value=>{connection=value;});remote.subscribe(frame=>{latest=frame;});
  await vi.waitFor(()=>expect(connection).toBe('unauthorized'));await remote.login(f.options.accessToken);
  expect(connection).toBe('ready');expect(latest?.snapshot.actors).toHaveLength(16);const worldId=latest!.snapshot.worldId,sessionId=latest!.sessionId;
  await remote.send({id:'adapter-pause',worldId,type:'pause',paused:true});remote.setVisible(false);remote.setVisible(true);
  await vi.waitFor(()=>expect(latest?.paused).toBe(true));expect(latest?.sessionId).toBe(sessionId);expect(latest?.snapshot.worldId).toBe(worldId);
  await remote.send({id:'adapter-stop',worldId,type:'inference-stop'});expect((await f.policy.read()).enabled).toBe(false);
});
