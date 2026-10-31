import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {townMap,mapFor,initialHomes,buildingFor,workSites} from '../shared/world/town-layout.js';
import {pathToNode} from '../shared/navigation/routes.js';
import {createTown} from '../shared/neighbourhood/town.js';
import {Neighbourhood} from '../shared/neighbourhood/world.js';
import {projectNeighbourhood} from '../shared/neighbourhood/presentation.js';
import {HeadlessTownRunner} from '../shared/neighbourhood/headless-runner.js';
import {NeighbourhoodServerSession} from '../server/session.js';
import {ServerProgression} from '../server/progression.js';
import {MockNeighbourhoodProvider} from '../server/inference/neighbourhood-provider.js';
import {createNeighbourhoodHttp} from '../server/http.js';
import {LocalNeighbourhoodSession} from '../client/src/simulation/local-neighbourhood-session.js';
import type {Action,WorldState} from '../shared/neighbourhood/types.js';
import type {PhoneLease,PhoneAction} from '../shared/neighbourhood/phone.js';

const directories:string[]=[],closers:(()=>Promise<void>)[]=[];
afterEach(async()=>{for(const close of closers.splice(0))await close();for(const dir of directories.splice(0))await rm(dir,{recursive:true,force:true});});
async function file(){const dir=await mkdtemp(join(tmpdir(),'town-7e-'));directories.push(dir);return join(dir,'session.json');}
async function session(options:Partial<Parameters<typeof NeighbourhoodServerSession.open>[0]>={}){const checkpoint=await file();let wall=100000;const value=await NeighbourhoodServerSession.open({checkpoint,now:()=>wall,...options});closers.push(()=>value.close());return {value,checkpoint,elapse:(seconds:number)=>{wall+=seconds*1000;}};}
function apply(world:Neighbourhood,id:string,action:Action){const request=world.requestInteractionDecision(id)!;expect(request).toBeTruthy();return world.applyDecision(request.id,{goalId:request.observation.actor.goals[0]!.id,reason:'Offline acceptance',action},{mode:'mock',model:'test'});}
function advance(world:Neighbourhood,seconds:number){while(seconds>0){const step=Math.min(seconds,60);world.advance(step);seconds-=step;}}
function conserved(state:WorldState){
 const jobs=Object.values(state.npcs).flatMap(npc=>npc.activity.kind==='work'&&npc.activity.job?[npc.activity.job]:[]);
 expect(Object.values(state.npcs).reduce((sum,npc)=>sum+npc.inventory.coins!,0)+Object.values(state.town!.businesses).reduce((sum,b)=>sum+b.coins,0)+jobs.reduce((sum,job)=>sum+job.wage,0)+Object.values(state.tasks).reduce((sum,task)=>sum+(task.escrow??0),0)).toBe(state.town!.initialMoney);
 expect(state.resources.supplierGoods+state.resources.marketGoods+Object.values(state.npcs).reduce((sum,npc)=>sum+npc.inventory.goods,0)+state.town!.consumed).toBe(state.initialGoods+state.town!.produced);
}
describe('one physical town catalogue',()=>{
 it('gives sixteen residents unique assigned homes, four vacant flats, eight distinct workplaces and reachable entrances',()=>{
  const world=createTown('addresses'),state=world.snapshot;expect(state.version).toBe(4);expect(state.mapId).toBe('town-v1');
  expect(townMap.buildings.filter(b=>b.kind==='flats')).toHaveLength(4);expect(townMap.buildings.filter(b=>b.kind==='house')).toHaveLength(4);
  expect(townMap.buildings.reduce((sum,b)=>sum+b.units.length,0)).toBe(20);expect(new Set(Object.values(state.npcs).map(npc=>npc.home)).size).toBe(16);
  expect(new Set(Object.values(state.town!.businesses).map(b=>b.node)).size).toBe(8);
  for(const npc of Object.values(state.npcs)){expect(npc.home).toBe(initialHomes[npc.id]);expect(buildingFor(npc.home!,state.mapId)).toBeTruthy();expect(pathToNode(npc.node,npc.home!,new Set(),townMap)).toBeTruthy();expect(pathToNode(npc.home!,npc.routine!.workplace,new Set(),townMap)).toBeTruthy();}
  expect(townMap.bounds.maxX-townMap.bounds.minX).toBeGreaterThanOrEqual(380);
 });
 it('retains legacy paths unchanged and keeps the taxi graph separate',()=>{
  const legacy=mapFor('legacy-v1');for(const edge of legacy.edges)expect(townMap.edges.find(candidate=>candidate.id===edge.id)).toMatchObject(edge);
  expect(pathToNode('stand','centre',new Set())).toEqual(pathToNode('stand','centre',new Set(),legacy));
  expect(pathToNode('stand','west-flats-flat-1',new Set())).toBeNull();
 });
 it('keeps neighbours in separate flats private, hides indoor avatars and rejects even a known foreign dwelling',()=>{
  const world=createTown('private-homes');apply(world,'chris',{type:'travel',destination:world.snapshot.npcs.chris!.home!});advance(world,120);
  expect(world.snapshot.npcs.chris!.node).toBe(world.snapshot.npcs.chris!.home);
  expect(world.observe('chris').nearbyPeople).toHaveLength(0);expect(world.observe('chris').places.map(p=>p.id)).not.toContain(world.snapshot.npcs.grace!.home);
  expect(projectNeighbourhood(world.snapshot).snapshot.actors.find(actor=>actor.id==='chris')!.insideBuildingId).toBe('hill-flats');
  const state=world.snapshot;state.npcs.chris!.knowledge.places.push(state.npcs.grace!.home!);const restored=Neighbourhood.restore(JSON.stringify(state));
  expect(apply(restored,'chris',{type:'travel',destination:state.npcs.grace!.home!}).reason).toBe('private-dwelling');
 });
 it('upgrades active travel, work, rest and memories without teleporting, paying twice or losing historical knowledge',()=>{
  const world=createTown('upgrade',16,{map:'legacy-v1'});
  apply(world,'tunde',{type:'take-work',businessId:'repair-workshop'});apply(world,'zainab',{type:'travel',destination:'market'});apply(world,'fatima',{type:'rest',seconds:60});world.advance(2);
  const before=world.snapshot;expect(world.upgradeTownMap()).toBe(true);const after=world.snapshot;
  expect(after.npcs.zainab.activity).toEqual(before.npcs.zainab.activity);expect(after.npcs.fatima!.activity).toEqual(before.npcs.fatima!.activity);expect(after.npcs.tunde!.node).toBe('stand');
  for(const id of world.residentIds){expect(after.npcs[id]!.memories).toEqual(before.npcs[id]!.memories);expect(after.npcs[id]!.inventory).toEqual(before.npcs[id]!.inventory);expect(after.npcs[id]!.relationships).toEqual(before.npcs[id]!.relationships);}
  expect(after.npcs.tunde!.activity).toMatchObject({job:{siteNode:'stand'}});expect(after.town!.businesses['repair-workshop']!.node).toBe(workSites['repair-workshop']);
  expect(world.observe('tunde').town!.work.find(job=>job.id==='repair-workshop')!.available).toBeNull();
  const restored=Neighbourhood.restore(world.serialize());restored.advance(58);expect(restored.snapshot.npcs.tunde!.inventory.coins).toBe(before.npcs.tunde!.inventory.coins!+2);conserved(restored.snapshot);
  const balance=restored.snapshot.npcs.tunde!.inventory.coins;restored.advance(1);expect(restored.snapshot.npcs.tunde!.inventory.coins).toBe(balance);
 });
 it('rejects invalid map identities, duplicate dwelling assignments and forged indoor locations',()=>{
  const state=createTown('corrupt-map').snapshot;
  for(const mutate of [(s:any)=>{s.mapId='unknown-map';},(s:any)=>{s.npcs.musa.home=s.npcs.amina.home;},(s:any)=>{s.npcs.musa.node=s.npcs.amina.home;}]){const broken=structuredClone(state);mutate(broken);expect(()=>Neighbourhood.restore(JSON.stringify(broken))).toThrow();}
 });
 it('runs distributed activity, meals, communication and paid deliveries on the expanded map with deterministic recovery',async()=>{
  const runner=new HeadlessTownRunner(createTown('expanded-soak'));const acted=new Set(),ate=new Set(),sites=new Set();
  for(let minute=0;minute<20;minute++){await runner.advance(60);const state=runner.world.snapshot;conserved(state);for(const event of state.events){if(event.type==='action-validated'&&event.data.accepted)acted.add(event.actor);if(event.type==='food-consumed')ate.add(event.actor);if(event.type==='paid-work-started')sites.add(event.subject);}expect(()=>Neighbourhood.restore(runner.world.serialize())).not.toThrow();}
  expect(acted.size).toBe(16);expect(ate.size).toBe(16);expect(sites.size).toBeGreaterThanOrEqual(5);expect(Object.values(runner.world.snapshot.tasks).some(task=>task.status==='delivered')).toBe(true);expect(Object.keys(runner.world.snapshot.communication!.threads).length).toBeGreaterThan(0);
 },25000);
});

describe('scoped phones and ephemeral player control',()=>{
 it('inspects phones without changing world state, answering, exposing an undelivered reply or revealing another inbox',async()=>{
  const {value,checkpoint}=await session();const before=await readFile(checkpoint,'utf8');const initial=value.frame.sequence;
  const inspected=value.phone('amina');expect(inspected.owner.name).toBe('Amina');expect(value.frame.sequence).toBe(initial);expect(await readFile(checkpoint,'utf8')).toBe(before);expect(inspected).not.toHaveProperty('npcs');
  const lease=(await value.controlPhone({worldId:inspected.worldId,actorId:'amina',operation:'acquire'}))!;
  await value.phoneAction({id:'send',worldId:inspected.worldId,actorId:'amina',leaseId:lease.leaseId,action:{type:'communicate',recipient:'musa',channel:'text',purpose:'chat',message:'Can we talk?',memoryId:null}});
  expect(value.phone('musa').communication.threads).toHaveLength(0);expect(value.phone('zainab').communication.threads).toHaveLength(0);
  expect(JSON.stringify(value.frame)).not.toContain(lease.leaseId);expect(await readFile(checkpoint,'utf8')).not.toContain(lease.leaseId);
 });
 it('pauses only the controlled resident decisions, preserves current work, supports renewal and resumes on release/expiry',async()=>{
  const {value,elapse}=await session();const worldId=value.frame.snapshot.worldId;const lease=(await value.controlPhone({worldId,actorId:'amina',operation:'acquire'}))!;
  const clock=new ServerProgression(value);for(let i=0;i<45;i++)await clock.pulse();
  expect(value.frame.snapshot.time).toBeGreaterThan(0);expect(value.frame.events.some(e=>e.type==='action-proposed' && e.actor!=='amina')).toBe(true);expect(value.frame.events.some(e=>e.type==='action-proposed' && e.actor==='amina')).toBe(false);
  elapse(40);const renewed=(await value.controlPhone({worldId,actorId:'amina',operation:'renew',leaseId:lease.leaseId}))!;expect(renewed.expiresAt).toBeGreaterThan(lease.expiresAt);
  elapse(61);expect(value.phone('amina').control).toBeNull();await expect(value.controlPhone({worldId,actorId:'amina',operation:'renew',leaseId:lease.leaseId})).rejects.toThrow('expired');
  await clock.pulse();expect(value.frame.events.some(e=>e.type==='action-proposed' && e.actor==='amina')).toBe(true);await clock.stop();
 });
 it('discards a late inference result even after control was acquired and released, without refunding accounting',async()=>{
  const provider=new MockNeighbourhoodProvider();let resolve!: (result:any)=>void;vi.spyOn(provider,'decide').mockImplementation(()=>new Promise(done=>{resolve=done;}));
  const {value,checkpoint}=await session({provider});const pending=value.decide('amina');await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));
  const worldId=value.frame.snapshot.worldId,lease=(await value.controlPhone({worldId,actorId:'amina',operation:'acquire'}))!;
  await value.controlPhone({worldId,actorId:'amina',operation:'release',leaseId:lease.leaseId});resolve({mode:'mock',model:'late',decision:{goalId:'restock',reason:'Late travel',action:{type:'travel',destination:'centre'}}});await pending;
  expect(value.frame.snapshot.actors.find(actor=>actor.id==='amina')!.moving).toBe(false);expect(JSON.parse(await readFile(checkpoint,'utf8')).requests).toBe(1);
 });
 it('preserves a controlled resident paid work, rejects busy phone actions without mutation and pays completion once',async()=>{
  const world=createTown('controlled-work');expect(apply(world,'tunde',{type:'take-work',businessId:'repair-workshop'}).accepted).toBe(true);
  const {value,checkpoint}=await session({initialWorld:world.serialize()});const worldId=value.frame.snapshot.worldId,lease=(await value.controlPhone({worldId,actorId:'tunde',operation:'acquire'}))!;
  const before=JSON.parse(await readFile(checkpoint,'utf8')).world;
  expect((await value.phoneAction({id:'busy',worldId,actorId:'tunde',leaseId:lease.leaseId,action:{type:'communicate',recipient:'musa',channel:'text',purpose:'chat',message:'Hello',memoryId:null}})).reason).toBe('actor-busy');
  expect(JSON.parse(await readFile(checkpoint,'utf8')).world).toBe(before);await value.tick(30);
  const after=Neighbourhood.restore(JSON.parse(await readFile(checkpoint,'utf8')).world).snapshot;expect(after.npcs.tunde!.inventory.coins).toBe(world.snapshot.npcs.tunde!.inventory.coins!+2);expect(after.npcs.tunde!.activity.kind).toBe('idle');conserved(after);
  await value.tick(1);expect(value.frame.snapshot.actors.find(actor=>actor.id==='tunde')!.coins).toBe(after.npcs.tunde!.inventory.coins);
 });
 it('rejects stale leases and invalid/busy actions without world mutation and deduplicates successful sends',async()=>{
  const {value,checkpoint,elapse}=await session();const worldId=value.frame.snapshot.worldId,lease=(await value.controlPhone({worldId,actorId:'amina',operation:'acquire'}))!;
  const action={type:'communicate',recipient:'musa',channel:'text',purpose:'chat',message:'Hello Musa',memoryId:null} as const;
  const before=JSON.parse(await readFile(checkpoint,'utf8')).world;
  await expect(value.phoneAction({id:'bad-lease',worldId,actorId:'amina',leaseId:'wrong',action})).rejects.toThrow('expired');
  expect((await value.phoneAction({id:'bad-contact',worldId,actorId:'amina',leaseId:lease.leaseId,action:{...action,recipient:'chris'}})).accepted).toBe(false);expect(JSON.parse(await readFile(checkpoint,'utf8')).world).toBe(before);
  const input={id:'one-send',worldId,actorId:'amina',leaseId:lease.leaseId,action};expect((await value.phoneAction(input)).accepted).toBe(true);expect((await value.phoneAction(input)).accepted).toBe(true);expect(value.phone('amina').communication.threads).toHaveLength(1);
  elapse(61);await expect(value.phoneAction({...input,id:'expired'})).rejects.toThrow('expired');
 });
 it('allows a player phone request followed by an independent recipient and a physically completed paid job',async()=>{
  const {value,checkpoint}=await session();const worldId=value.frame.snapshot.worldId,lease=(await value.controlPhone({worldId,actorId:'amina',operation:'acquire'}))!;
  const send=await value.phoneAction({id:'call',worldId,actorId:'amina',leaseId:lease.leaseId,action:{type:'communicate',recipient:'musa',channel:'call',purpose:'request-help',message:'Can you consider a paid supply delivery?',memoryId:null}});expect(send.accepted).toBe(true);
  const clock=new ServerProgression(value);await clock.pulse();expect(value.phone('amina').communication.threads[0]!.response).toBe('accept');
  expect((await value.phoneAction({id:'offer',worldId,actorId:'amina',leaseId:lease.leaseId,action:{type:'propose-transport',recipient:'musa',quantity:4}})).accepted).toBe(true);
  for(let i=0;i<280 && !value.frame.snapshot.tasks.some(task=>task.status==='delivered');i++)await clock.pulse();
  expect(value.frame.snapshot.tasks[0]!.status).toBe('delivered');const data=JSON.parse(await readFile(checkpoint,'utf8'));const world=Neighbourhood.restore(data.world);conserved(world.snapshot);expect(world.snapshot.tasks['task-1']!.rewardPaid).toBe(true);expect(data.requests).toBe(0);await clock.stop();
 },15000);
 it('releases control on restart and mirrors scoped phone operations in the local adapter',async()=>{
  const {value,checkpoint}=await session();const worldId=value.frame.snapshot.worldId,lease=(await value.controlPhone({worldId,actorId:'amina',operation:'acquire'}))!;await value.close();
  const restored=await NeighbourhoodServerSession.open({checkpoint});closers.push(()=>restored.close());expect(restored.phone('amina').control).toBeNull();
  await expect(restored.phoneAction({id:'old',worldId,actorId:'amina',leaseId:lease.leaseId,action:{type:'end-call',communicationId:'missing'}})).rejects.toThrow('expired');
  const local=new LocalNeighbourhoodSession();const phone=await local.phone('amina');const owned=(await local.controlPhone({worldId:phone.worldId,actorId:'amina',operation:'acquire'}))!;
  expect((await local.phoneAction({id:'local-text',worldId:phone.worldId,actorId:'amina',leaseId:owned.leaseId,action:{type:'communicate',recipient:'musa',channel:'text',purpose:'chat',message:'Hello',memoryId:null}})).accepted).toBe(true);
  expect((await local.phone('amina')).communication.threads).toHaveLength(1);local.dispose();
 });
 it('migrates an old server checkpoint with an exact rollback copy and unchanged accounts, memories and active work',async()=>{
  const old=createTown('old-map',16,{map:'legacy-v1'});apply(old,'tunde',{type:'take-work',businessId:'repair-workshop'});old.advance(10);
  const {value,checkpoint}=await session({initialWorld:old.serialize(),townMap:'legacy-v1'});await value.close();const saved=await readFile(checkpoint,'utf8');
  const restored=await NeighbourhoodServerSession.open({checkpoint});closers.push(()=>restored.close());expect(await readFile(checkpoint+'.pre-7e-backup','utf8')).toBe(saved);
  const data=JSON.parse(await readFile(checkpoint,'utf8'));expect(data.requests).toBe(JSON.parse(saved).requests);expect(data.progression).toEqual(JSON.parse(saved).progression);expect(restored.frame.snapshot.mapId).toBe('town-v1');
  expect(Neighbourhood.restore(data.world).snapshot.npcs.tunde!.activity).toMatchObject({job:{siteNode:'stand'}});
 });
 it('authenticates and validates phone HTTP endpoints, including same-origin controls and hidden lease tokens',async()=>{
  const {value}=await session(),token='test-phone-token-with-at-least-32-characters',http=createNeighbourhoodHttp(value,token,{tick:false});await new Promise<void>(done=>http.server.listen(0,'127.0.0.1',done));closers.push(()=>http.close());
  const base=`http://127.0.0.1:${(http.server.address() as {port:number}).port}`,headers={'Content-Type':'application/json','X-City-Lab':'1',Origin:base};
  expect((await fetch(base+'/api/phone?actorId=amina')).status).toBe(401);
  const login=await fetch(base+'/api/login',{method:'POST',headers,body:JSON.stringify({token})}),cookie=login.headers.get('set-cookie')!.split(';')[0]!;
  const view=await(await fetch(base+'/api/phone?actorId=amina',{headers:{Cookie:cookie}})).json();expect(view.owner.id).toBe('amina');
  const control=await fetch(base+'/api/phone/control',{method:'POST',headers:{...headers,Cookie:cookie},body:JSON.stringify({worldId:view.worldId,actorId:'amina',operation:'acquire'})});expect(control.status).toBe(200);const lease=await control.json() as PhoneLease;
  expect(JSON.stringify(await(await fetch(base+'/api/phone?actorId=amina',{headers:{Cookie:cookie}})).json())).not.toContain(lease.leaseId);
  expect((await fetch(base+'/api/phone/control',{method:'POST',headers:{...headers,Cookie:cookie,Origin:'https://invalid.test'},body:JSON.stringify({worldId:view.worldId,actorId:'amina',operation:'renew',leaseId:lease.leaseId})})).status).toBe(403);
 });
});
