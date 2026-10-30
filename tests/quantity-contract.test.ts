import { describe, expect, it } from 'vitest';
import { isNpcDecision, npcDecisionSchema } from '../shared/neighbourhood/decision-schema.js';
import { conversationSchema } from '../server/inference/neighbourhood-provider.js';
import { prepareAutonomyFixture } from '../server/evaluation/autonomy-probe.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import type { Action, NpcId, WorldState } from '../shared/neighbourhood/types.js';

const provenance = { mode: 'mock', model: 'offline-contract-fixture' } as const;
const quantityActions = ['propose-transport', 'collect-self', 'stock-stall', 'buy'] as const;
const proposal = (type: typeof quantityActions[number], quantity: unknown) => ({
  goalId: type === 'buy' ? 'food' : 'restock', reason: 'Offline quantity boundary',
  action: { type, quantity, ...(type === 'propose-transport' ? { recipient: 'musa' } : {}) },
});
function apply(world: Neighbourhood, id: NpcId, action: Action) {
  const request = world.requestInteractionDecision(id)!;
  return world.applyDecision(request.id, { goalId: request.observation.actor.goals[0]!.id, reason: 'Offline setup', action }, provenance);
}
// Failed attempts may append audit events and advance their counters/revision.
// All gameplay state, including intentions, memories and commitments, must match.
function gameplay({ events: _events, revision: _revision, nextEvent: _nextEvent, ...state }: WorldState) { return state; }

describe('Milestone 6C quantity contract', () => {
  it.each(quantityActions)('exports integer bounds matching the runtime guard for %s', type => {
    const branch = npcDecisionSchema.properties.action.anyOf.find(branch => branch.properties.type.enum[0] === type)!;
    const schema = (branch.properties as unknown as { quantity: { type: string; minimum: number; maximum: number } }).quantity;
    expect(schema).toEqual({ type: 'integer', minimum: 1, maximum: 6 });
    for (const quantity of [-1, 0, 0.5, 1, 2, 6, 7, 8, NaN, Infinity, '2', null, undefined]) {
      const schemaAccepts = typeof quantity === 'number' && Number.isInteger(quantity) && quantity >= schema.minimum && quantity <= schema.maximum;
      expect(isNpcDecision(proposal(type, quantity)), `quantity ${String(quantity)}`).toBe(schemaAccepts);
    }
    const nested = conversationSchema.properties.proposedDecision.anyOf[0] as typeof npcDecisionSchema;
    expect(nested.properties.action.anyOf).toEqual(npcDecisionSchema.properties.action.anyOf);
  });

  it.each(quantityActions)('rejects invalid %s quantities without gameplay mutations or repeat effects', type => {
    for (const quantity of [-1, 0, 0.5, 7, 8, NaN, Infinity, '2', null, undefined]) {
      const world = prepareAutonomyFixture();
      const id = type === 'buy' ? 'zainab' : 'amina';
      const request = world.requestInteractionDecision(id)!;
      const before = world.snapshot;
      const decision = proposal(type, quantity);
      expect(world.applyDecision(request.id, decision, provenance)).toMatchObject({ accepted: false, reason: 'invalid-schema' });
      expect(gameplay(world.snapshot)).toEqual(gameplay(before));
      expect(world.snapshot.events.slice(before.events.length).map(event => event.type)).toEqual(['action-proposed', 'action-validated']);
      const rejected = world.serialize();
      expect(world.applyDecision(request.id, decision, provenance)).toMatchObject({ accepted: false, duplicate: true });
      expect(world.serialize()).toBe(rejected);
    }
  });

  it.each([1, 6])('executes a boundary transport quantity of %i and preserves goods through restoration', quantity => {
    const world = prepareAutonomyFixture();
    expect(apply(world, 'amina', { type: 'propose-transport', recipient: 'musa', quantity }).accepted).toBe(true);
    expect(apply(world, 'musa', { type: 'respond-transport', taskId: 'task-1', accept: true }).accepted).toBe(true);
    expect(world.snapshot.tasks['task-1']!.reserved).toBe(quantity);
    expect(apply(world, 'musa', { type: 'fulfil-transport', taskId: 'task-1' }).accepted).toBe(true);
    world.advance(20);
    expect(world.snapshot.tasks['task-1']!.status).toBe('delivered');
    expect(world.snapshot.resources).toMatchObject({ supplierGoods: 8 - quantity, marketGoods: 1 + quantity });
    expect(world.snapshot.npcs.musa.inventory).toEqual({ goods: 0, rewards: 1 });
    expect(Neighbourhood.restore(world.serialize()).snapshot.resources).toEqual(world.snapshot.resources);
  });

  it('exposes only relevant public limits and own capacity, without remote private state or stock', () => {
    const world = new Neighbourhood();
    const before = world.serialize(); const amina = world.observe('amina');
    expect(world.serialize()).toBe(before);
    expect(amina.actionConstraints).toEqual({
      'propose-transport': { quantity: { minimum: 1, maximum: 6 } },
      'collect-self': { quantity: { minimum: 1, maximum: 6 }, carryingCapacity: 2, remainingCarryingCapacity: 2 },
      'stock-stall': { quantity: { minimum: 1, maximum: 6 } },
    });
    expect(amina.resources.supplierGoods).toBeNull();
    expect(amina).not.toHaveProperty('npcs');
    expect(amina.nearbyPeople).toEqual([]);
    expect(world.observe('musa').actionConstraints).toEqual({ 'fulfil-transport': { carryingCapacity: 6, remainingCarryingCapacity: 6 } });
    expect(world.observe('zainab').actionConstraints).toEqual({ buy: { quantity: { minimum: 1, maximum: 6 } } });
    amina.actionConstraints['collect-self']!.quantity!.maximum = 999;
    expect(world.observe('amina').actionConstraints['collect-self']!.quantity!.maximum).toBe(6);
  });

  it('enforces remaining self-carrying capacity even for schema-valid quantities', () => {
    const world = new Neighbourhood();
    apply(world, 'amina', { type: 'travel', destination: 'centre' }); world.advance(10);
    expect(apply(world, 'amina', { type: 'collect-self', quantity: 1 }).accepted).toBe(true);
    expect(world.observe('amina').actionConstraints['collect-self']).toMatchObject({ carryingCapacity: 2, remainingCarryingCapacity: 1 });
    const request = world.requestInteractionDecision('amina')!; const before = world.snapshot;
    expect(isNpcDecision(proposal('collect-self', 2))).toBe(true);
    expect(world.applyDecision(request.id, proposal('collect-self', 2), provenance).reason).toBe('carrying-capacity');
    expect(gameplay(world.snapshot)).toEqual(gameplay(before));
    expect(apply(world, 'amina', { type: 'collect-self', quantity: 1 }).accepted).toBe(true);
    expect(world.observe('amina').actionConstraints['collect-self']!.remainingCarryingCapacity).toBe(0);
  });

  it('rechecks authoritative supply reservations even when public bounds and historical stock allow six', () => {
    const world = prepareAutonomyFixture();
    apply(world, 'amina', { type: 'propose-transport', recipient: 'musa', quantity: 6 });
    apply(world, 'musa', { type: 'respond-transport', taskId: 'task-1', accept: true });
    apply(world, 'amina', { type: 'travel', destination: 'centre' }); world.advance(10);
    apply(world, 'amina', { type: 'collect-self', quantity: 2 });
    apply(world, 'amina', { type: 'travel', destination: 'market' }); world.advance(10);
    apply(world, 'amina', { type: 'stock-stall', quantity: 2 });
    apply(world, 'amina', { type: 'travel', destination: 'centre' }); world.advance(10);
    const request = world.requestInteractionDecision('amina')!; const before = world.snapshot;
    expect(request.observation.resources.supplierGoods).toBe(6);
    expect(world.applyDecision(request.id, proposal('collect-self', 1), provenance).reason).toBe('insufficient-supplies');
    expect(gameplay(world.snapshot)).toEqual(gameplay(before));
  });
});
