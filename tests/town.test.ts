import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { defaultResidents, chrisResident, legacyResidents, maximumResidents } from '../shared/neighbourhood/initial-state.js';
import { HeadlessTownRunner } from '../shared/neighbourhood/headless-runner.js';
import { NeighbourhoodMockProvider, type MockChoices } from '../shared/neighbourhood/mock-provider.js';
import { DecisionScheduler } from '../shared/neighbourhood/scheduler.js';
import { projectNeighbourhood } from '../shared/neighbourhood/presentation.js';
import { NeighbourhoodServerSession } from '../server/session.js';
import { runNeighbourhoodDemo } from '../shared/neighbourhood/scenario.js';
import { createInhabitants } from '../client/src/rendering/inhabitants.js';
import type { Action, Inhabitant, NpcId, WorldState } from '../shared/neighbourhood/types.js';

const provenance = { mode: 'mock', model: 'town-offline-fixture' } as const;
const folders: string[] = []; const sessions: NeighbourhoodServerSession[] = [];
async function directory() { const path = await mkdtemp(join(tmpdir(),'town-7a-')); folders.push(path); return path; }
afterEach(async () => { for (const session of sessions.splice(0)) await session.close(); for (const path of folders.splice(0)) await rm(path,{ recursive:true,force:true }); });
function apply(world: Neighbourhood, id: NpcId, action: Action) {
  const request = world.requestInteractionDecision(id)!;
  return world.applyDecision(request.id,{ goalId: request.observation.actor.goals[0]!.id, reason: 'Offline action', action },provenance);
}
function colocated() {
  const world = new Neighbourhood();
  expect(apply(world,'chris',{ type:'travel',destination:'market' }).accepted).toBe(true); world.advance(10);
  return world;
}
function invite(world: Neighbourhood, initiator = 'amina', recipient = 'chris') {
  expect(apply(world,initiator,{ type:'encounter',recipient,purpose:'introduce',message:'May we discuss local work?' }).accepted).toBe(true);
  return Object.values(world.snapshot.social.interactions).at(-1)!;
}
function gameplay({ events:_events,revision:_revision,nextEvent:_nextEvent,...state }: WorldState) { return state; }
function extra(id: string): Inhabitant { const resident = chrisResident(); return { ...resident,id,name:id.toUpperCase(),knowledge:{ ...resident.knowledge,people:[],transporters:[] },relationships:{} }; }

describe('extensible resident registry', () => {
  it('retains the original three-person cooperation fixture and identities', async () => {
    const world = await runNeighbourhoodDemo();
    expect(world.residentIds).toEqual(['musa','amina','zainab']);
    expect(world.snapshot.tasks['task-1']).toMatchObject({ requester:'amina',recipient:'musa',status:'delivered' });
    expect(world.snapshot.npcs.musa.inventory.rewards).toBe(1);
    expect(world.snapshot.npcs.zainab.inventory.goods).toBe(1);
  });
  it('runs four residents and a complete autonomous encounter with a persistent economic consequence', async () => {
    const runner = new HeadlessTownRunner(new Neighbourhood()); await runner.advance(240);
    const world = runner.world, state = world.snapshot;
    expect(world.residentIds).toEqual(['musa','amina','zainab','chris']);
    expect(state.social.interactions['encounter-1']).toMatchObject({ initiator:'amina',recipient:'chris',status:'accepted' });
    expect(state.tasks['task-1']).toMatchObject({ requester:'amina',recipient:'chris',quantity:2,status:'delivered' });
    expect(state.npcs.chris!.inventory).toEqual({ goods:0,rewards:1 });
    expect(state.npcs.amina.relationships.chris?.successfulJobs).toBe(1);
    expect(state.npcs.chris!.relationships.amina?.successfulJobs).toBe(1);
    expect(state.resources).toMatchObject({ supplierGoods:6,marketGoods:2 });
    expect(state.npcs.zainab.inventory.goods).toBe(1);
    expect(state.events.filter(event => event.type === 'action-validated').every(event => event.data.accepted)).toBe(true);
    const lifecycle = ['encounter-invited','encounter-accepted','transport-proposed','transport-accepted','transport-collected','transport-delivered'];
    const events = state.events.filter(event => lifecycle.includes(event.type));
    expect(events.map(event => event.type)).toEqual(lifecycle);
    expect(events[0]!.actor).toBe('amina'); expect(events[1]!.actor).toBe('chris');
    const restored = Neighbourhood.restore(world.serialize());
    expect(restored.snapshot.social).toEqual(state.social);
    expect(restored.snapshot.npcs).toEqual(state.npcs);
    expect(restored.snapshot.tasks).toEqual(state.tasks);
  });
  it('schedules, projects, renders and restores an arbitrary fifth ID', async () => {
    const residents = [...defaultResidents(),extra('ada')];
    const world = new Neighbourhood('five',residents);
    const runner = new HeadlessTownRunner(world); await runner.advance(2);
    expect(world.snapshot.npcs.ada!.intention).not.toBeNull();
    expect(projectNeighbourhood(world.snapshot).snapshot.actors.map(actor => actor.id)).toContain('ada');
    const models = createInhabitants(world.residentIds);
    expect(models.models.ada!.group.userData.npcId).toBe('ada');
    expect(models.ensureResident('another')).toBe(models.ensureResident('another'));
    expect(Neighbourhood.restore(world.serialize()).residentIds).toEqual(world.residentIds);
  });
  it('supports a sixteen-person registry without changing simulation code and enforces a separate ceiling', async () => {
    const residents = [...defaultResidents(),...Array.from({length:12},(_,i) => extra(`resident-${i}`))];
    const world = new Neighbourhood('sixteen',residents);
    const called: string[] = [];
    const scheduler = new DecisionScheduler(world,{ decide: async request => { called.push(request.actorId); return { ...provenance,decision:{ goalId:request.observation.actor.goals[0]!.id,reason:'Routine',action:{type:'wait',seconds:120} } }; } },{ cooldownSeconds:20,perMinute:32,maximumDecisions:32 });
    for (let i=0;i<16;i++) await scheduler.pump();
    expect(new Set(called).size).toBe(16);
    expect(Neighbourhood.restore(world.serialize()).residentIds).toHaveLength(16);
    expect(() => new Neighbourhood('too-many',[...defaultResidents(),...Array.from({length:maximumResidents},(_,i) => extra(`extra-${i}`))])).toThrow('snapshot');
  });
  it('registers a new resident atomically and rejects invalid IDs or duplicate registration', () => {
    const world = new Neighbourhood(); const prior = world.snapshot.npcs;
    world.addResident(extra('ada'));
    for (const id of Object.keys(prior)) expect(world.snapshot.npcs[id]).toEqual(prior[id]);
    const before = world.serialize();
    expect(() => world.addResident(extra('ada'))).toThrow();
    expect(() => world.addResident(extra('__proto__'))).toThrow();
    expect(world.requestInteractionDecision('invented')).toBeNull();
    expect(() => world.recordConversation('invented','npc','Hello')).toThrow('Unknown resident');
    expect(world.serialize()).toBe(before);
  });
  it('allows multiple requesters and transport owners, including an arbitrary ID, without global single-job assumptions', () => {
    const residents = defaultResidents();
    residents.find(npc => npc.id === 'musa')!.node = 'market';
    residents.find(npc => npc.id === 'chris')!.node = 'market';
    residents.find(npc => npc.id === 'amina')!.knowledge.people.push('chris');
    const trader = legacyResidents().find(npc => npc.id === 'amina')!;
    const ada: Inhabitant = { ...trader,id:'ada',name:'Ada',occupation:'Market supplier' };
    const world = new Neighbourhood('parallel-jobs',[...residents,ada]);
    expect(apply(world,'amina',{type:'propose-transport',recipient:'chris',quantity:2}).accepted).toBe(true);
    expect(apply(world,'ada',{type:'propose-transport',recipient:'musa',quantity:2}).accepted).toBe(true);
    expect(apply(world,'chris',{type:'respond-transport',taskId:'task-1',accept:true}).accepted).toBe(true);
    expect(apply(world,'musa',{type:'respond-transport',taskId:'task-2',accept:true}).accepted).toBe(true);
    const restored = Neighbourhood.restore(world.serialize());
    expect(apply(restored,'chris',{type:'fulfil-transport',taskId:'task-1'}).accepted).toBe(true);
    expect(apply(restored,'musa',{type:'fulfil-transport',taskId:'task-2'}).accepted).toBe(true);
    restored.advance(20);
    expect(Object.values(restored.snapshot.tasks).every(task => task.status === 'delivered')).toBe(true);
    expect(restored.snapshot.resources).toMatchObject({supplierGoods:4,marketGoods:5});
    expect(Neighbourhood.restore(restored.serialize()).snapshot.tasks).toEqual(restored.snapshot.tasks);
  });
});

describe('independent authoritative face-to-face encounters', () => {
  it('notices proximity without automatically conversing or learning identity', () => {
    const world = colocated(); const obs = world.observe('amina');
    expect(obs.nearbyPeople.find(person => person.id === 'chris')).toEqual({ id:'chris',name:null,occupation:null,activity:'idle',known:false,canTransport:false });
    expect(obs.encounterOpportunities).toContain('chris');
    expect(world.snapshot.social.interactions).toEqual({});
    expect(world.snapshot.npcs.amina.knowledge.people).not.toContain('chris');
    expect(JSON.stringify(obs)).not.toContain('Renting a room');
  });
  it('does not infer an acquaintance’s private capabilities without previously disclosed service knowledge', () => {
    const residents = defaultResidents();
    residents.find(npc => npc.id === 'chris')!.node = 'market';
    residents.find(npc => npc.id === 'amina')!.knowledge.people.push('chris');
    const world = new Neighbourhood('identity-only',residents);
    expect(world.observe('amina').nearbyPeople.find(person => person.id === 'chris')).toMatchObject({known:true,canTransport:false});
  });
  it.each(['far','travelling','working'] as const)('rejects engagement when the recipient is %s without gameplay mutations', circumstance => {
    const world = circumstance === 'far' ? new Neighbourhood() : colocated();
    if (circumstance === 'travelling') apply(world,'chris',{type:'travel',destination:'centre'});
    if (circumstance === 'working') apply(world,'chris',{type:'work',seconds:30});
    const request = world.requestInteractionDecision('amina')!; const before = world.snapshot;
    const result = world.applyDecision(request.id,{goalId:'restock',reason:'Try talking',action:{type:'encounter',recipient:'chris',purpose:'ask',message:'Any opportunities?'}},provenance);
    expect(result.accepted).toBe(false); expect(gameplay(world.snapshot)).toEqual(gameplay(before));
  });
  it.each(['decline','defer','clarify','accept'] as const)('gives the recipient an independent %s response without inventing a commitment or friendship', async response => {
    const world = colocated(); const interaction = invite(world);
    expect(world.snapshot.social.interactions[interaction.id]!.status).toBe('pending');
    expect(world.snapshot.tasks).toEqual({});
    expect(world.observe('chris').actor.knowledge.people).toContain('amina');
    expect(world.observe('amina').actor.knowledge.people).not.toContain('chris');
    const provider = new NeighbourhoodMockProvider({trader:'cooperate',driver:'accept',encounterResponse:response});
    const request = world.requestDecision('chris')!; const result = await provider.decide(request);
    expect(world.applyDecision(request.id,result.decision,provenance).accepted).toBe(true);
    expect(world.snapshot.social.interactions[interaction.id]!.status).toBe({decline:'declined',defer:'deferred',clarify:'clarified',accept:'accepted'}[response]);
    expect(world.snapshot.tasks).toEqual({});
    expect(world.snapshot.npcs.amina.relationships.chris).toBeUndefined();
    expect(world.snapshot.npcs.amina.knowledge.people.includes('chris')).toBe(response === 'accept');
    expect(Neighbourhood.restore(world.serialize()).snapshot.social).toEqual(world.snapshot.social);
  });
  it('bases a routine response on the recipient’s actual needs, rather than the initiator’s desired outcome', async () => {
    const world = new Neighbourhood();
    apply(world,'amina',{type:'travel',destination:'centre'}); world.advance(10);
    const item = invite(world,'amina','zainab');
    const request = world.requestDecision('zainab')!;
    const response = await new NeighbourhoodMockProvider().decide(request);
    expect(world.applyDecision(request.id,response.decision,provenance).accepted).toBe(true);
    expect(world.snapshot.social.interactions[item.id]!.status).toBe('deferred'); // food need 0.8
  });
  it('defers an acquaintance’s invitation while committed to transport work', async () => {
    const world = colocated(); const item = invite(world);
    apply(world,'chris',{type:'respond-encounter',interactionId:item.id,response:'accept',message:'We can discuss work.'});
    apply(world,'amina',{type:'propose-transport',recipient:'chris',quantity:2});
    apply(world,'chris',{type:'respond-transport',taskId:'task-1',accept:true});
    apply(world,'musa',{type:'travel',destination:'market'}); world.advance(6);
    const invitation = invite(world,'musa','chris');
    const request = world.requestDecision('chris')!;
    const result = await new NeighbourhoodMockProvider().decide(request);
    expect(world.applyDecision(request.id,result.decision,provenance).accepted).toBe(true);
    expect(world.snapshot.social.interactions[invitation.id]!.status).toBe('deferred');
    expect(world.snapshot.tasks['task-1']!.status).toBe('accepted');
    expect(Object.keys(world.snapshot.tasks)).toHaveLength(1);
  });
  it('supports reverse initiation by an unfamiliar resident and legitimate sharing of an attributed memory', () => {
    const world = colocated(); const item = invite(world,'chris','amina');
    expect(apply(world,'amina',{type:'respond-encounter',interactionId:item.id,response:'accept',message:'We can discuss the stall.'}).accepted).toBe(true);
    const memory = world.observe('amina').actor.memories.find(memory => memory.subject === 'market')!;
    expect(apply(world,'amina',{type:'share',recipient:'chris',memoryId:memory.id,asBelief:false}).accepted).toBe(true);
    expect(world.observe('chris').actor.memories.at(-1)).toMatchObject({ source:'amina',kind:'reported',detail:memory.detail });
    expect(world.observe('chris').resources.marketGoods).toBe(1); // independently observed, not overwritten by a report
  });
  it('allows ignoring an invitation, expires it and bounds repeated encounters', () => {
    const world = colocated(); const item = invite(world);
    expect(apply(world,'amina',{type:'encounter',recipient:'chris',purpose:'introduce',message:'Again?'}).reason).toBe('encounter-unavailable');
    world.advance(60); world.advance(31);
    expect(world.snapshot.social.interactions[item.id]!.status).toBe('expired');
    expect(apply(world,'amina',{type:'encounter',recipient:'chris',purpose:'introduce',message:'Again?'}).reason).toBe('encounter-unavailable');
    expect(Object.keys(world.snapshot.social.interactions)).toHaveLength(1);
    expect(world.snapshot.tasks).toEqual({});
  });
  it('rejects invalid recipients, extra fields, wrong responders, stale proximity and duplicate responses', () => {
    const world = colocated();
    expect(apply(world,'amina',{type:'encounter',recipient:'invented',purpose:'ask',message:'Hi'}).reason).toBe('unknown-recipient');
    const item = invite(world);
    expect(apply(world,'musa',{type:'respond-encounter',interactionId:item.id,response:'accept',message:'Hi'}).reason).toBe('wrong-encounter-recipient');
    const request = world.requestInteractionDecision('chris')!;
    const decision = {goalId:'earn',reason:'Respond',action:{type:'respond-encounter',interactionId:item.id,response:'accept',message:'Happy to discuss.'}};
    expect(world.applyDecision(request.id,{...decision,action:{...decision.action,inventory:999}},provenance).reason).toBe('invalid-schema');
    const fresh = world.requestInteractionDecision('chris')!;
    expect(world.applyDecision(fresh.id,decision,provenance).accepted).toBe(true);
    const before = world.serialize();
    expect(world.applyDecision(fresh.id,decision,provenance).duplicate).toBe(true); expect(world.serialize()).toBe(before);
    expect(apply(world,'chris',decision.action as Action).reason).toBe('encounter-not-open');
    const other = colocated(); const pending = invite(other);
    apply(other,'amina',{type:'travel',destination:'stand'});
    expect(apply(other,'chris',{type:'respond-encounter',interactionId:pending.id,response:'accept',message:'Yes'}).reason).toBe('initiator-not-nearby');
  });
  it('rejects duplicate commitments and keeps pending conversation, accepted job and delivery distinct', async () => {
    const runner = new HeadlessTownRunner(new Neighbourhood()); await runner.advance(60.25);
    const world = runner.world;
    expect(Object.values(world.snapshot.social.interactions)[0]!.status).toBe('accepted');
    expect(Object.values(world.snapshot.tasks)).toHaveLength(0);
    await runner.advance(1);
    expect(world.snapshot.tasks['task-1']!.status).toBe('proposed');
    expect(world.snapshot.resources.supplierGoods).toBe(8);
    const request = world.requestInteractionDecision('amina')!; const before = world.snapshot;
    expect(world.applyDecision(request.id,{goalId:'restock',reason:'Duplicate',action:{type:'propose-transport',recipient:'chris',quantity:2}},provenance).reason).toBe('existing-commitment');
    expect(gameplay(world.snapshot)).toEqual(gameplay(before));
    await runner.advance(30);
    expect(world.snapshot.tasks['task-1']!.status).toBe('accepted');
    expect(world.snapshot.resources.supplierGoods).toBe(8);
    await runner.advance(150);
    expect(world.snapshot.tasks['task-1']!.status).toBe('delivered');
    expect(Object.keys(world.snapshot.tasks)).toHaveLength(1);
  });
  it('can choose no interaction in the normal town', async () => {
    const runner = new HeadlessTownRunner(new Neighbourhood(),{trader:'cooperate',driver:'accept',social:'ignore'});
    await runner.advance(240);
    expect(runner.world.snapshot.social.interactions).toEqual({});
    expect(runner.world.snapshot.tasks['task-1']).toMatchObject({recipient:'musa',status:'delivered'});
  });
});

describe('bounded progression and recovery', () => {
  it('supports pause/resume, bounded advancement and deterministic runs with no observer', async () => {
    const first = new HeadlessTownRunner(new Neighbourhood('same')); const second = new HeadlessTownRunner(new Neighbourhood('same'));
    first.pause(); expect((await first.advance(5)).advanced).toBe(0); first.resume();
    await first.advance(240); await second.advance(240);
    expect(first.world.serialize()).toBe(second.world.serialize());
    await expect(first.advance(Infinity)).rejects.toThrow('Bounded'); await expect(first.advance(3601)).rejects.toThrow('Bounded');
  });
  it('restores an unanswered interaction without an automatic acceptance or leaked knowledge', () => {
    const world = colocated(); const item = invite(world);
    const old = world.requestDecision('chris')!;
    const restored = Neighbourhood.restore(world.serialize());
    expect(restored.snapshot.social.interactions[item.id]!.status).toBe('pending');
    expect(restored.observe('amina').actor.knowledge.people).not.toContain('chris');
    expect(restored.requestDecision('chris')!.observation.encounters[0]!.id).toBe(item.id);
    expect(restored.applyDecision(old.id,{},provenance).reason).toBe('unknown-request');
  });
  it('preserves Chris, social consequences and accounting through the normal durable server session', async () => {
    const checkpoint = join(await directory(),'session.json');
    const session = await NeighbourhoodServerSession.open({townPopulation:false,checkpoint}); sessions.push(session);
    await session.command({id:'speed',worldId:session.frame.snapshot.worldId,type:'speed',speed:4});
    // Fixed wall clock: routine mock actions must still follow bounded simulation time.
    for(let i=0;i<240;i++) {
      await session.decide(); await session.tick(.25);
      if (session.frame.snapshot.tasks[0]?.status === 'delivered' && session.frame.snapshot.actors.find(actor => actor.id === 'zainab')!.goods === 1) break;
    }
    expect(session.frame.snapshot.actors.map(actor => actor.id)).toContain('chris');
    expect(session.frame.snapshot.tasks[0]).toMatchObject({recipient:'chris',status:'delivered'});
    const saved = JSON.parse(await readFile(checkpoint,'utf8'));
    const state = JSON.parse(saved.world);
    expect(state.npcs.chris.relationships.amina.successfulJobs).toBe(1);
    await session.close(); const restored = await NeighbourhoodServerSession.open({townPopulation:false,checkpoint}); sessions.push(restored);
    expect(restored.frame.snapshot.tasks).toEqual(session.frame.snapshot.tasks);
    expect(restored.frame.decisionBudget).toEqual(session.frame.decisionBudget);
    expect(restored.history('chris')).toEqual([]);
    expect(() => restored.history('invented')).toThrow('Unknown');
  }, 15_000);
  it('migrates a legacy three-resident world without erasing original state and saves a rollback copy', async () => {
    const checkpoint = join(await directory(),'legacy.json');
    const initial = await NeighbourhoodServerSession.open({townPopulation:false,checkpoint,initialWorld:new Neighbourhood('legacy',legacyResidents()).serialize()}); sessions.push(initial);
    await initial.decide('amina'); await initial.close();
    const envelope = JSON.parse(await readFile(checkpoint,'utf8')); const old = JSON.parse(envelope.world);
    old.version=1; delete old.social; delete old.initialGoods;
    for(const npc of Object.values(old.npcs) as Inhabitant[]) { npc.capabilities = npc.capabilities.filter(type => !['encounter','respond-encounter'].includes(type)); delete npc.mobility; }
    envelope.world=JSON.stringify(old); const legacy = JSON.stringify(envelope); await writeFile(checkpoint,legacy);
    const migrated = await NeighbourhoodServerSession.open({townPopulation:false,checkpoint}); sessions.push(migrated);
    expect(await readFile(checkpoint+'.v1-backup','utf8')).toBe(legacy);
    const after = JSON.parse(JSON.parse(await readFile(checkpoint,'utf8')).world);
    for(const id of ['amina','musa','zainab']) for(const field of ['name','occupation','memories','relationships','inventory','activity','node','intention']) expect(after.npcs[id][field]).toEqual(old.npcs[id][field]);
    expect(after.tasks).toEqual(old.tasks); expect(after.resources).toEqual(old.resources);
    expect(after.version).toBe(3); expect(migrated.hasResident('chris')).toBe(true);
    expect(migrated.frame.decisionBudget.used).toBe(envelope.requests);
  });
  it.each(['recipient','capacity','evidence'] as const)('rejects corrupt social/registry %s checkpoints', kind => {
    const world = colocated(); const item = invite(world); const state = world.snapshot;
    if(kind==='recipient') state.social.interactions[item.id]!.recipient='invented';
    if(kind==='capacity') state.npcs.chris!.capabilities.push('execute-code' as Action['type']);
    if(kind==='evidence') state.npcs.chris!.memories[0]!.eventId='invented';
    expect(() => Neighbourhood.restore(JSON.stringify(state))).toThrow('snapshot');
  });
});
