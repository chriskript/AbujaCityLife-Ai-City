import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTown } from '../shared/neighbourhood/town.js';
import { townResidents } from '../shared/neighbourhood/population.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { HeadlessTownRunner } from '../shared/neighbourhood/headless-runner.js';
import { NeighbourhoodServerSession } from '../server/session.js';
import { LocalNeighbourhoodSession } from '../client/src/simulation/local-neighbourhood-session.js';
import { projectNeighbourhood, type NeighbourhoodFrame } from '../shared/neighbourhood/presentation.js';
import { NeighbourhoodMockProvider } from '../shared/neighbourhood/mock-provider.js';
import type { Action, WorldState } from '../shared/neighbourhood/types.js';

const provenance={mode:'mock',model:'offline-7b-test'} as const;
const directories: string[]=[], sessions: NeighbourhoodServerSession[]=[];
afterEach(async()=>{for(const session of sessions.splice(0)) await session.close();for(const directory of directories.splice(0)) await rm(directory,{recursive:true,force:true});});
function apply(world: Neighbourhood,id: string,action: Action) {
  const request=world.requestInteractionDecision(id)!;
  return {request,result:world.applyDecision(request.id,{goalId:request.observation.actor.goals[0]!.id,reason:'Offline fixture action',action},provenance)};
}
function gameplay({events:_events,revision:_revision,nextEvent:_nextEvent,...state}: WorldState) {return state;}
function conservation(state: WorldState) {
  const town=state.town!;
  const goods=state.resources.supplierGoods+state.resources.marketGoods+Object.values(state.npcs).reduce((sum,npc)=>sum+npc.inventory.goods,0);
  const jobs=Object.values(state.npcs).flatMap(npc=>npc.activity.kind==='work' && npc.activity.job ? [npc.activity.job] : []);
  const money=Object.values(state.npcs).reduce((sum,npc)=>sum+npc.inventory.coins!,0)+Object.values(town.businesses).reduce((sum,b)=>sum+b.coins,0)+jobs.reduce((sum,job)=>sum+job.wage,0)+Object.values(state.tasks).reduce((sum,task)=>sum+(task.escrow ?? 0),0);
  expect(goods+town.consumed).toBe(state.initialGoods+town.produced);
  expect(money).toBe(town.initialMoney);
  expect(town.rawInputs+town.produced+jobs.reduce((sum,job)=>sum+job.inputs,0)).toBe(town.initialInputs);
}
async function checkpoint() {const directory=await mkdtemp(join(tmpdir(),'town-7b-'));directories.push(directory);return join(directory,'session.json');}

describe('eight-resident integration gate',()=>{
  it('creates eight distinct livelihoods with individual circumstances, homes, goals, contacts and resources',()=>{
    const world=createTown('eight',8),residents=Object.values(world.snapshot.npcs);
    expect(residents).toHaveLength(8);
    expect(new Set(residents.map(npc=>npc.occupation)).size).toBe(8);
    expect(new Set(residents.map(npc=>npc.goals[0]!.description)).size).toBe(8);
    expect(new Set(residents.map(npc=>npc.inventory.coins)).size).toBeGreaterThan(4);
    for(const npc of residents) {expect(npc.home).toBeTruthy();expect(npc.routine).toBeTruthy();expect(npc.skills!.length).toBeGreaterThan(0);}
    expect(world.observe('ibrahim').actor.knowledge.people).toEqual(['halima']);
    expect(world.observe('fatima').actor.needs.rest).toBe(.65);
    conservation(world.snapshot);
  });
  it('runs repeated production, wages, purchases, meals, rest and deliveries in the same autonomous town',async()=>{
    const runner=new HeadlessTownRunner(createTown('eight-soak',8));
    const acted=new Set<string>(),types=new Set<string>();
    for(let minute=0;minute<20;minute++) {
      await runner.advance(60);const state=runner.world.snapshot;conservation(state);
      for(const event of state.events) {types.add(event.type);if(event.type==='action-validated' && event.data.accepted) acted.add(event.actor!);}
      expect(()=>Neighbourhood.restore(runner.world.serialize())).not.toThrow();
    }
    expect(acted.size).toBe(8);
    for(const type of ['paid-work-completed','purchase-paid','food-consumed','rest-completed','transport-paid','transport-delivered','encounter-accepted']) expect(types).toContain(type);
    expect(runner.world.snapshot.town!.produced).toBeGreaterThan(8);
    expect(runner.world.snapshot.town!.consumed).toBeGreaterThan(8);
    expect(runner.scheduler.decisionCount).toBeLessThan(2048);
  },15_000);
  it('keeps the normal local browser session exactly aligned with the configured headless town',async()=>{
    const local=new LocalNeighbourhoodSession();let frame!: NeighbourhoodFrame;local.subscribe(next=>{frame=next;});
    const runner=new HeadlessTownRunner(createTown(frame.snapshot.worldId));
    for(let step=0;step<160;step++) {await local.step();await runner.advance(.25);}
    expect(frame.snapshot).toEqual(projectNeighbourhood(runner.world.snapshot).snapshot);
    expect(frame.events).toEqual(projectNeighbourhood(runner.world.snapshot).events);
    local.dispose();
  });
});

describe('authoritative resources and financial consequences',()=>{
  it('bounds a paid transport proposal by the supplier quantity the requester actually observed',async()=>{
    const fixture=createTown('small-supply',8).snapshot;fixture.resources.supplierGoods=2;fixture.initialGoods=3;
    const world=Neighbourhood.restore(JSON.stringify(fixture));
    apply(world,'amina',{type:'travel',destination:'centre'});world.advance(10);
    apply(world,'amina',{type:'travel',destination:'stand'});world.advance(10);
    const request=world.requestInteractionDecision('amina')!,response=await new NeighbourhoodMockProvider().decide(request);
    expect(response.decision).toMatchObject({action:{type:'propose-transport',quantity:2}});
    expect(world.applyDecision(request.id,response.decision,provenance).accepted).toBe(true);conservation(world.snapshot);
  });
  it('reserves a wage and finite production inputs, then completes exactly once after recovery',()=>{
    const world=createTown('production',8);apply(world,'ibrahim',{type:'travel',destination:'centre'});world.advance(60);
    const before=world.snapshot;
    const {request}=apply(world,'ibrahim',{type:'take-work',businessId:'supply-desk'});
    expect(world.snapshot.npcs.ibrahim!.inventory.coins).toBe(before.npcs.ibrahim!.inventory.coins);
    expect(world.snapshot.town!.rawInputs).toBe(before.town!.rawInputs-2);conservation(world.snapshot);
    world.advance(20);const restored=Neighbourhood.restore(world.serialize());restored.advance(25);
    expect(restored.snapshot.npcs.ibrahim!.inventory.coins).toBe(before.npcs.ibrahim!.inventory.coins!+2);
    expect(restored.snapshot.resources.supplierGoods).toBe(before.resources.supplierGoods+2);
    expect(restored.snapshot.town!.produced).toBe(2);conservation(restored.snapshot);
    const completed=restored.serialize();expect(restored.applyDecision(request.id,{},provenance).accepted).toBe(false);expect(restored.serialize()).toBe(completed);
    restored.advance(30);expect(restored.snapshot.town!.produced).toBe(2);
  });
  it('charges a purchase once, then consumes physical food separately from buying',()=>{
    const world=createTown('meals',8);apply(world,'zainab',{type:'travel',destination:'market'});world.advance(10);
    const before=world.snapshot;
    const {request}=apply(world,'zainab',{type:'buy',quantity:1});
    expect(world.snapshot.npcs.zainab.inventory.coins).toBe(before.npcs.zainab.inventory.coins!-2);
    expect(world.snapshot.npcs.amina.inventory.coins).toBe(before.npcs.amina.inventory.coins!+1);
    expect(world.snapshot.town!.businesses.market!.coins).toBe(1);
    expect(world.snapshot.npcs.zainab.needs.food).toBe(before.npcs.zainab.needs.food);
    expect(world.applyDecision(request.id,{},provenance).duplicate).toBe(true);
    apply(world,'zainab',{type:'eat',quantity:1});
    expect(world.snapshot.npcs.zainab.inventory.goods).toBe(0);expect(world.snapshot.town!.consumed).toBe(1);
    expect(world.snapshot.npcs.zainab.needs.food).toBeLessThan(before.npcs.zainab.needs.food);conservation(world.snapshot);
  });
  it('scales rest by its validated duration and grows needs on scheduled boundaries',()=>{
    const world=createTown('rest',8),before=world.snapshot.npcs.fatima!.needs.rest!;
    apply(world,'fatima',{type:'rest',seconds:10});world.advance(10);
    expect(world.snapshot.npcs.fatima!.needs.rest).toBeCloseTo(before-.1);
    const hunger=world.snapshot.npcs.fatima!.needs.food;world.advance(50);
    expect(world.snapshot.npcs.fatima!.needs.food).toBeCloseTo(hunger+.08);
    expect(world.snapshot.triggers.fatima).toContain('personal-needs-changed');conservation(world.snapshot);
  });
  it('does not turn supplier stock into edible food before a market purchase',()=>{
    const world=createTown('raw-stock',8);apply(world,'amina',{type:'travel',destination:'centre'});world.advance(10);
    apply(world,'amina',{type:'collect-self',quantity:2});
    expect(world.snapshot.npcs.amina.inventory.goods).toBe(2);expect(world.snapshot.npcs.amina.inventory.food).toBe(0);
    expect(apply(world,'amina',{type:'eat',quantity:1}).result.reason).toBe('missing-personal-food');conservation(world.snapshot);
  });
  it('lets bounded rest finish despite nearby arrivals and scheduled need changes',async()=>{
    const world=createTown('uninterrupted-rest',8);apply(world,'fatima',{type:'rest',seconds:60});
    const runner=new HeadlessTownRunner(world);await runner.advance(60);
    expect(world.snapshot.events.filter(event=>event.actor==='fatima' && event.type==='rest-completed')).toHaveLength(1);
    expect(world.snapshot.npcs.fatima!.needs.rest).toBeLessThan(.2);
  });
  it('observes that a resting vendor cannot serve another buyer',()=>{
    const world=createTown('closed-for-rest',8);apply(world,'zainab',{type:'travel',destination:'market'});world.advance(10);
    apply(world,'amina',{type:'rest',seconds:60});
    expect(world.observe('zainab').town!.marketServing).toBe(false);
    expect(apply(world,'zainab',{type:'buy',quantity:1}).result.reason).toBe('trader-not-nearby');conservation(world.snapshot);
  });
  it('does not let an unrelated capable resident change another business’s sales state',()=>{
    const fixture=createTown('market-ownership').snapshot;fixture.npcs.ladi!.capabilities.push('set-sales');
    const world=Neighbourhood.restore(JSON.stringify(fixture));const request=world.requestInteractionDecision('ladi')!,before=world.snapshot;
    expect(world.applyDecision(request.id,{goalId:before.npcs.ladi!.goals[0]!.id,reason:'Try closing a different business',action:{type:'set-sales',open:false}},provenance).reason).toBe('not-market-operator');
    expect(gameplay(world.snapshot)).toEqual(gameplay(before));conservation(world.snapshot);
  });
  it.each([
    ['ibrahim',{type:'take-work',businessId:'supply-desk'},'not-at-workplace'],
    ['halima',{type:'take-work',businessId:'repair-workshop'},'unknown-work'],
    ['zainab',{type:'eat',quantity:1},'missing-personal-food'],
    ['chris',{type:'rest',seconds:10},'not-at-rest-place'],
    ['fatima',{type:'rest',seconds:1},'invalid-schema'],
    ['fatima',{type:'take-work',businessId:'invented'},'unknown-work'],
  ] as const)('rejects %s %j without mutating authoritative gameplay', (id,action,reason)=>{
    const world=createTown('invalid',8);const request=world.requestInteractionDecision(id)!;const before=world.snapshot;
    expect(world.applyDecision(request.id,{goalId:before.npcs[id]!.goals[0]!.id,reason:'Invalid fixture',action},provenance).reason).toBe(reason);
    expect(gameplay(world.snapshot)).toEqual(gameplay(before));conservation(world.snapshot);
  });
  it('fails closed on depleted inputs and funded-work budgets instead of creating money or stock',()=>{
    const world=createTown('finite',8),state=world.snapshot;
    state.town!.initialInputs=0;state.town!.rawInputs=0;
    const restored=Neighbourhood.restore(JSON.stringify(state));
    expect(apply(restored,'halima',{type:'take-work',businessId:'supply-desk'}).result.reason).toBe('work-unavailable');
    const before=restored.snapshot;
    before.town!.initialMoney-=before.town!.businesses['community-errands']!.coins;before.town!.businesses['community-errands']!.coins=0;
    const unfunded=Neighbourhood.restore(JSON.stringify(before));
    expect(apply(unfunded,'zainab',{type:'take-work',businessId:'community-errands'}).result.reason).toBe('work-unavailable');conservation(unfunded.snapshot);
  });
  it('reserves the requester’s real credits and pays a delivery only on physical completion',()=>{
    const world=createTown('paid-delivery',8);
    apply(world,'amina',{type:'travel',destination:'stand'});world.advance(20);
    apply(world,'amina',{type:'propose-transport',recipient:'musa',quantity:4});
    const before=world.snapshot;
    apply(world,'musa',{type:'respond-transport',taskId:'task-1',accept:true});
    expect(world.snapshot.npcs.amina.inventory.coins).toBe(before.npcs.amina.inventory.coins!-2);
    expect(world.snapshot.npcs.musa.inventory.coins).toBe(before.npcs.musa.inventory.coins);
    expect(world.snapshot.tasks['task-1']!.escrow).toBe(2);conservation(world.snapshot);
    apply(world,'musa',{type:'fulfil-transport',taskId:'task-1'});world.advance(10);
    expect(world.snapshot.tasks['task-1']!.escrow).toBe(0);expect(world.snapshot.npcs.musa.inventory.coins).toBe(before.npcs.musa.inventory.coins!+2);conservation(world.snapshot);
  });
  it('keeps a courier’s accepted cargo inedible when an obstruction interrupts delivery',()=>{
    const world=createTown('cargo',8);apply(world,'amina',{type:'travel',destination:'stand'});world.advance(20);
    apply(world,'amina',{type:'propose-transport',recipient:'musa',quantity:2});apply(world,'musa',{type:'respond-transport',taskId:'task-1',accept:true});
    apply(world,'musa',{type:'fulfil-transport',taskId:'task-1'});world.advance(3);world.setRoadBlocked('centre-market',true);world.advance(.25);
    expect(world.snapshot.npcs.musa.inventory.goods).toBe(2);
    expect(apply(world,'musa',{type:'eat',quantity:1}).result.reason).toBe('missing-personal-food');conservation(world.snapshot);
  });
  it('does not expose another resident’s wallet, business finances or remote vacancies in scoped observations',()=>{
    const world=createTown('privacy',8),obs=world.observe('ibrahim');
    expect(obs.town!.work.find(job=>job.id==='supply-desk')!.available).toBeNull();
    expect(JSON.stringify(obs.town)).not.toContain('initialMoney');expect(JSON.stringify(obs.town)).not.toContain('coins');
    expect(obs).not.toHaveProperty('npcs');expect(obs.actor.inventory.coins).toBe(3);
    apply(world,'ibrahim',{type:'travel',destination:'centre'});world.advance(40);
    expect(world.observe('ibrahim').town!.work.find(job=>job.id==='supply-desk')!.available).toBe(true);
  });
  it.each(['money','goods','inputs','booking','business','needs'] as const)('rejects corrupt %s checkpoint state',kind=>{
    const world=createTown('corrupt',8);apply(world,'halima',{type:'take-work',businessId:'supply-desk'});const state=world.snapshot;
    if(kind==='money') state.npcs.halima!.inventory.coins!++;
    if(kind==='goods') state.resources.marketGoods++;
    if(kind==='inputs') state.town!.rawInputs++;
    if(kind==='business') state.town!.businesses['supply-desk']!.owner='invented';
    if(kind==='needs') state.npcs.halima!.needs.rest=2;
    if(kind==='booking' && state.npcs.halima!.activity.kind==='work') state.npcs.halima!.activity.job!.wage++;
    expect(()=>Neighbourhood.restore(JSON.stringify(state))).toThrow('snapshot');
  });
});

describe('normal durable session and migration',()=>{
  it('preserves a full retained memory buffer when adding economic capabilities',()=>{
    const world=new Neighbourhood('full-memory');
    for(let i=0;i<30;i++) world.recordConversation('amina','npc',`Retained personal conversation ${i}`);
    const before=world.snapshot.npcs.amina.memories;
    expect(before).toHaveLength(24);world.enableTown(townResidents(16));
    expect(world.snapshot.npcs.amina.memories).toEqual(before);
    expect(()=>Neighbourhood.restore(world.serialize())).not.toThrow();
  });
  it('runs eight residents past the old decision limit while keeping paid-request accounting separate',async()=>{
    const path=await checkpoint(),session=await NeighbourhoodServerSession.open({checkpoint:path,townPopulation:8});sessions.push(session);
    for(let tick=0;tick<160;tick++) {await session.decide();await session.tick(1);}
    const saved=JSON.parse(await readFile(path,'utf8')),state=JSON.parse(saved.world) as WorldState;
    expect(session.frame.snapshot.actors).toHaveLength(8);expect(saved.routineRequests).toBeGreaterThan(48);expect(saved.requests).toBe(0);
    conservation(state);await session.close();
    const restored=await NeighbourhoodServerSession.open({checkpoint:path,townPopulation:8});sessions.push(restored);
    expect(restored.frame.decisionBudget).toEqual(session.frame.decisionBudget);expect(restored.frame.snapshot.tasks).toEqual(session.frame.snapshot.tasks);
    await restored.command({id:'reset',worldId:restored.frame.snapshot.worldId,type:'reset',experiment:'cooperate'});
    expect(restored.frame.decisionBudget.used).toBe(session.frame.decisionBudget.used);
  },15_000);
  it('upgrades an existing four-resident checkpoint with a rollback copy and preserves its history, inventory and tasks',async()=>{
    const path=await checkpoint(),old=await NeighbourhoodServerSession.open({checkpoint:path,townPopulation:false});sessions.push(old);
    await old.decide('amina');await old.close();const source=await readFile(path,'utf8'),before=JSON.parse(JSON.parse(source).world);
    const town=await NeighbourhoodServerSession.open({checkpoint:path,townPopulation:8});sessions.push(town);
    expect(await readFile(path+'.pre-7b-backup','utf8')).toBe(source);
    const after=JSON.parse(JSON.parse(await readFile(path,'utf8')).world);
    for(const id of ['musa','amina','zainab','chris']) {
      expect(after.npcs[id].node).toBe(before.npcs[id].node);expect(after.npcs[id].activity).toEqual(before.npcs[id].activity);
      expect(after.npcs[id].inventory.goods).toBe(before.npcs[id].inventory.goods);
      for(const memory of before.npcs[id].memories) expect(after.npcs[id].memories).toContainEqual(memory);
    }
    expect(after.tasks).toEqual(before.tasks);expect(after.resources).toEqual(before.resources);conservation(after);
  });
});

describe('sixteen-resident integration gate',()=>{
  it('gives every resident normal independent actions and meals, with varied income, social and resource outcomes',async()=>{
    const runner=new HeadlessTownRunner(createTown('sixteen'));
    const acted=new Set<string>(),ate=new Set<string>(),workers=new Set<string>(),social=new Set<string>(),rejected=new Set<string>();
    for(let minute=0;minute<20;minute++) {
      await runner.advance(60);const state=runner.world.snapshot;conservation(state);
      for(const event of state.events) {
        if(event.type==='action-validated') {if(event.data.accepted) acted.add(event.actor!);else rejected.add(event.id);}
        if(event.type==='food-consumed') ate.add(event.actor!);
        if(event.type==='paid-work-completed') workers.add(event.actor!);
        if(event.type==='encounter-accepted') social.add(event.subject);
      }
      expect(()=>Neighbourhood.restore(runner.world.serialize())).not.toThrow();
    }
    expect(acted.size).toBe(16);expect(ate.size).toBe(16);expect(workers.size).toBeGreaterThanOrEqual(12);
    expect(social.size).toBeGreaterThan(0);expect(rejected.size).toBe(0);
    expect(runner.world.snapshot.town!.produced).toBeGreaterThan(16);expect(runner.world.snapshot.town!.consumed).toBeGreaterThan(16);
    expect(Object.values(runner.world.snapshot.tasks).some(task=>task.status==='delivered')).toBe(true);
    expect(new Set(Object.values(runner.world.snapshot.npcs).map(npc=>npc.inventory.coins)).size).toBeGreaterThan(6);
  },20_000);
  it('adds the next eight residents without resetting existing work bookings, assets, stock or elapsed needs',()=>{
    const world=createTown('growing',8);apply(world,'halima',{type:'take-work',businessId:'supply-desk'});world.advance(15);
    const before=world.snapshot;world.enableTown(townResidents(16));const after=world.snapshot;
    expect(world.residentIds).toHaveLength(16);expect(after.resources).toEqual(before.resources);
    for(const id of Object.keys(before.npcs)) for(const field of ['inventory','needs','activity','node','memories','relationships'] as const) expect(after.npcs[id]![field]).toEqual(before.npcs[id]![field]);
    expect(after.town!.rawInputs).toBe(before.town!.rawInputs);expect(after.town!.produced).toBe(before.town!.produced);
    expect(after.town!.initialMoney).toBe(before.town!.initialMoney+180);conservation(after);
    const restored=Neighbourhood.restore(world.serialize());restored.advance(30);
    expect(restored.snapshot.town!.produced).toBe(2);expect(restored.snapshot.npcs.halima!.inventory.coins).toBe(before.npcs.halima!.inventory.coins!+2);conservation(restored.snapshot);
  });
  it('starts the normal server with sixteen residents and keeps pause and persistent routine accounting intact',async()=>{
    const path=await checkpoint(),session=await NeighbourhoodServerSession.open({checkpoint:path});sessions.push(session);
    expect(session.frame.snapshot.actors).toHaveLength(16);
    expect(session.frame.snapshot.economy?.population).toBe(16);
    for(let i=0;i<16;i++) {await session.decide();await session.tick(.25);}
    const used=session.frame.decisionBudget.used;
    await session.command({id:'pause',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});
    const before=session.frame.snapshot;await session.tick(10);await session.decide();expect(session.frame.snapshot).toEqual(before);
    await session.close();const restored=await NeighbourhoodServerSession.open({checkpoint:path});sessions.push(restored);
    expect(restored.frame.paused).toBe(true);expect(restored.frame.decisionBudget.used).toBe(used);
    expect(restored.frame.snapshot.actors).toHaveLength(16);expect(restored.history('bisi')).toEqual([]);
  });
});
