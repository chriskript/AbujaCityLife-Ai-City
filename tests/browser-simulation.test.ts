import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createWorld } from '../client/src/rendering/world.js';
import { TaxiJourney } from '../client/src/simulation/taxi-journey.js';
import { createBrowserProvider } from '../client/src/providers.js';
import { MockProvider } from '../shared/agent/mock-provider.js';
import { edges, nodes } from '../shared/world/neighbourhood.js';
import { scenarios } from '../shared/scenarios/scenarios.js';

afterEach(() => vi.useRealTimers());

describe('graph-driven 3D geometry', () => {
  it('renders exactly one correctly positioned road mesh for every existing edge', () => {
    const world = createWorld();
    expect(world.roads.size).toBe(edges.length);
    for (const edge of edges) {
      const road = world.roads.get(edge.id)!;
      const from = nodes.find(node => node.id === edge.from)!;
      const to = nodes.find(node => node.id === edge.to)!;
      expect(road.position.x).toBe((from.x + to.x) / 2);
      expect(road.position.z).toBe((from.z + to.z) / 2);
      expect(road.scale.z).toBe(edge.distance);
      expect(road.rotation.y).toBe(Math.atan2(to.x - from.x, to.z - from.z));
      expect(road.parent).toBe(world.group);
    }
    expect(world.taxi.name).toBe('validated-taxi');
    expect(world.closure.visible).toBe(false);
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
    world.group.traverse(object => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  });
});

async function runVisibleJourney(id: string): Promise<TaxiJourney> {
  const scenario = scenarios.find(item => item.id === id)!;
  const journey = new TaxiJourney(new MockProvider());
  await journey.start(scenario.goal, scenario.id, scenario.closure);
  for (let frame = 0; frame < 1500; frame++) {
    journey.tick(0.05); await Promise.resolve();
    if (journey.agent.status === 'completed') return journey;
  }
  throw new Error('Visible journey did not finish');
}

describe('interpolated deterministic execution', () => {
  it.each(['A', 'B', 'C'])('completes visible scenario %s with matching final waypoint', async id => {
    const journey = await runVisibleJourney(id);
    const node = nodes.find(item => item.id === journey.agent.node)!;
    expect(journey.agent.status).toBe('completed');
    expect(journey.pose.x).toBeCloseTo(node.x);
    expect(journey.pose.z).toBeCloseTo(node.z);
    if (id === 'C') {
      const travelled = journey.agent.events.filter(event => event.type === 'edge-executed').map(event => (event.data as { edgeId: string }).edgeId);
      expect(travelled).not.toContain('bridge-overlook'); expect(travelled).toContain('hill-overlook');
      expect(journey.agent.events.some(event => event.type === 'execution-interrupted')).toBe(true);
    }
    journey.dispose();
  });

  it('interpolates between validated waypoints before advancing the discrete agent', async () => {
    const journey = new TaxiJourney(new MockProvider());
    await journey.start(scenarios[0]!.goal, 'A');
    journey.tick(0.05);
    expect(journey.pose.x).toBeGreaterThan(0); expect(journey.pose.x).toBeLessThan(40);
    expect(journey.pose.z).toBe(0); expect(journey.agent.node).toBe('stand');
    const before = { ...journey.pose }; journey.tick(300);
    expect(journey.pose.x - before.x).toBeCloseTo(0.7); // Background catch-up is bounded.
    journey.dispose();
  });

  it('pauses without movement and resets both execution and visual position', async () => {
    const journey = new TaxiJourney(new MockProvider());
    await journey.start(scenarios[0]!.goal, 'A'); journey.tick(0.05); journey.paused = true;
    const position = { ...journey.pose }; journey.tick(0.05); expect(journey.pose).toEqual(position);
    journey.closeShortcut(); journey.reset();
    expect(journey.blockedEdges.size).toBe(0); expect(journey.agent.status).toBe('idle');
    expect(journey.pose).toEqual({ x: 0, z: 0, heading: Math.PI / 2 });
    journey.dispose();
  });

  it('stops at the junction before a blocked edge and replans after a visible wait', async () => {
    const journey = new TaxiJourney(new MockProvider());
    await journey.start(scenarios[2]!.goal, 'C', true);
    for (let frame = 0; frame < 500 && journey.agent.status === 'executing'; frame++) journey.tick(0.05);
    expect(journey.agent.status).toBe('interrupted');
    expect(journey.pose.x).toBe(80); expect(journey.pose.z).toBe(40);
    const before = { ...journey.pose };
    for (let frame = 0; frame < 10; frame++) journey.tick(0.05);
    expect(journey.pose).toEqual(before); expect(journey.agent.status).toBe('interrupted');
    journey.dispose();
  });

  it('does not close a road already occupied by the taxi', async () => {
    const journey = new TaxiJourney(new MockProvider());
    await journey.start(scenarios[0]!.goal, 'A');
    for (let frame = 0; frame < 500 && !journey.occupyingShortcut; frame++) journey.tick(0.05);
    expect(journey.occupyingShortcut).toBe(true); expect(journey.closeShortcut()).toBe(false);
    expect(journey.blockedEdges.size).toBe(0); journey.dispose();
  });

  it('does not continue movement after cleanup', async () => {
    const journey = new TaxiJourney(new MockProvider());
    await journey.start(scenarios[0]!.goal, 'A'); journey.tick(0.05); journey.dispose();
    journey.tick(0.05); await journey.start(scenarios[0]!.goal, 'A');
    expect(journey.agent.status).toBe('idle'); expect(journey.pose.x).toBe(0);
  });
});

describe('browser inference boundary', () => {
  it('has no live provider enabled', () => {
    expect(() => createBrowserProvider('live-meta')).toThrow('not enabled');
  });
  it('keeps the mock wait asynchronous and visibly labelled', async () => {
    vi.useFakeTimers();
    const journey = new TaxiJourney(createBrowserProvider('mock'));
    const pending = journey.start(scenarios[0]!.goal, 'A');
    expect(journey.agent.status).toBe('awaiting-decision');
    journey.tick(0.05); expect(journey.pose.x).toBe(0);
    await vi.advanceTimersByTimeAsync(650); await pending;
    expect(journey.agent.status).toBe('executing');
    expect(journey.agent.events.find(event => event.type === 'decision')?.data).toMatchObject({ provider: 'mock' });
    journey.dispose();
  });
});
