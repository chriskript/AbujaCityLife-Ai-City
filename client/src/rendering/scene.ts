import * as THREE from 'three';
import { createWorld, landmarkLabels } from './world.js';
import type { TaxiPose } from '../simulation/taxi-journey.js';
import type { Route } from '../../../shared/navigation/routes.js';
import { nodes } from '../../../shared/world/neighbourhood.js';

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
    this.camera.fov = width < 700 ? 53 : 40;
    this.camera.updateProjectionMatrix();
  }
  setFollow(follow: boolean): void { this.follow = follow; }
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

  render(pose: TaxiPose, seconds: number): void {
    if (this.disposed || this.contextLost) return;
    this.world.taxi.position.set(pose.x, 0.1, pose.z); this.world.taxi.rotation.y = pose.heading;
    if (this.follow) {
      this.desiredTarget.set(pose.x, 0, pose.z);
      this.desiredPosition.set(pose.x + 65, 80, pose.z + 80);
    } else {
      // Move the city to the right of the desktop instruction card.
      this.desiredTarget.set(window.innerWidth >= 900 ? 50 : 73, 0, window.innerWidth >= 900 ? 40 : 35);
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
