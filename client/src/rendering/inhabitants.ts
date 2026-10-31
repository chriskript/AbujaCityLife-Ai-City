import * as THREE from 'three';
import type { NpcId } from '../../../shared/neighbourhood/types.js';
import { defaultResidents } from '../../../shared/neighbourhood/initial-state.js';

export interface CharacterModel {
  group: THREE.Group; body: THREE.Group; limbs: THREE.Group[]; parcel: THREE.Group; ring: THREE.Mesh;
}
export function createInhabitants(ids: readonly NpcId[] = defaultResidents().map(npc => npc.id)) {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.SphereGeometry(1, 10, 8);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
  const ringGeometry = new THREE.RingGeometry(2.1, 2.5, 24);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  function add(parent: THREE.Object3D, shape: THREE.BufferGeometry, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number): THREE.Mesh {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    const mesh = new THREE.Mesh(shape, materials.get(color));
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    // Large silhouettes/cargo ground the residents without a shadow draw for each eye, limb or trim.
    mesh.castShadow = sx >= .65 && sy >= .65; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  const createCharacter = (id: NpcId): CharacterModel => {
    const actor = new THREE.Group(); actor.name = `inhabitant:${id}`; actor.userData.npcId = id;
    const body = new THREE.Group(); actor.add(body); group.add(actor);
    const palette = ['#598b75','#7666a0','#a06b4c','#547b9b'];
    const hash = [...id].reduce((sum,char) => sum + char.charCodeAt(0),0);
    const skin = id === 'amina' ? '#87553c' : id === 'musa' ? '#77503a' : '#a06b4c';
    const cloth = id === 'amina' ? '#c6794b' : id === 'musa' ? '#426c83' : id === 'zainab' ? '#598b75' : palette[hash % palette.length]!;
    add(body, sphere, skin, 0, 4.45, 0, 0.72, 0.85, 0.7);
    add(body, cylinder, cloth, 0, 2.8, 0, 0.85, 2, 0.6);
    if (id === 'amina') {
      add(body, cylinder, cloth, 0, 1.9, 0, 1, 1.6, 0.7);
      add(body, sphere, '#e9be5e', 0, 5.05, -0.06, 0.85, 0.65, 0.8);
      add(body, geometry, '#4c7863', 0, 2.9, 0.62, 1.15, 1.7, 0.1);
    } else if (id === 'musa') add(body, cylinder, '#284d66', 0, 5.05, 0, 0.8, 0.22, 0.8);
    else add(body, sphere, '#3f5948', 0, 4.95, -0.2, 0.78, 0.6, 0.7);
    for (const x of [-0.28, 0.28]) add(body, sphere, '#253d35', x, 4.5, 0.64, 0.075, 0.075, 0.05);
    const limbs: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * 1, 3.5, 0); body.add(arm); limbs.push(arm);
      add(arm, geometry, cloth, 0, -0.65, 0, 0.4, 1.25, 0.45);
      add(arm, sphere, skin, 0, -1.35, 0, 0.25, 0.3, 0.25);
      const leg = new THREE.Group(); leg.position.set(side * 0.42, 1.6, 0); body.add(leg); limbs.push(leg);
      add(leg, geometry, id === 'musa' ? '#c2ae7b' : '#314f43', 0, -0.7, 0, 0.48, 1.35, 0.5);
      add(leg, geometry, '#39483b', 0, -1.3, 0.15, 0.6, 0.3, 0.9);
    }
    const parcel = new THREE.Group(); parcel.position.set(0, 2.3, 1.05); body.add(parcel);
    add(parcel, geometry, '#bd9157', 0, 0, 0, 1.6, 1.1, 1);
    add(parcel, geometry, '#e2c889', 0, 0.1, 0, 0.18, 1.15, 1.05);
    parcel.visible = false;
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: '#eecb69', side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.42; actor.add(ring);
    return { group: actor, body, limbs, parcel, ring };
  };
  const models: Record<NpcId, CharacterModel> = {};
  const ensureResident = (id: NpcId): CharacterModel => models[id] ?? (models[id] = createCharacter(id));
  ids.forEach(ensureResident);
  function crates(count: number): THREE.Group {
    const crates = new THREE.Group();
    for (let index = 0; index < count; index++) {
      const crate = new THREE.Group(); crates.add(crate);
      add(crate, geometry, '#b58a51', index % 3 * 1.6, 0.6 + Math.floor(index / 3) * 1.2, 0, 1.45, 1.05, 1.3);
      add(crate, geometry, '#e0be70', index % 3 * 1.6, 0.65 + Math.floor(index / 3) * 1.2, 0.67, 1.5, 0.18, 0.05);
    }
    return crates;
  }
  const cargo = crates(6); const stock = crates(24); const supplies = crates(24);
  stock.position.set(39, 0.5, 58); supplies.position.set(60, 0.5, -7);
  group.add(stock, supplies);
  return { group, models, cargo, stock, supplies, ensureResident };
}
