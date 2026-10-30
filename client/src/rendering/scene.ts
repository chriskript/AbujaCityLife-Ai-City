import * as THREE from 'three';
import { createWorld, landmarkLabels } from './world.js';
import type { TaxiPose } from '../simulation/taxi-journey.js';
import type { Route } from '../../../shared/navigation/routes.js';
import { nodes } from '../../../shared/world/neighbourhood.js';
import { createInhabitants } from './inhabitants.js';
import type { NeighbourhoodView } from '../../../shared/neighbourhood/presentation.js';
import { type NpcId } from '../../../shared/neighbourhood/types.js';

export class NeighbourhoodScene {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.5, 900);
  private readonly world = createWorld();
  private readonly target = new THREE.Vector3(72, 0, 30);
  private readonly overview = new THREE.Vector3(220, 240, 285);
  private readonly desiredPosition = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private readonly projection = new THREE.Vector3();
  private readonly labelElements: HTMLDivElement[] = [];
  private readonly taxiLabel = document.createElement('div');
  private readonly resizeObserver: ResizeObserver;
  private route: THREE.Line | null = null;
  private routeId: string | null = null;
  private follow = false;
  private disposed = false;
  private contextLost = false;
  private population: ReturnType<typeof createInhabitants> | null = null;
  private readonly actorLabels = new Map<NpcId, HTMLButtonElement>();
  private populationListeners: AbortController | null = null;
  private populationPlaced = false;
  private selectResident: ((id: NpcId) => void) | null = null;

  constructor(private readonly container: HTMLElement, private readonly labels: HTMLElement, onContextChange: (lost: boolean) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1 : 1.5));
    this.renderer.setClearColor('#dce5d3');
    this.renderer.shadowMap.enabled = window.innerWidth >= 900;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    container.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', '3D Abuja-inspired miniature neighbourhood');
    this.scene.fog = new THREE.Fog('#dce5d3', 350, 620);
    this.scene.add(new THREE.HemisphereLight('#fff9e3', '#809674', 2.6));
    const sun = new THREE.DirectionalLight('#fff0cc', 3.2);
    sun.position.set(-60, 150, 70); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 150, bottom: -150, near: 1, far: 350 });
    sun.shadow.normalBias = 0.1; sun.target.position.set(65, 0, 20);
    this.scene.add(sun, sun.target, this.world.group);
    this.world.taxi.scale.setScalar(1.3);
    this.camera.position.copy(this.overview);
    this.camera.lookAt(this.target);
    for (const landmark of landmarkLabels) {
      const label = document.createElement('div');
      label.className = `landmark landmark-${landmark.kind}`;
      label.textContent = landmark.text; labels.append(label); this.labelElements.push(label);
    }
    this.taxiLabel.className = 'landmark taxi-marker'; this.taxiLabel.textContent = '● TAXI'; labels.append(this.taxiLabel);
    const lost = (event: Event): void => { event.preventDefault(); this.contextLost = true; onContextChange(true); };
    const restored = (): void => { this.contextLost = false; onContextChange(false); };
    this.renderer.domElement.addEventListener('webglcontextlost', lost);
    this.renderer.domElement.addEventListener('webglcontextrestored', restored);
    this.removeContextListeners = () => {
      this.renderer.domElement.removeEventListener('webglcontextlost', lost);
      this.renderer.domElement.removeEventListener('webglcontextrestored', restored);
    };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container); this.resize();
  }
  private readonly removeContextListeners: () => void;

  private resize(): void {
    const width = this.container.clientWidth; const height = this.container.clientHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 700 ? 1 : 1.5));
    this.renderer.shadowMap.enabled = width >= 900;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.fov = width < 700 ? this.population ? 60 : 53 : 40;
    this.camera.updateProjectionMatrix();
  }
  setFollow(follow: boolean): void { this.follow = follow; }
  enableInhabitants(onSelect: (id: NpcId) => void): void {
    if (this.population) return;
    this.selectResident = onSelect;
    this.population = createInhabitants([]); this.scene.add(this.population.group);
    this.world.taxi.add(this.population.cargo); this.population.cargo.position.set(-0.8, 2.8, -0.8); this.population.cargo.scale.setScalar(0.45);
    this.world.taxi.userData.npcId = 'musa';
    this.populationListeners = new AbortController();
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
    this.renderer.domElement.addEventListener('pointerup', event => {
      if (!this.population) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, this.camera);
      const hits = raycaster.intersectObjects([this.world.taxi, ...Object.values(this.population.models).map(model => model.group)], true);
      for (const hit of hits) {
        let object: THREE.Object3D | null = hit.object;
        while (object && !object.userData.npcId) object = object.parent;
        if (object && Object.hasOwn(this.population.models, object.userData.npcId)) { onSelect(object.userData.npcId as NpcId); return; }
      }
    }, { signal: this.populationListeners.signal });
    this.resize();
  }

  renderInhabitants(view: NeighbourhoodView, selected: NpcId, seconds: number): void {
    const population = this.population; if (!population) return;
    const ease = this.populationPlaced ? 1 - Math.exp(-Math.min(seconds, 0.05) * 14) : 1;
    for (const [index,actor] of view.actors.entries()) {
      const model = population.ensureResident(actor.id);
      model.group.visible = true;
      if (!this.actorLabels.has(actor.id)) {
        const button = document.createElement('button'); button.className = 'npc-marker'; button.dataset.npc = actor.id;
        button.addEventListener('click', () => this.selectResident?.(actor.id), { signal: this.populationListeners!.signal });
        document.querySelector('#inhabitant-labels')!.append(button); this.actorLabels.set(actor.id,button);
      }
      const standing = { x: (index % 3 - 1) * 6, z: 6 + Math.floor(index / 3) * 5 };
      const x = actor.pose.x + (actor.moving ? actor.mobility === 'taxi' ? 0 : Math.cos(actor.pose.heading) * 4.4 : standing.x);
      const z = actor.pose.z + (actor.moving ? actor.mobility === 'taxi' ? 0 : -Math.sin(actor.pose.heading) * 4.4 : standing.z);
      model.group.position.x += (x - model.group.position.x) * ease;
      model.group.position.z += (z - model.group.position.z) * ease;
      const difference = Math.atan2(Math.sin(actor.pose.heading - model.group.rotation.y), Math.cos(actor.pose.heading - model.group.rotation.y));
      model.group.rotation.y += difference * ease;
      model.body.visible = !(actor.mobility === 'taxi' && actor.moving);
      model.body.position.y = actor.moving ? Math.abs(Math.sin(view.time * 7)) * 0.16 : Math.sin(view.time * 2) * 0.025;
      model.limbs.forEach((limb, index) => { limb.rotation.x = actor.moving ? Math.sin(view.time * 7 + index * Math.PI) * 0.38 : 0; });
      model.parcel.visible = actor.goods > 0 && actor.mobility !== 'taxi'; model.ring.visible = actor.id === selected;
      const marker = this.actorLabels.get(actor.id)!;
      const caption = actor.name;
      if (marker.textContent !== caption) marker.textContent = caption;
      marker.setAttribute('aria-label', `Select ${actor.name}, ${actor.occupation}`); marker.setAttribute('aria-pressed', String(actor.id === selected));
      marker.title = actor.activity;
    }
    population.stock.children.forEach((crate, index) => { crate.visible = index < view.resources.marketGoods; });
    population.supplies.children.forEach((crate, index) => { crate.visible = index < view.resources.supplierGoods; });
    const musa = view.actors.find(actor => actor.mobility === 'taxi') ?? view.actors[0]!;
    population.cargo.children.forEach((crate, index) => { crate.visible = index < musa.goods; });
    const focused = view.actors.find(actor => actor.id === selected) ?? musa;
    this.render(musa.pose, seconds, focused.pose);
    this.taxiLabel.hidden = true;
    for (const [index,actor] of view.actors.entries()) {
      const position = population.models[actor.id]!.group.position;
      this.projection.set(position.x, 8, position.z).project(this.camera);
      const marker = this.actorLabels.get(actor.id)!;
      const labelOffset = -8 - Math.floor(index / 3) * 21;
      const crowded = view.actors.some(other => other.id !== actor.id && Math.hypot(other.pose.x - actor.pose.x, other.pose.z - actor.pose.z) < 18);
      const horizontalOffset = crowded ? (index % 3 - 1) * 30 : 0;
      marker.style.transform = `translate(${(this.projection.x + 1) * this.container.clientWidth / 2 + horizontalOffset}px, ${(1 - this.projection.y) * this.container.clientHeight / 2 + labelOffset}px) translate(-50%, -100%)`;
      marker.hidden = this.projection.z > 1 || Math.abs(this.projection.x) > 1 || Math.abs(this.projection.y) > 1;
    }
    for (const [id,model] of Object.entries(population.models)) if (!view.actors.some(actor => actor.id === id)) { model.group.visible = false; this.actorLabels.get(id)!.hidden = true; }
    this.populationPlaced = true;
  }
  resetPresentation(): void { this.populationPlaced = false; }
  setClosure(closed: boolean): void { this.world.closure.visible = closed; }
  setRoute(route: Route | null): void {
    if ((route?.id ?? null) === this.routeId) return;
    this.routeId = route?.id ?? null;
    if (this.route) { this.scene.remove(this.route); this.route.geometry.dispose(); (this.route.material as THREE.Material).dispose(); this.route = null; }
    if (!route) return;
    const points = route.nodeIds.map(id => { const node = nodes.find(item => item.id === id)!; return new THREE.Vector3(node.x, 0.43, node.z); });
    this.route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#f5d66d', depthTest: false }));
    this.route.renderOrder = 2; this.scene.add(this.route);
  }

  render(pose: TaxiPose, seconds: number, cameraPose: TaxiPose = pose): void {
    if (this.disposed || this.contextLost) return;
    this.world.taxi.position.set(pose.x, 0.1, pose.z); this.world.taxi.rotation.y = pose.heading;
    if (this.follow) {
      this.desiredTarget.set(cameraPose.x, 0, cameraPose.z);
      this.desiredPosition.set(cameraPose.x + 65, 80, cameraPose.z + 80);
    } else {
      // Move the city to the right of the desktop instruction card.
      this.desiredTarget.set(window.innerWidth >= 900 ? 50 : 73, 0, window.innerWidth >= 900 ? 40 : window.innerWidth < 600 && this.population ? 0 : 35);
      this.desiredPosition.copy(this.overview);
    }
    const ease = 1 - Math.exp(-Math.min(seconds, 0.05) * 3);
    this.camera.position.lerp(this.desiredPosition, ease); this.target.lerp(this.desiredTarget, ease);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
    for (let index = 0; index < landmarkLabels.length; index++) {
      const landmark = landmarkLabels[index]!;
      this.projection.set(landmark.x, 9, landmark.z).project(this.camera);
      const element = this.labelElements[index]!;
      const x = (this.projection.x + 1) * this.container.clientWidth / 2;
      const y = (1 - this.projection.y) * this.container.clientHeight / 2;
      element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      element.hidden = this.projection.z > 1 || Math.abs(this.projection.x) > 1.1 || Math.abs(this.projection.y) > 1.1;
    }
    this.projection.set(pose.x, 6, pose.z).project(this.camera);
    this.taxiLabel.style.transform = `translate(${(this.projection.x + 1) * this.container.clientWidth / 2}px, ${(1 - this.projection.y) * this.container.clientHeight / 2}px) translate(-50%, -100%)`;
    this.taxiLabel.hidden = this.projection.z > 1 || Math.abs(this.projection.x) > 1 || Math.abs(this.projection.y) > 1;
    this.renderer.render(this.scene, this.camera);
  }

  get metrics(): { drawCalls: number; triangles: number; geometries: number; textures: number } {
    const { render, memory } = this.renderer.info;
    return { drawCalls: render.calls, triangles: render.triangles, geometries: memory.geometries, textures: memory.textures };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.renderer.setAnimationLoop(null);
    this.populationListeners?.abort(); this.actorLabels.forEach(label => label.remove()); this.actorLabels.clear();
    this.resizeObserver.disconnect(); this.removeContextListeners();
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    this.scene.traverse(object => { if (object instanceof THREE.DirectionalLight) object.shadow.dispose(); });
    this.renderer.dispose(); this.renderer.domElement.remove(); this.labels.replaceChildren();
  }
}
