import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { DecisionScheduler } from '../shared/neighbourhood/scheduler.js';
import { NeighbourhoodMockProvider } from '../shared/neighbourhood/mock-provider.js';
import { runNeighbourhoodDemo } from '../shared/neighbourhood/scenario.js';
import { isNpcDecision, npcDecisionSchema } from '../shared/neighbourhood/decision-schema.js';
import { loadNeighbourhood, saveNeighbourhood } from '../server/persistence/neighbourhood-store.js';
import type { Action, NpcDecisionProvider, NpcId, NpcInferenceResult } from '../shared/neighbourhood/types.js';

const mock = { mode: 'mock', model: 'test-fixture' } as const;
function decide(world: Neighbourhood, actor: NpcId, action: Action, expected = true) {
  const request = world.requestDecision(actor);
  expect(request, `No decision trigger for ${actor}`).not.toBeNull();
  const decision = { goalId: world.snapshot.npcs[actor].goals[0]!.id, reason: 'MOCK test choice.', action };
  const result = world.applyDecision(request!.id, decision, mock);
  expect(result.accepted, result.reason).toBe(expected);
  return { request: request!, decision, result };
}
function propose(world: Neighbourhood) {
  decide(world, 'amina', { type: 'travel', destination: 'stand' }); world.advance(20);
  decide(world, 'amina', { type: 'propose-transport', recipient: 'musa', quantity: 2 });
  return Object.values(world.snapshot.tasks)[0]!;
}
function accept(world: Neighbourhood) {
  const task = propose(world);
  decide(world, 'musa', { type: 'respond-transport', taskId: task.id, accept: true });
  return task;
}
function delivered(world: Neighbourhood) {
  const task = accept(world);
  decide(world, 'amina', { type: 'travel', destination: 'market' });
  const request = decide(world, 'musa', { type: 'fulfil-transport', taskId: task.id });
  world.advance(6); return { task, ...request };
}
function totalGoods(world: Neighbourhood) {
  const state = world.snapshot;
  return state.resources.supplierGoods + state.resources.marketGoods + Object.values(state.npcs).reduce((sum, npc) => sum + npc.inventory.goods, 0);
}

describe('independent state and scoped knowledge', () => {
  it('has three identities, distinct personal goals, and isolated world instances', () => {
    const first = new Neighbourhood(); const second = new Neighbourhood();
    expect(Object.values(first.snapshot.npcs).map(npc => npc.name)).toEqual(['Musa', 'Amina', 'Zainab']);
    expect(first.snapshot.npcs.musa.goals[0]!.id).not.toBe(first.snapshot.npcs.amina.goals[0]!.id);
    expect(first.snapshot.npcs.zainab.goals[0]!.id).toBe('food');
    const exported = first.snapshot; exported.npcs.amina.node = 'stand';
    expect(first.snapshot.npcs.amina.node).toBe('market');
    first.setRoadBlocked('centre-market', true);
    expect(second.snapshot.roads.blockedEdges).toEqual([]);
  });

  it('does not disclose private needs, distant stock, unknown people, or unknown destinations', () => {
    const world = new Neighbourhood(); const resident = world.observe('zainab');
    expect(resident.resources.marketGoods).toBeNull();
    expect(resident.resources.supplierGoods).toBe(8); // Resident is physically at the desk.
    expect(resident.places.map(place => place.id)).toEqual(['market', 'centre']);
    expect(resident.actor.knowledge.people).toEqual(['amina']);
    expect(JSON.stringify(resident)).not.toContain('avoid overload');
    expect(world.observe('musa').resources.supplierGoods).toBeNull();
    expect(world.observe('amina').resources.marketGoods).toBe(1);
  });

  it('does not reveal remote closures until they are locally observable', () => {
    const world = new Neighbourhood();
    world.setRoadBlocked('hill-overlook', true);
    expect(world.observe('zainab').knownBlockedEdges).toEqual([]);
    expect(world.observe('musa').knownBlockedEdges).toEqual([]);
    expect(world.snapshot.roads.blockedEdges).toContain('hill-overlook');
  });

  it('rejects travel to unknown places and actions outside capability', () => {
    const world = new Neighbourhood();
    expect(decide(world, 'zainab', { type: 'travel', destination: 'hill' }, false).result.reason).toBe('unknown-place');
    expect(decide(world, 'musa', { type: 'set-sales', open: false }, false).result.reason).toBe('missing-capability');
  });

  it('does not disclose a delivery to the absent trader until she returns to the stall', () => {
    const world = new Neighbourhood(); const task = accept(world);
    decide(world, 'musa', { type: 'fulfil-transport', taskId: task.id }); world.advance(6);
    expect(world.snapshot.tasks[task.id]!.status).toBe('delivered');
    expect(world.observe('amina').tasks[0]!.status).toBe('accepted');
    expect(world.observe('amina').resources.marketGoods).toBe(1);
    expect(world.observe('amina').actor.memories.some(memory => memory.kind === 'outcome' && memory.subject === task.id)).toBe(false);
    decide(world, 'amina', { type: 'travel', destination: 'market' }); world.advance(20);
    expect(world.observe('amina').tasks[0]!.status).toBe('delivered');
    expect(world.observe('amina').resources.marketGoods).toBe(3);
    expect(world.observe('amina').actor.memories.some(memory => memory.kind === 'outcome' && memory.subject === task.id)).toBe(true);
  });
});

describe('validated independent cooperation', () => {
  it('requires proximity for proposals and never accepts on the recipient’s behalf', () => {
    const far = new Neighbourhood();
    expect(decide(far, 'amina', { type: 'propose-transport', recipient: 'musa', quantity: 2 }, false).result.reason).toBe('recipient-not-nearby');
    const world = new Neighbourhood(); const task = propose(world);
    expect(world.snapshot.tasks[task.id]!.status).toBe('proposed');
    expect(world.snapshot.tasks[task.id]!.reserved).toBe(0);
    expect(world.snapshot.npcs.musa.intention).toBeNull();
  });

  it('permits an independent refusal without stock transfers, reservations, or rewards', () => {
    const world = new Neighbourhood(); const task = propose(world);
    decide(world, 'musa', { type: 'respond-transport', taskId: task.id, accept: false });
    expect(world.snapshot.tasks[task.id]!.status).toBe('declined');
    expect(world.snapshot.tasks[task.id]!.reserved).toBe(0);
    expect(world.snapshot.resources.supplierGoods).toBe(8);
    expect(world.snapshot.npcs.musa.inventory.rewards).toBe(0);
  });

  it('moves goods only on physical collection and delivery', () => {
    const world = new Neighbourhood(); const task = accept(world);
    expect(world.snapshot.resources).toMatchObject({ supplierGoods: 8, marketGoods: 1 });
    expect(world.snapshot.tasks[task.id]!.reserved).toBe(2);
    decide(world, 'musa', { type: 'fulfil-transport', taskId: task.id });
    world.advance(2);
    expect(world.snapshot.npcs.musa.node).toBe('stand');
    expect(world.snapshot.resources.supplierGoods).toBe(8);
    world.advance(1);
    expect(world.snapshot.tasks[task.id]!.status).toBe('collected');
    expect(world.snapshot.npcs.musa.node).toBe('centre');
    expect(world.snapshot.npcs.musa.inventory.goods).toBe(2);
    expect(world.snapshot.resources).toMatchObject({ supplierGoods: 6, marketGoods: 1 });
    world.advance(3);
    expect(world.snapshot.tasks[task.id]!.status).toBe('delivered');
    expect(world.snapshot.npcs.musa.node).toBe('market');
    expect(world.snapshot.resources.marketGoods).toBe(3);
    expect(world.snapshot.npcs.musa.inventory).toEqual({ goods: 0, rewards: 1 });
    expect(totalGoods(world)).toBe(9);
  });

  it('deduplicates accepted requests and rejects fresh attempts to deliver a completed task', () => {
    const world = new Neighbourhood(); const { task, request, decision } = delivered(world);
    const before = world.serialize();
    expect(world.applyDecision(request.id, decision, mock)).toMatchObject({ accepted: true, duplicate: true });
    expect(world.serialize()).toBe(before);
    expect(decide(world, 'musa', { type: 'fulfil-transport', taskId: task.id }, false).result.reason).toBe('task-not-active');
    expect(world.snapshot.npcs.musa.inventory.rewards).toBe(1);
    expect(world.snapshot.resources.marketGoods).toBe(3);
  });

  it('rejects missing cargo and negative, fractional, or excessive quantities', () => {
    const world = new Neighbourhood();
    expect(decide(world, 'amina', { type: 'stock-stall', quantity: 1 }, false).result.reason).toBe('missing-goods');
    for (const quantity of [-1, 0, 0.5, 7, Infinity]) {
      const next = new Neighbourhood(); const request = next.requestDecision('zainab')!;
      expect(next.applyDecision(request.id, { goalId: 'food', reason: 'Test', action: { type: 'buy', quantity } }, mock).reason).toBe('invalid-schema');
      expect(totalGoods(next)).toBe(9);
    }
  });

  it('prevents collection of supplies reserved for the driver', () => {
    const world = new Neighbourhood();
    decide(world, 'amina', { type: 'travel', destination: 'stand' }); world.advance(20);
    decide(world, 'amina', { type: 'propose-transport', recipient: 'musa', quantity: 6 });
    decide(world, 'musa', { type: 'respond-transport', taskId: 'task-1', accept: true });
    decide(world, 'amina', { type: 'travel', destination: 'centre' }); world.advance(10);
    decide(world, 'amina', { type: 'collect-self', quantity: 2 });
    const state = world.snapshot;
    expect(state.resources.supplierGoods).toBe(6); expect(state.tasks['task-1']!.reserved).toBe(6);
    expect(decide(world, 'amina', { type: 'collect-self', quantity: 1 }, false).result.reason).toBe('carrying-capacity');
    decide(world, 'musa', { type: 'fulfil-transport', taskId: 'task-1' }); world.advance(6);
    expect(world.snapshot.resources.supplierGoods).toBe(0); expect(totalGoods(world)).toBe(9);
  });

  it('expires unaccepted proposals and invalidates a pending acceptance', () => {
    const world = new Neighbourhood(); const task = propose(world);
    const request = world.requestDecision('musa')!;
    world.advance(60); world.advance(31);
    expect(world.snapshot.tasks[task.id]!.status).toBe('expired');
    expect(world.applyDecision(request.id, { goalId: 'earn', reason: 'Late acceptance', action: { type: 'respond-transport', taskId: task.id, accept: true } }, mock).reason).toBe('stale-actor');
    expect(world.snapshot.tasks[task.id]!.reserved).toBe(0);
  });

  it('stops before a blocked delivery edge, preserving cargo for a new decision and detour', () => {
    const world = new Neighbourhood(); const task = accept(world);
    decide(world, 'musa', { type: 'fulfil-transport', taskId: task.id }); world.advance(3);
    expect(world.setRoadBlocked('centre-market', true)).toBe(true);
    world.advance(0.25);
    expect(world.snapshot.npcs.musa.node).toBe('centre');
    expect(world.snapshot.tasks[task.id]!.status).toBe('collected');
    expect(world.snapshot.npcs.musa.inventory.goods).toBe(2);
    expect(world.snapshot.events.some(event => event.type === 'action-failed')).toBe(true);
    decide(world, 'musa', { type: 'fulfil-transport', taskId: task.id }); world.advance(12);
    expect(world.snapshot.tasks[task.id]!.status).toBe('delivered');
    expect(world.snapshot.events.filter(event => event.type === 'edge-executed' && event.actor === 'musa').map(event => event.subject)).not.toContain('centre-market');
  });

  it('refuses to remove an occupied road', () => {
    const world = new Neighbourhood(); decide(world, 'musa', { type: 'travel', destination: 'centre' }); world.advance(1);
    expect(world.setRoadBlocked('stand-centre', true)).toBe(false);
    expect(world.snapshot.roads.blockedEdges).toEqual([]);
  });

  it('rejects a purchase exceeding actual stock and prevents a negative inventory', () => {
    const world = new Neighbourhood();
    decide(world, 'zainab', { type: 'travel', destination: 'market' }); world.advance(10);
    expect(decide(world, 'zainab', { type: 'buy', quantity: 2 }, false).result.reason).toBe('insufficient-stock');
    expect(world.snapshot.resources.marketGoods).toBe(1);
    expect(world.snapshot.npcs.zainab.inventory.goods).toBe(0);
  });

  it('rejects a new transport proposal when supplies have actually been exhausted', () => {
    const world = new Neighbourhood();
    for (let trip = 0; trip < 4; trip++) {
      decide(world, 'amina', { type: 'travel', destination: 'centre' }); world.advance(10);
      decide(world, 'amina', { type: 'collect-self', quantity: 2 });
      decide(world, 'amina', { type: 'travel', destination: 'market' }); world.advance(10);
      decide(world, 'amina', { type: 'stock-stall', quantity: 2 });
    }
    decide(world, 'amina', { type: 'travel', destination: 'stand' }); world.advance(20);
    expect(decide(world, 'amina', { type: 'propose-transport', recipient: 'musa', quantity: 2 }, false).result.reason).toBe('insufficient-supplies');
    expect(world.snapshot.resources.supplierGoods).toBe(0); expect(totalGoods(world)).toBe(9);
  });

  it('rechecks proximity when an offer is answered and the requester has walked away', () => {
    const world = new Neighbourhood(); const task = propose(world);
    const request = world.requestDecision('musa')!;
    decide(world, 'amina', { type: 'travel', destination: 'market' }); world.advance(1);
    const result = world.applyDecision(request.id, { goalId: 'earn', reason: 'Try to accept', action: { type: 'respond-transport', taskId: task.id, accept: true } }, mock);
    expect(result.accepted).toBe(false); expect(result.reason).toBe('requester-not-nearby');
    expect(world.snapshot.tasks[task.id]!.status).toBe('proposed');
  });

  it('rejects stale actor decisions while allowing unrelated world changes', () => {
    const world = new Neighbourhood(); const request = world.requestDecision('musa')!;
    decide(world, 'amina', { type: 'work', seconds: 10 });
    expect(world.applyDecision(request.id, { goalId: 'earn', reason: 'Wait', action: { type: 'wait', seconds: 10 } }, mock).accepted).toBe(true);
    const changed = new Neighbourhood(); const old = changed.requestDecision('musa')!;
    changed.setRoadBlocked('stand-centre', true);
    expect(changed.applyDecision(old.id, { goalId: 'earn', reason: 'Go', action: { type: 'travel', destination: 'centre' } }, mock).reason).toBe('stale-actor');
    expect(changed.snapshot.npcs.musa.activity.kind).toBe('idle');
  });
});

describe('event-derived memories and persistence', () => {
  it('keeps information reports and uncertainty separate from authoritative facts', () => {
    const world = new Neighbourhood(); decide(world, 'zainab', { type: 'travel', destination: 'market' }); world.advance(10);
    const memory = world.observe('amina').actor.memories.find(item => item.subject === 'market')!;
    const resources = world.snapshot.resources;
    decide(world, 'amina', { type: 'share', recipient: 'zainab', memoryId: memory.id, asBelief: false });
    expect(world.observe('zainab').actor.memories.at(-1)).toMatchObject({ kind: 'reported', source: 'amina', certainty: 'certain' });
    expect(world.snapshot.resources).toEqual(resources);
    decide(world, 'amina', { type: 'share', recipient: 'zainab', memoryId: memory.id, asBelief: true });
    const belief = world.observe('zainab').actor.memories.at(-1)!;
    expect(belief).toMatchObject({ kind: 'belief', certainty: 'uncertain' });
    decide(world, 'zainab', { type: 'share', recipient: 'amina', memoryId: belief.id, asBelief: false });
    expect(world.observe('amina').actor.memories.at(-1)).toMatchObject({ kind: 'belief', source: 'zainab', certainty: 'uncertain' });
  });

  it('rejects invented memory references', () => {
    const world = new Neighbourhood(); decide(world, 'zainab', { type: 'travel', destination: 'market' }); world.advance(10);
    expect(decide(world, 'amina', { type: 'share', recipient: 'zainab', memoryId: 'invented-memory', asBelief: false }, false).result.reason).toBe('unknown-memory');
  });

  it('derives commitments and verified outcomes from actual task transitions', () => {
    const world = new Neighbourhood(); const task = accept(world);
    expect(world.observe('amina').actor.memories.some(memory => memory.kind === 'commitment' && memory.subject === task.id)).toBe(true);
    decide(world, 'amina', { type: 'travel', destination: 'market' }); world.advance(20);
    decide(world, 'musa', { type: 'fulfil-transport', taskId: task.id }); world.advance(6);
    for (const id of ['amina', 'musa'] as const) {
      const memories = world.observe(id).actor.memories;
      expect(memories.some(memory => memory.kind === 'outcome' && memory.subject === task.id)).toBe(true);
      expect(memories.some(memory => memory.kind === 'commitment' && memory.subject === task.id)).toBe(false);
      expect(memories.every(memory => world.snapshot.events.some(event => event.id === memory.eventId))).toBe(true);
    }
    expect(world.snapshot.npcs.amina.relationships.musa?.successfulJobs).toBe(1);
  });

  it('bounds memory and retains evidence for persistent entries', () => {
    const world = new Neighbourhood(); decide(world, 'zainab', { type: 'travel', destination: 'market' }); world.advance(10);
    const memory = world.observe('amina').actor.memories[0]!;
    for (let index = 0; index < 550; index++) decide(world, 'amina', { type: 'share', recipient: 'zainab', memoryId: memory.id, asBelief: false });
    expect(world.observe('zainab').actor.memories).toHaveLength(24);
    expect(world.snapshot.events.length).toBeLessThanOrEqual(1100);
    expect(() => Neighbourhood.restore(world.serialize())).not.toThrow();
  });

  it('preserves outcomes on restoration and rejects old pending request tokens', () => {
    const world = new Neighbourhood(); delivered(world);
    const pending = world.requestDecision('musa')!;
    const restored = Neighbourhood.restore(world.serialize());
    expect(restored.observe('musa').actor.memories).toEqual(world.observe('musa').actor.memories);
    expect(restored.snapshot.tasks['task-1']!.status).toBe('delivered');
    expect(restored.applyDecision(pending.id, { goalId: 'earn', reason: 'Replay', action: { type: 'wait', seconds: 1 } }, mock).reason).toBe('unknown-request');
    expect(decide(restored, 'musa', { type: 'fulfil-transport', taskId: 'task-1' }, false).result.reason).toBe('task-not-active');
    expect(restored.snapshot.npcs.musa.inventory.rewards).toBe(1);
  });

  it('resumes a moving accepted job from a checkpoint without repeating transfers', () => {
    const world = new Neighbourhood(); const task = accept(world);
    decide(world, 'musa', { type: 'fulfil-transport', taskId: task.id }); world.advance(4);
    expect(world.snapshot.tasks[task.id]!.status).toBe('collected');
    const restored = Neighbourhood.restore(world.serialize()); restored.advance(3);
    expect(restored.snapshot.tasks[task.id]!.status).toBe('delivered');
    expect(restored.snapshot.resources).toMatchObject({ supplierGoods: 6, marketGoods: 3 });
    expect(restored.snapshot.npcs.musa.inventory).toEqual({ goods: 0, rewards: 1 });
    expect(totalGoods(restored)).toBe(9);
  });

  it('requeues a waiting actor after restoration instead of losing a pending offer decision', () => {
    const world = new Neighbourhood(); decide(world, 'musa', { type: 'wait', seconds: 120 });
    propose(world); const pending = world.requestDecision('musa')!;
    expect(pending.observation.tasks[0]!.status).toBe('proposed');
    const restored = Neighbourhood.restore(world.serialize()); const replacement = restored.requestDecision('musa')!;
    expect(replacement.id).not.toBe(pending.id);
    expect(replacement.observation.tasks[0]!.status).toBe('proposed');
    expect(restored.applyDecision(replacement.id, { goalId: 'earn', reason: 'Accept after restoring', action: { type: 'respond-transport', taskId: 'task-1', accept: true } }, mock).accepted).toBe(true);
  });

  it.each(['stock', 'memory', 'path'])('fails closed on corrupt %s checkpoints', kind => {
    const world = new Neighbourhood();
    if (kind === 'path') decide(world, 'musa', { type: 'travel', destination: 'centre' });
    const state = world.snapshot;
    if (kind === 'stock') state.resources.supplierGoods = -1;
    if (kind === 'memory') state.npcs.musa.memories[0]!.eventId = 'invented';
    if (kind === 'path' && state.npcs.musa.activity.kind === 'travel') state.npcs.musa.activity.path.edgeIds[0] = 'imaginary';
    expect(() => Neighbourhood.restore(JSON.stringify(state))).toThrow('Invalid neighbourhood snapshot');
  });
});

describe('event-driven autonomy with alternative fixture policies', () => {
  it('starts three distinct activities without player commands and does not infer on every tick', async () => {
    const world = new Neighbourhood(); const fixture = new NeighbourhoodMockProvider();
    const decideSpy = vi.fn((request: Parameters<NpcDecisionProvider['decide']>[0]) => fixture.decide(request));
    const scheduler = new DecisionScheduler(world, { decide: decideSpy });
    await scheduler.pump(); await scheduler.pump(); await scheduler.pump();
    expect(Object.values(world.snapshot.npcs).every(npc => npc.intention !== null && npc.activity.kind !== 'idle')).toBe(true);
    for (let tick = 0; tick < 20; tick++) { world.advance(0.25); await scheduler.pump(); }
    expect(decideSpy).toHaveBeenCalledTimes(3);
    expect(world.snapshot.npcs.zainab.activity.kind).toBe('travel');
  });

  it.each([
    { trader: 'cooperate', driver: 'accept' }, { trader: 'cooperate', driver: 'decline' },
    { trader: 'self-collect', driver: 'accept' }, { trader: 'wait', driver: 'accept' },
    { trader: 'reduce-sales', driver: 'accept' },
  ] as const)('supports valid alternative outcomes: %j', async choices => {
    const world = await runNeighbourhoodDemo(choices); const state = world.snapshot;
    expect(state.events.filter(event => event.type === 'action-validated').every(event => event.data.accepted)).toBe(true);
    if (choices.trader === 'cooperate') expect(state.tasks['task-1']!.status).toBe(choices.driver === 'accept' ? 'delivered' : 'declined');
    if (choices.trader === 'self-collect') expect(state.events.some(event => event.type === 'stock-stall')).toBe(true);
    if (choices.trader === 'reduce-sales') expect(state.resources.salesOpen).toBe(false);
    if (choices.trader === 'wait') expect(state.npcs.amina.activity.kind).toBe('wait');
    expect(totalGoods(world)).toBe(9);
    expect(() => Neighbourhood.restore(world.serialize())).not.toThrow();
  });

  it('limits concurrency and does not retry failed inference', async () => {
    let finish!: (value: NpcInferenceResult) => void;
    const decideSpy = vi.fn<NpcDecisionProvider['decide']>(() => new Promise(resolve => { finish = resolve; }));
    const scheduler = new DecisionScheduler(new Neighbourhood(), { decide: decideSpy });
    const first = scheduler.pump(); expect(await scheduler.pump()).toBe(false);
    expect(decideSpy).toHaveBeenCalledTimes(1);
    finish({ ...mock, decision: { goalId: 'earn', reason: 'Wait', action: { type: 'wait', seconds: 120 } } }); await first;
    const failing = vi.fn<NpcDecisionProvider['decide']>(async () => { throw new Error('private transport error'); });
    const world = new Neighbourhood(); const failed = new DecisionScheduler(world, { decide: failing }, { cooldownSeconds: 0, perMinute: 10, maximumDecisions: 10 });
    for (let index = 0; index < 6; index++) await failed.pump();
    expect(failing).toHaveBeenCalledTimes(3);
    expect(world.serialize()).not.toContain('private transport error');
    expect(Object.values(world.snapshot.npcs).every(npc => npc.activity.kind === 'idle')).toBe(true);
  });

  it('honours global request ceilings', async () => {
    const scheduler = new DecisionScheduler(new Neighbourhood(), new NeighbourhoodMockProvider(), { cooldownSeconds: 0, perMinute: 1, maximumDecisions: 1 });
    expect(await scheduler.pump()).toBe(true); expect(await scheduler.pump()).toBe(false);
    scheduler.world.advance(60); expect(await scheduler.pump()).toBe(false);
    expect(scheduler.decisionCount).toBe(1);
  });

  it('rejects extra action fields and provides a strict schema for future Meta integration', () => {
    expect(isNpcDecision({ goalId: 'restock', reason: 'Delivered', action: { type: 'wait', seconds: 1, marketGoods: 999 } })).toBe(false);
    expect(npcDecisionSchema.additionalProperties).toBe(false);
    expect(npcDecisionSchema.properties.action.anyOf.length).toBe(12);
  });
});

const temporaryDirectories: string[] = [];
afterEach(async () => {
  // All paths come directly from mkdtemp under the OS temporary directory.
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});
it('writes and reloads a real local checkpoint including memories and completed consequences', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ai-city-neighbourhood-')); temporaryDirectories.push(directory);
  const path = join(directory, 'world.json'); const world = await runNeighbourhoodDemo();
  await saveNeighbourhood(path, world); const restored = await loadNeighbourhood(path);
  expect(restored.snapshot.npcs.amina.memories).toEqual(world.snapshot.npcs.amina.memories);
  expect(restored.snapshot.resources).toEqual(world.snapshot.resources);
  expect(restored.snapshot.npcs.musa.inventory.rewards).toBe(1);
  expect(await readFile(path, 'utf8')).not.toContain('MODEL_API_KEY');
});
