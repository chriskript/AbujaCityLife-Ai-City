import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { DecisionScheduler } from '../shared/neighbourhood/scheduler.js';
import { PresentationStore, projectNeighbourhood, type NeighbourhoodFrame, type SessionCommand } from '../shared/neighbourhood/presentation.js';
import { LocalNeighbourhoodSession } from '../client/src/simulation/local-neighbourhood-session.js';
import { createInhabitants } from '../client/src/rendering/inhabitants.js';

function connected() {
  const session = new LocalNeighbourhoodSession(); let latest!: NeighbourhoodFrame;
  const unsubscribe = session.subscribe(frame => { latest = frame; });
  let sequence = 0;
  const send = (payload: { type: 'pause'; paused: boolean } | { type: 'speed'; speed: 1 | 2 | 4 } | { type: 'reset'; experiment: 'cooperate' | 'decline' | 'wait' | 'self-collect' | 'reduce-sales' }) => session.send({ ...payload, id: `test-${++sequence}`, worldId: latest.snapshot.worldId });
  return { session, unsubscribe, frame: () => latest, send };
}

describe('observer snapshots and event transport', () => {
  it('projects all three correct locations without exposing private NPC knowledge or memory', () => {
    const { snapshot, events } = projectNeighbourhood(new Neighbourhood('projection').snapshot);
    expect(snapshot.actors.map(actor => [actor.id, actor.node, actor.pose.x, actor.pose.z])).toEqual([
      ['musa', 'stand', 0, 0], ['amina', 'market', 40, 40], ['zainab', 'centre', 40, 0],
    ]);
    expect(snapshot.resources).toEqual({ supplierGoods: 8, marketGoods: 1, salesOpen: true });
    expect(events).toEqual([]);
    const wire = JSON.stringify(snapshot);
    for (const privateField of ['memories', 'knowledge', 'needs', 'priorities', 'triggers', 'MODEL_API_KEY']) expect(wire).not.toContain(privateField);
  });

  it('moves the presentation only as far as the authoritative path progress', async () => {
    const world = new Neighbourhood('moving'); const request = world.requestDecision('zainab')!;
    world.applyDecision(request.id, { goalId: 'food', reason: 'Fixture', action: { type: 'travel', destination: 'market' } }, { mode: 'mock', model: 'fixture' });
    world.advance(1);
    const actor = projectNeighbourhood(world.snapshot).snapshot.actors.find(actor => actor.id === 'zainab')!;
    expect(actor.moving).toBe(true); expect(actor.node).toBe('centre');
    expect(actor.pose).toEqual({ x: 40, z: 4, heading: 0 });
  });

  it('rejects duplicate, out-of-order, and wrong-session frames', async () => {
    const local = connected(); const store = new PresentationStore(); const first = local.frame();
    expect(store.accept(first)).toBe(true); expect(store.accept(first)).toBe(false);
    await local.session.step(); const second = local.frame();
    expect(store.accept(second)).toBe(true); expect(store.accept(first)).toBe(false);
    expect(store.accept({ ...second, sessionId: 'another-session', sequence: second.sequence + 1 })).toBe(false);
    expect(store.accept({ ...second, sequence: second.sequence + 1, snapshot: { ...second.snapshot, time: 0, revision: 0 } })).toBe(false);
    expect(store.frame?.snapshot).toEqual(second.snapshot); local.session.dispose();
  });

  it('provides detached data so observer mutations cannot alter the world', async () => {
    const local = connected(); local.frame().snapshot.resources.marketGoods = 999;
    await local.session.step(); expect(local.frame().snapshot.resources.marketGoods).toBe(1); local.session.dispose();
  });
});

describe('one shared simulation, local and future remote presentation', () => {
  it('remains exactly consistent with headless execution through collection, delivery, and purchase', async () => {
    const local = connected(); const world = new Neighbourhood(local.frame().snapshot.worldId); const scheduler = new DecisionScheduler(world);
    const statuses = new Set<string>(); const resourceEvidence = new Set<string>();
    for (let step = 0; step < 500; step++) {
      await scheduler.pump(); world.advance(0.25); await local.session.step();
      const expected = projectNeighbourhood(world.snapshot);
      expect(local.frame().snapshot).toEqual(expected.snapshot);
      expect(local.frame().events).toEqual(expected.events);
      local.frame().snapshot.tasks.forEach(task => statuses.add(task.status));
      for (const event of local.frame().events) resourceEvidence.add(event.type);
    }
    expect([...statuses]).toEqual(expect.arrayContaining(['proposed', 'accepted', 'collected', 'delivered']));
    expect([...resourceEvidence]).toEqual(expect.arrayContaining(['transport-collected', 'transport-delivered', 'buy']));
    expect(local.frame().snapshot.resources).toMatchObject({ supplierGoods: 6, marketGoods: 2 });
    expect(local.frame().snapshot.actors.find(actor => actor.id === 'zainab')!.goods).toBe(1);
    local.session.dispose();
  });

  it.each(['decline', 'wait', 'self-collect', 'reduce-sales'] as const)('presents the real %s branch rather than animating cooperation regardless', async experiment => {
    const local = connected(); await local.send({ type: 'reset', experiment });
    for (let step = 0; step < 500; step++) await local.session.step();
    const frame = local.frame();
    if (experiment === 'decline') expect(frame.snapshot.tasks[0]?.status).toBe('declined');
    if (experiment === 'wait') { expect(frame.snapshot.tasks).toEqual([]); expect(frame.snapshot.actors.find(actor => actor.id === 'amina')!.activity).toBe('Waiting'); }
    if (experiment === 'self-collect') expect(frame.events.some(event => event.type === 'stock-stall')).toBe(true);
    if (experiment === 'reduce-sales') expect(frame.snapshot.resources.salesOpen).toBe(false);
    expect(frame.events.some(event => event.type === 'transport-delivered')).toBe(false);
    local.session.dispose();
  });

  it('pauses the clock, hides safely, and does not catch up a whole hidden interval', async () => {
    const local = connected(); await local.session.step();
    await local.send({ type: 'pause', paused: true }); const before = local.frame().snapshot;
    local.session.update(30); await local.session.step(); expect(local.frame().snapshot).toEqual(before);
    await local.send({ type: 'pause', paused: false }); local.session.setVisible(false);
    local.session.update(30); await local.session.step(); expect(local.frame().snapshot).toEqual(before);
    local.session.setVisible(true); local.session.update(30); await Promise.resolve(); await Promise.resolve();
    expect(local.frame().snapshot.time - before.time).toBeLessThanOrEqual(0.25); local.session.dispose();
  });

  it('resets to a new authoritative epoch and rejects stale commands without duplicate resets', async () => {
    const local = connected(); await local.session.step();
    const reset: SessionCommand = { id: 'reset-once', worldId: local.frame().snapshot.worldId, type: 'reset', experiment: 'cooperate' };
    expect((await local.session.send(reset)).accepted).toBe(true);
    const epoch = local.frame().snapshot.worldId; expect(epoch).not.toBe(reset.worldId);
    expect(local.frame().snapshot.time).toBe(0);
    expect(local.frame().snapshot.resources.marketGoods).toBe(1);
    await local.session.send(reset); expect(local.frame().snapshot.worldId).toBe(epoch);
    expect((await local.session.send({ id: 'late-pause', worldId: reset.worldId, type: 'pause', paused: true })).reason).toBe('stale-world');
    local.session.dispose();
  });

  it('discards a pending old-world update on reset and stops publishing on cleanup', async () => {
    const local = connected(); const pending = local.session.step();
    await local.send({ type: 'reset', experiment: 'wait' }); await pending;
    expect(local.frame().snapshot.time).toBe(0);
    const before = local.frame().sequence; local.unsubscribe(); await local.session.step();
    expect(local.frame().sequence).toBe(before);
    local.session.dispose(); expect((await local.send({ type: 'pause', paused: true })).reason).toBe('session-disposed');
  });
});

it('constructs exactly three distinct, selectable original models with reusable disposable resources', () => {
  const population = createInhabitants();
  expect(Object.keys(population.models)).toEqual(['musa', 'amina', 'zainab']);
  const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
  for (const [id, model] of Object.entries(population.models)) {
    expect(model.group.userData.npcId).toBe(id); expect(model.limbs).toHaveLength(4);
  }
  population.group.add(population.cargo);
  population.group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  expect(geometries.size).toBe(6); geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
});
