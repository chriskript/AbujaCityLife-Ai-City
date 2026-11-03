import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createWorld } from '../client/src/rendering/world.js';
import { edges, nodes } from '../shared/world/neighbourhood.js';


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
