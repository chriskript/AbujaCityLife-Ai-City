import { edges, nodes } from '../world/neighbourhood.js';
import { initialState, places, maximumResidents } from './initial-state.js';
import { actionTypes, type WorldState } from './types.js';
import { placeCatalogue } from './knowledge.js';
import { quantityBounds, transportCapacity } from './action-limits.js';

import { assertTownEconomy } from './town-validation.js';
import { isResidentId } from './decision-schema.js';

function check(condition: unknown): asserts condition { if (!condition) throw new Error('Invalid neighbourhood snapshot'); }
const object = (value: unknown): boolean => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): boolean => Number.isSafeInteger(value) && Number(value) >= 0;
const text = (value: unknown, limit = 500): boolean => typeof value === 'string' && value.length > 0 && value.length <= limit;

export function assertSnapshot(value: unknown): asserts value is WorldState {
  check(object(value)); const state = value as WorldState;
  check(state.version === 3 && text(state.id, 120) && integer(state.revision) && Number.isFinite(state.time) && state.time >= 0);
  check(object(state.npcs) && Object.keys(state.npcs).length >= 3 && Object.keys(state.npcs).length <= maximumResidents && object(state.resources) && object(state.roads) && object(state.tasks) && object(state.triggers));
  const npcIds = Object.keys(state.npcs);
  check(npcIds.every(isResidentId) && ['amina','musa','zainab'].every(id => Object.hasOwn(state.npcs,id)));
  check(integer(state.initialGoods) && object(state.social));
  check([state.nextEvent, state.nextTask, state.nextRequest].every(item => Number.isSafeInteger(item) && item > 0));
  check(Array.isArray(state.events) && state.events.length <= Math.max(1100, 768 + npcIds.length * 24));
  const evidence = new Map<string, WorldState['events'][number]>();
  for (const event of state.events) {
    check(object(event) && text(event.id) && !evidence.has(event.id) && integer(event.revision) && event.revision <= state.revision && Number.isFinite(event.time) && event.time <= state.time);
    check(text(event.type) && text(event.subject) && text(event.detail, 1000) && object(event.data) && Array.isArray(event.audience) && event.audience.every(id => npcIds.includes(id)));
    check(event.actor === null || npcIds.includes(event.actor)); evidence.set(event.id, event);
    check(/^event-\d+$/.test(event.id) && Number(event.id.slice(6)) < state.nextEvent);
  }
  const baseline = initialState(state.id);
  for (const id of npcIds) {
    const npc = state.npcs[id]!; const profile = baseline.npcs[id]!;
    check(object(npc));
    check(npc.id === id && text(npc.name,80) && text(npc.occupation,120));
    check(Array.isArray(npc.personality) && npc.personality.length <= 12 && npc.personality.every(item => text(item,160)));
    check(Array.isArray(npc.goals) && npc.goals.length > 0 && npc.goals.length <= 12 && new Set(npc.goals.map(goal => goal.id)).size === npc.goals.length && npc.goals.every(goal => object(goal) && text(goal.id,120) && text(goal.description,240)));
    check(Array.isArray(npc.priorities) && npc.priorities.length <= 12 && npc.priorities.every(item => text(item,160)));
    check(Array.isArray(npc.capabilities) && new Set(npc.capabilities).size === npc.capabilities.length && npc.capabilities.every(type => actionTypes.includes(type)));
    if (['musa','amina','zainab'].includes(id)) {
      for (const key of ['id','name','occupation','personality','goals','priorities'] as const) check(JSON.stringify(npc[key]) === JSON.stringify(profile![key]));
      check(state.town ? profile.capabilities.every(type=>npc.capabilities.includes(type)) : JSON.stringify(npc.capabilities)===JSON.stringify(profile.capabilities));
    }
    check(npc.home === undefined || nodes.some(node => node.id === npc.home));
    check(npc.circumstances === undefined || text(npc.circumstances,500));
    check(npc.mobility === undefined || ['walk','taxi'].includes(npc.mobility));
    check(nodes.some(node => node.id === npc.node) && integer(npc.revision) && object(npc.inventory) && integer(npc.inventory.goods) && integer(npc.inventory.rewards));
    check(object(npc.needs) && Object.keys(npc.needs).sort().join(',') === (state.town ? 'food,income,rest,stock' : 'food,income,stock') && Object.values(npc.needs).every(need => Number.isFinite(need) && need >= 0 && need <= 1));
    check(npc.intention === null || object(npc.intention) && npc.goals.some(goal => goal.id === npc.intention?.goalId) && text(npc.intention.reason, 400));
    check(object(npc.knowledge) && Array.isArray(npc.knowledge.places) && npc.knowledge.places.every(place => places.some(item => item.id === place)));
    if (npc.knowledge.placeFacts !== undefined) {
      check(object(npc.knowledge.placeFacts));
      for (const [place, facts] of Object.entries(npc.knowledge.placeFacts)) {
        const definition = placeCatalogue[place];
        check(npc.knowledge.places.includes(place) && definition && object(facts) && facts.source === 'established' && typeof facts.complete === 'boolean');
        check(Array.isArray(facts.services) && facts.services.every(service => definition.services.includes(service)) && Array.isArray(facts.products) && facts.products.every(product => definition.products.includes(product)));
        if (facts.complete) check(JSON.stringify(facts) === JSON.stringify(definition));
      }
    }
    check(Array.isArray(npc.knowledge.people) && npc.knowledge.people.every(person => npcIds.includes(person) && person !== id));
    check(npc.knowledge.transporters === undefined || Array.isArray(npc.knowledge.transporters) && npc.knowledge.transporters.every(person => npc.knowledge.people.includes(person)));
    check(Array.isArray(npc.knowledge.blockedEdges) && npc.knowledge.blockedEdges.every(edge => edges.some(item => item.id === edge)) && object(npc.knowledge.tasks) && object(npc.knowledge.resources));
    for (const amount of [npc.knowledge.resources.supplierGoods, npc.knowledge.resources.marketGoods]) check(amount === null || integer(amount));
    check(npc.knowledge.resources.salesOpen === null || typeof npc.knowledge.resources.salesOpen === 'boolean');
    check(object(npc.relationships));
    for (const [other, relationship] of Object.entries(npc.relationships)) check(npcIds.includes(other as typeof npcIds[number]) && object(relationship) && relationship && integer(relationship.successfulJobs));
    check(Array.isArray(npc.memories) && npc.memories.length <= 24);
    for (const memory of npc.memories) {
      check(object(memory) && ['fact', 'observed', 'reported', 'belief', 'commitment', 'outcome'].includes(memory.kind));
      const event = evidence.get(memory.eventId);
      check(event && event.audience.includes(id) && memory.subject === event.subject && memory.detail === event.detail && memory.time === event.time && memory.id === `${event.id}:${id}`);
      check(['certain', 'uncertain'].includes(memory.certainty) && (memory.source === 'world' || memory.source === 'player' || npcIds.includes(memory.source)));
      check(memory.kind !== 'belief' || memory.certainty === 'uncertain');
    }
    check(object(npc.activity)); const activity = npc.activity;
    check(['idle', 'wait', 'work', 'travel'].includes(activity.kind));
    if (activity.kind === 'wait' || activity.kind === 'work') check(Number.isFinite(activity.until) && activity.until > state.time);
    if (activity.kind === 'travel') {
      check(object(activity.path) && Array.isArray(activity.path.nodeIds) && Array.isArray(activity.path.edgeIds));
      check(activity.path.nodeIds.length === activity.path.edgeIds.length + 1 && integer(activity.step) && activity.step < activity.path.edgeIds.length && activity.path.nodeIds[activity.step] === npc.node);
      let distance = 0;
      for (let step = 0; step < activity.path.edgeIds.length; step++) {
        const edge = edges.find(item => item.id === activity.path.edgeIds[step]);
        check(edge && ((edge.from === activity.path.nodeIds[step] && edge.to === activity.path.nodeIds[step + 1]) || (edge.to === activity.path.nodeIds[step] && edge.from === activity.path.nodeIds[step + 1])));
        distance += edge.distance;
      }
      const edge = edges.find(item => item.id === activity.path.edgeIds[activity.step])!;
      check(Number.isFinite(activity.progress) && activity.progress >= 0 && activity.progress < edge.distance && Math.abs(activity.path.distance - distance) < 0.001);
      check(activity.progress === 0 || !state.roads.blockedEdges.includes(edge.id));
      check(activity.taskId === null ? activity.leg === null : typeof activity.taskId === 'string' && ['pickup', 'delivery'].includes(activity.leg!));
    }
    const triggers = state.triggers[id]; check(triggers === undefined || Array.isArray(triggers) && triggers.length <= 8 && triggers.every(item => text(item)));
  }
  check(Object.keys(state.triggers).every(id => npcIds.includes(id as typeof npcIds[number])));
  check(integer(state.resources.supplierGoods) && integer(state.resources.marketGoods) && integer(state.resources.revision) && typeof state.resources.salesOpen === 'boolean');
  check(integer(state.roads.revision) && Array.isArray(state.roads.blockedEdges) && state.roads.blockedEdges.every(id => edges.some(edge => edge.id === id)));
  check(Object.keys(state.tasks).length <= 64);
  for (const [key, task] of Object.entries(state.tasks)) {
    check(object(task) && task.id === key && /^task-\d+$/.test(key) && Number(key.slice(5)) < state.nextTask && integer(task.revision));
    check(npcIds.includes(task.requester) && npcIds.includes(task.recipient) && task.requester !== task.recipient && task.pickup === 'centre' && task.destination === 'market');
    check(state.npcs[task.requester]!.capabilities.includes('propose-transport') && state.npcs[task.recipient]!.capabilities.includes('fulfil-transport') && state.npcs[task.recipient]!.capabilities.includes('respond-transport'));
    check(Number.isSafeInteger(task.quantity) && task.quantity >= quantityBounds.minimum && task.quantity <= quantityBounds.maximum && ['proposed', 'accepted', 'declined', 'collected', 'delivered', 'expired'].includes(task.status));
    check(task.reserved === (task.status === 'accepted' ? task.quantity : 0) && task.rewardPaid === (task.status === 'delivered') && Number.isFinite(task.expiresAt));
  }
  for (const id of npcIds) {
    const npc = state.npcs[id]!;
    for (const [key, status] of Object.entries(npc.knowledge.tasks)) check(state.tasks[key] && (state.tasks[key]!.requester === id || state.tasks[key]!.recipient === id) && ['proposed', 'accepted', 'declined', 'collected', 'delivered', 'expired'].includes(status));
    if (npc.activity.kind === 'travel' && npc.activity.taskId !== null) {
      const task = state.tasks[npc.activity.taskId];
      check(task && task.recipient === id && task.status === (npc.activity.leg === 'pickup' ? 'accepted' : 'collected'));
    }
  }
  const tasks = Object.values(state.tasks);
  for (const id of npcIds) {
    const npc = state.npcs[id]!;
    check(tasks.filter(task => task.recipient === id && ['accepted','collected'].includes(task.status)).length <= 1);
    check(tasks.filter(task => task.requester === id && ['proposed','accepted','collected'].includes(task.status)).length <= 1);
    const cargo = tasks.filter(task => task.recipient === id && task.status === 'collected').reduce((sum,task) => sum + task.quantity,0);
    check(cargo <= transportCapacity && npc.inventory.goods >= cargo);
    check(npc.inventory.rewards === tasks.filter(task => task.recipient === id && task.status === 'delivered').length);
  }
  check(state.resources.supplierGoods >= tasks.reduce((total, task) => total + task.reserved, 0));
  check(state.resources.supplierGoods + state.resources.marketGoods + npcIds.reduce((total, id) => total + state.npcs[id]!.inventory.goods, 0) === state.initialGoods + (state.town?.produced ?? 0) - (state.town?.consumed ?? 0));
  assertTownEconomy(state);
  const social = state.social;
  check(Number.isSafeInteger(social.nextInteraction) && social.nextInteraction > 0 && object(social.interactions) && Object.keys(social.interactions).length <= 128 && object(social.noticed) && object(social.cooldowns));
  for (const map of [social.noticed,social.cooldowns]) {
    check(Object.keys(map).length <= maximumResidents * maximumResidents);
    for (const [key,time] of Object.entries(map)) {
      const pair = key.split(':');
      check(pair.length === 2 && pair[0]! < pair[1]! && pair.every(id => npcIds.includes(id)) && Number.isFinite(time) && time >= 0);
    }
  }
  const pending = new Set<string>();
  for (const [key,item] of Object.entries(social.interactions)) {
    check(object(item) && item.id === key && /^encounter-\d+$/.test(key) && Number(key.slice(10)) < social.nextInteraction);
    check(npcIds.includes(item.initiator) && npcIds.includes(item.recipient) && item.initiator !== item.recipient);
    check(['introduce','ask','request-help'].includes(item.purpose) && text(item.message,160) && (item.response === null || text(item.response,160)));
    check(['pending','accepted','declined','deferred','clarified','expired'].includes(item.status));
    check(Number.isFinite(item.createdAt) && item.createdAt >= 0 && item.createdAt <= state.time && item.expiresAt === item.createdAt + 90);
    check(item.status === 'pending' ? item.response === null && item.expiresAt > state.time : item.status === 'expired' ? item.response === null : item.response !== null);
    if (item.status === 'pending') {
      check(!pending.has(item.initiator) && !pending.has(item.recipient)); pending.add(item.initiator); pending.add(item.recipient);
    }
  }
}

// Explicit shape migration: identities, inventories, tasks, relationships, memories,
// accounting IDs and historical evidence are retained. No new resident is invented here.
export function migrateSnapshot(value: unknown): unknown {
  if (!object(value) || ![1,2].includes((value as {version:number}).version)) return value;
  if ((value as {version:number}).version === 2) return {...structuredClone(value as Record<string,unknown>),version:3};
  const state = structuredClone(value) as WorldState;
  check(object(state.npcs) && Object.keys(state.npcs).sort().join(',') === 'amina,musa,zainab');
  state.version = 3; state.initialGoods = 9;
  state.social = { nextInteraction: 1, interactions: {}, noticed: {}, cooldowns: {} };
  for (const npc of Object.values(state.npcs)) {
    check(object(npc) && Array.isArray(npc.capabilities));
    npc.capabilities = [...npc.capabilities,'encounter','respond-encounter'];
    npc.mobility = npc.id === 'musa' ? 'taxi' : 'walk';
    if (npc.knowledge.transporters === undefined) npc.knowledge.transporters = npc.knowledge.people.includes('musa') ? ['musa'] : [];
  }
  return state;
}
