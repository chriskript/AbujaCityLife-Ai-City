import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { nodes, edges } from '../../../shared/world/neighbourhood.js';

export interface LandmarkLabel { text: string; x: number; z: number; kind: string }
export const landmarkLabels: LandmarkLabel[] = [
  { text: 'TAXI STAND', x: -4, z: -9, kind: 'taxi' },
  { text: 'Market Square', x: 42, z: 57, kind: 'market' },
  { text: 'Community Centre', x: 48, z: -19, kind: 'community' },
  { text: 'Lake Overlook', x: 106, z: 26, kind: 'lake' },
  { text: 'Hill Garden', x: 166, z: 99, kind: 'garden' },
];

export function createWorld(): { group: THREE.Group; taxi: THREE.Group; closure: THREE.Group; roads: Map<string, THREE.Mesh> } {
  const group = new THREE.Group();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  function material(color: string): THREE.MeshStandardMaterial {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    return materials.get(color)!;
  }
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
  const foliage = new THREE.IcosahedronGeometry(1, 0);
  function mesh(geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, parent: THREE.Object3D = group): THREE.Mesh {
    const object = new THREE.Mesh(geometry, material(color));
    object.position.set(x, y, z); object.scale.set(sx, sy, sz); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
  }
  function box(color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, parent: THREE.Object3D = group): THREE.Mesh {
    return mesh(cube, color, x, y, z, sx, sy, sz, parent);
  }
  function tree(x: number, z: number, size = 1): void {
    mesh(cylinder, '#82644a', x, 2.1 * size, z, 0.45 * size, 4.2 * size, 0.45 * size);
    mesh(foliage, '#407653', x, 5.6 * size, z, 3.1 * size, 3.7 * size, 3.1 * size);
    mesh(foliage, '#68915a', x + size, 6.7 * size, z + size, 2.3 * size, 2.5 * size, 2.3 * size);
  }
  function building(x: number, z: number, width: number, depth: number, height: number, color: string): void {
    box('#d8cab1', x, 0.25, z, width + 3, 0.5, depth + 3);
    box(color, x, height / 2 + 0.5, z, width, height, depth);
    box('#a85e44', x, height + 0.8, z, width + 1.5, 0.9, depth + 1.5);
    box('#d58b64', x, height + 1.35, z, width - 1, 0.25, depth - 1);
    for (let offset = -width / 2 + 2; offset < width / 2 - 1; offset += 3.7) {
      box('#426a68', x + offset, 3.7, z + depth / 2 + 0.08, 1.6, 2.4, 0.15);
      box('#f5e4c6', x + offset, 2.3, z + depth / 2 + 0.2, 2, 0.25, 0.4);
    }
    box('#3b554b', x, 2.1, z + depth / 2 + 0.2, 1.7, 3.2, 0.3);
  }

  // Raised, softly coloured miniature landscape; all road endpoints use the shared graph.
  box('#bdcba1', 66, -1.4, 26, 295, 2.8, 205);
  box('#adc294', 66, -3.4, 26, 298, 2, 208);
  const lake = mesh(cylinder, '#6aaeb5', 137, 0.05, -28, 57, 0.15, 40);
  lake.geometry = new THREE.CylinderGeometry(1, 1, 1, 48);
  // Shore edge, islands and flat water glints.
  const shore = mesh(cylinder, '#d5d2ae', 137, -0.02, -28, 60, 0.12, 43);
  shore.geometry = lake.geometry;
  for (let index = 0; index < 9; index++) box('#9ccac8', 112 + (index % 3) * 17, 0.15, -43 + Math.floor(index / 3) * 13, 8, 0.025, 0.3);
  for (let index = 0; index < 7; index++) {
    const hill = mesh(foliage, index % 2 ? '#9aaf8b' : '#849e81', index * 36 - 35, 2, -80 - index % 2 * 7, 31, 19 + index % 3 * 9, 19);
    hill.rotation.y = index;
  }
  const roads = new Map<string, THREE.Mesh>();
  for (const edge of edges) {
    const a = nodes.find(node => node.id === edge.from)!;
    const b = nodes.find(node => node.id === edge.to)!;
    const x = (a.x + b.x) / 2; const z = (a.z + b.z) / 2;
    const angle = Math.atan2(b.x - a.x, b.z - a.z);
    const pavement = box('#dfd8c4', x, 0.12, z, 11, 0.24, edge.distance + 1);
    pavement.rotation.y = angle;
    const road = box('#63736d', x, 0.27, z, 7.2, 0.12, edge.distance);
    road.rotation.y = angle; road.name = `road:${edge.id}`; road.userData.edgeId = edge.id;
    roads.set(edge.id, road);
    for (let distance = 5; distance < edge.distance - 3; distance += 7) {
      const fraction = distance / edge.distance;
      const dash = box('#d6d5b9', a.x + (b.x - a.x) * fraction, 0.345, a.z + (b.z - a.z) * fraction, 0.18, 0.03, 2.8);
      dash.rotation.y = angle;
    }
  }
  for (const node of nodes) mesh(cylinder, '#63736d', node.x, 0.275, node.z, 3.65, 0.14, 3.65);
  // Crossings and street lamps.
  for (const x of [10, 60]) for (let stripe = 0; stripe < 5; stripe++) box('#e7e1c9', x + stripe * 0.85, 0.36, 0, 0.45, 0.025, 5.5);
  for (const [x, z] of [[-6, 5], [34, 6], [74, 6], [34, 34], [86, 46], [154, 85]]) {
    mesh(cylinder, '#536859', x!, 3.5, z!, 0.16, 7, 0.16);
    box('#e8d5a5', x!, 7, z!, 1.1, 0.35, 1.1);
  }

  // Taxi stand canopy and kerbside seating.
  box('#d7c6a4', -4, 0.35, -11, 18, 0.6, 9);
  for (const x of [-11, 3]) box('#f2dfba', x, 2.7, -13, 0.4, 5, 0.4);
  box('#d8ad52', -4, 5.4, -12, 19, 0.5, 8);
  box('#536c59', -4, 1, -13, 9, 0.35, 1.2);
  box('#f0ce65', -4, 5.9, -12, 6, 0.5, 2);

  building(19, 20, 15, 16, 10, '#e9d1a8');
  building(-18, 23, 12, 15, 8, '#d5a886');
  building(-17, 52, 15, 12, 11, '#efdeba');
  building(58, 22, 11, 15, 8, '#d7be97');
  // Community Centre with colonnade and a green rooftop accent.
  building(48, -17, 22, 15, 8, '#f3e6c8');
  box('#3f7460', 48, 9.6, -17, 24, 1.1, 17);
  for (const x of [39, 45, 51, 57]) box('#f4e6c9', x, 3, -7.5, 0.55, 5, 0.55);
  box('#e4d4b3', 48, 0.4, -5.8, 25, 0.5, 3);

  // Market courtyard and alternating fabric awnings.
  box('#d9c1a0', 44, 0.3, 59, 33, 0.5, 23);
  building(61, 70, 10, 12, 7, '#ddb88e');
  for (let index = 0; index < 5; index++) {
    const x = 30 + index * 6;
    box('#966e4d', x, 1.5, 53, 4.5, 2.4, 3);
    box(index % 2 ? '#e5c473' : '#cb7750', x, 4, 53, 5.5, 0.4, 5);
    for (let crate = 0; crate < 3; crate++) box(['#929a48', '#d9b255', '#b96544'][crate]!, x - 1.4 + crate * 1.4, 2.9, 54, 1, 0.5, 1);
  }
  for (const x of [31, 41, 51]) box('#a37a55', x, 1, 65, 5, 1.4, 3);

  // A lakeside platform and a small open pavilion.
  box('#d8bd8c', 107, 0.6, 27, 17, 1.1, 12);
  for (const x of [101, 113]) for (const z of [23, 31]) box('#b38b60', x, 3, z, 0.5, 5, 0.5);
  const roof = mesh(new THREE.ConeGeometry(10, 3, 4), '#567962', 107, 6.6, 27, 1, 1, 0.8);
  roof.rotation.y = Math.PI / 4;
  for (const x of [102, 112]) box('#866b50', x, 1.3, 35, 5, 0.4, 1.1);
  // Hill Garden; intentionally kept off the immutable road edges.
  mesh(cylinder, '#d0c9a0', 164, 0.25, 97, 14, 0.5, 10);
  for (let index = 0; index < 7; index++) tree(152 + index * 4, 104 + index % 2 * 3, 0.8);
  box('#a77a55', 164, 1.2, 94, 8, 0.5, 1.5);

  for (const [x, z, scale] of [[-28,-17,1], [15,-19,1.2], [69,-13,1], [-14,8,0.9], [-10,72,1.3], [15,60,1], [71,56,1], [84,22,0.75], [92,69,1.1], [119,84,1.2], [136,105,1], [183,70,1.1], [177,16,1], [66,83,1], [12,85,1.3], [-31,45,1]]) tree(x!, z!, scale!);
  // Roadside signs supplement the projected accessible landmark labels.
  for (const label of landmarkLabels) {
    box('#6e6a4f', label.x - 5, 2.3, label.z, 0.25, 4.5, 0.25);
    box('#355e50', label.x - 5, 4, label.z, 5, 1.4, 0.3);
  }

  const taxi = new THREE.Group(); group.add(taxi); taxi.name = 'validated-taxi';
  box('#e6bc4c', 0, 1.05, 0, 2.7, 1.1, 5.2, taxi);
  box('#edce69', 0, 1.95, -0.2, 2.45, 1, 2.9, taxi);
  box('#476c70', 0, 2, 1.25, 2.1, 0.65, 0.08, taxi);
  box('#476c70', 0, 2, -1.67, 2.1, 0.65, 0.08, taxi);
  for (const x of [-1.24, 1.24]) {
    box('#476c70', x, 2, -0.2, 0.08, 0.65, 2.4, taxi);
    box('#343e36', x, 1.12, 0, 0.12, 0.22, 4.7, taxi);
    for (const z of [-1.65, 1.65]) {
      const wheel = mesh(cylinder, '#303d36', x, 0.65, z, 0.58, 0.35, 0.58, taxi);
      wheel.rotation.z = Math.PI / 2;
    }
  }
  box('#fff0ba', 0, 2.65, -0.15, 1.3, 0.4, 0.65, taxi);
  for (const x of [-0.9, 0.9]) box('#fff4cb', x, 1.1, 2.65, 0.6, 0.35, 0.08, taxi);
  box('#46564c', 0, 0.65, 2.7, 2.5, 0.2, 0.15, taxi);
  const taxiHalo = mesh(cylinder, '#f3d271', 0, 0.39, 0, 3.8, 0.04, 3.8, taxi);
  taxiHalo.material = new THREE.MeshBasicMaterial({ color: '#f3d271', transparent: true, opacity: 0.32, depthWrite: false });

  const closure = new THREE.Group(); closure.visible = false; group.add(closure);
  for (const x of [85.7, 86.3]) {
    box('#f0cf89', x, 1.4, 40, 0.28, 2.2, 6.5, closure);
    for (const z of [37.5, 42.5]) box('#bd643f', x, 0.7, z, 1, 1.3, 0.7, closure);
  }
  // Batch static scenery by material; keep graph roads and moving objects separate.
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const roadMeshes = new Set(roads.values());
  for (const child of [...group.children]) {
    if (!(child instanceof THREE.Mesh) || roadMeshes.has(child)) continue;
    child.updateMatrix();
    const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    geometry.applyMatrix4(child.matrix);
    const key = child.material as THREE.Material;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key)!.push(geometry); group.remove(child);
  }
  for (const [color, geometries] of batches) {
    const geometry = mergeGeometries(geometries);
    if (!geometry) throw new Error('Static scenery could not be batched');
    const scenery = new THREE.Mesh(geometry, color); scenery.castShadow = true; scenery.receiveShadow = true;
    group.add(scenery);
    geometries.forEach(item => item.dispose());
  }
  return { group, taxi, closure, roads };
}
