import * as THREE from 'three';
import { createWorld, landmarkLabels } from './world.js';
import { createTownWorld } from './town-world.js';
import { cityGate } from './town-scenery.js';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { mapFor,type MapId } from '../../../shared/world/town-layout.js';
import { townFurnishings } from '../../../shared/world/town-planning.js';
import { createInhabitants } from './inhabitants.js';
import type { ActorPose, NeighbourhoodView } from '../../../shared/neighbourhood/presentation.js';
import { type NpcId } from '../../../shared/neighbourhood/types.js';

function disposeSceneryMaterial(material:THREE.Material):void {
  if('map' in material)(material.map as THREE.Texture|null)?.dispose();
  material.dispose();
}

export class NeighbourhoodScene {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.5, 900);
  private world:ReturnType<typeof createWorld> & {buildingBounds?:Map<string,THREE.Box3>} = createWorld();
  private mapId:MapId='legacy-v1';
  private controls:MapControls|null=null;
  private buildingLabels=new Map<string,HTMLButtonElement>();
  private selectBuilding:((id:string)=>void)|null=null;
  private onPan:(()=>void)|null=null;
  private cameraBuilding:string|null=null;
  private readonly target = new THREE.Vector3(72, 0, 30);
  private readonly overview = new THREE.Vector3(220, 240, 285);
  private readonly desiredPosition = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private readonly projection = new THREE.Vector3();
  private readonly labelElements: HTMLDivElement[] = [];
  private readonly resizeObserver: ResizeObserver;
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
    sun.name='neighbourhood-sun';
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
    if(this.controls && !this.follow && !this.cameraBuilding)this.showOverview();
  }
  private showOverview():void {
    if(!this.controls)return;
    const map=mapFor(this.mapId),center=new THREE.Vector3((map.bounds.minX+map.bounds.maxX)/2,0,(map.bounds.minZ+map.bounds.maxZ)/2);
    const direction=new THREE.Vector3(.65,.95,.85).normalize();let near=250,far=1500,distance=far;
    for(let pass=0;pass<18;pass++){
      distance=(near+far)/2;
      this.camera.position.copy(center).addScaledVector(direction,distance);this.camera.lookAt(center);this.camera.updateMatrixWorld();
      let extent=0;
      for(const x of [map.bounds.minX,map.bounds.maxX])for(const z of [map.bounds.minZ,map.bounds.maxZ]){
        const p=new THREE.Vector3(x,0,z).project(this.camera);extent=Math.max(extent,Math.abs(p.x)/.92,Math.abs(p.y)/.70);
      }
      if(extent>1)near=distance;else far=distance;
    }
    this.camera.position.copy(center).addScaledVector(direction,far);this.camera.lookAt(center);
    this.controls.target.copy(center);this.controls.update();
  }
  setFollow(follow: boolean): void { this.follow = follow;this.cameraBuilding=null;if(!follow)this.showOverview(); }
  zoom(factor:number):void {if(!this.controls)return;this.follow=false;this.cameraBuilding=null;const offset=this.camera.position.clone().sub(this.controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,65,850));this.camera.position.copy(this.controls.target).add(offset);this.controls.update();this.onPan?.();}
  enableInhabitants(onSelect: (id: NpcId) => void,onBuilding?:(id:string)=>void,onPan?:()=>void): void {
    if (this.population) return;
    this.selectResident = onSelect;
    this.selectBuilding=onBuilding ?? null;this.onPan=onPan ?? null;
    this.population = createInhabitants([]); this.scene.add(this.population.group);
    this.world.taxi.add(this.population.cargo); this.population.cargo.position.set(-0.8, 2.8, -0.8); this.population.cargo.scale.setScalar(0.45);
    this.world.taxi.userData.npcId = 'musa';
    this.populationListeners = new AbortController();
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
    let pointerStart={x:0,y:0};this.renderer.domElement.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};},{signal:this.populationListeners.signal});
    this.renderer.domElement.addEventListener('pointerup', event => {
      if (!this.population || Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>6) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, this.camera);
      const hits = raycaster.intersectObjects([this.world.taxi,...Object.values(this.population.models).map(model => model.group)].filter(object=>object.visible), true);
      for (const hit of hits) {
        let object: THREE.Object3D | null = hit.object;
        while (object && !object.userData.npcId) object = object.parent;
        if (object && Object.hasOwn(this.population.models, object.userData.npcId)) { onSelect(object.userData.npcId as NpcId); return; }
      }
      const point=new THREE.Vector3();let selected:string|null=null,nearest=Infinity;
      for(const[id,box]of this.world.buildingBounds ?? [])if(raycaster.ray.intersectBox(box,point)){const distance=point.distanceTo(this.camera.position);if(distance<nearest){selected=id;nearest=distance;}}
      if(selected)this.selectBuilding?.(selected);
    }, { signal: this.populationListeners.signal });
    this.resize();
  }
  private setMap(id:MapId):void {
    if(id===this.mapId)return;this.mapId=id;this.population?.cargo.removeFromParent();this.scene.remove(this.world.group);
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();this.world.group.traverse(child=>{if(child instanceof THREE.Mesh){geometries.add(child.geometry);for(const mat of Array.isArray(child.material)?child.material:[child.material])materials.add(mat);}});geometries.forEach(g=>g.dispose());materials.forEach(disposeSceneryMaterial);
    this.world=id==='town-v1'?createTownWorld():createWorld();this.scene.add(this.world.group);this.world.taxi.scale.setScalar(1.3);this.world.taxi.userData.npcId='musa';if(this.population)this.world.taxi.add(this.population.cargo);
    this.controls?.dispose();this.controls=null;this.buildingLabels.forEach(label=>label.remove());this.buildingLabels.clear();
    if(id==='town-v1'){
      this.renderer.toneMappingExposure=1.2;
      const sun=this.scene.getObjectByName('neighbourhood-sun') as THREE.DirectionalLight;
      Object.assign(sun.shadow.camera,{left:-235,right:235,top:235,bottom:-235,far:500});sun.shadow.camera.updateProjectionMatrix();
      this.renderer.setClearColor('#b9d7d8');this.scene.fog=new THREE.Fog('#b9d7d8',850,1400);this.camera.far=2000;this.camera.updateProjectionMatrix();
      this.camera.position.set(385,410,430);this.target.set(40,0,20);this.camera.lookAt(this.target);
      this.controls=new MapControls(this.camera,this.renderer.domElement);this.controls.target.copy(this.target);this.controls.enableRotate=false;this.controls.enableDamping=true;this.controls.screenSpacePanning=false;this.controls.minDistance=65;this.controls.maxDistance=1500;this.controls.zoomSpeed=.8;this.showOverview();
      this.controls.addEventListener('start',()=>{this.follow=false;this.cameraBuilding=null;this.onPan?.();});
      for(const building of mapFor(id).buildings){const button=document.createElement('button');button.className='building-marker';button.dataset.building=building.id;button.addEventListener('click',()=>this.selectBuilding?.(building.id),{signal:this.populationListeners!.signal});document.querySelector('#building-labels')?.append(button);this.buildingLabels.set(building.id,button);}
      const gateLabel=document.createElement('button');gateLabel.className='building-marker';gateLabel.dataset.building=cityGate.id;gateLabel.addEventListener('click',()=>this.selectBuilding?.(cityGate.id),{signal:this.populationListeners!.signal});document.querySelector('#building-labels')?.append(gateLabel);this.buildingLabels.set(cityGate.id,gateLabel);
    }
    this.populationPlaced=false;
  }
  focusBuilding(id:string):void {this.cameraBuilding=id;this.follow=false;}

  renderInhabitants(view: NeighbourhoodView, selected: NpcId, seconds: number): void {
    const population = this.population; if (!population) return;
    this.setMap(view.mapId);
    if(view.mapId==='town-v1'){population.stock.position.set(townFurnishings.stock.x-1.6,.5,townFurnishings.stock.z);population.supplies.position.set(townFurnishings.supplies.x-1.6,.5,townFurnishings.supplies.z);}
    this.setClosure(view.blockedEdges.includes('centre-market'),'centre-market');
    const ease = this.populationPlaced ? 1 - Math.exp(-Math.min(seconds, 0.05) * 14) : 1;
    for (const [index,actor] of view.actors.entries()) {
      const model = population.ensureResident(actor.id);
      model.group.visible = !actor.insideBuildingId;
      if (!this.actorLabels.has(actor.id)) {
        const button = document.createElement('button'); button.className = 'npc-marker'; button.dataset.npc = actor.id;
        button.addEventListener('click', () => this.selectResident?.(actor.id), { signal: this.populationListeners!.signal });
        document.querySelector('#inhabitant-labels')!.append(button); this.actorLabels.set(actor.id,button);
      }
      const localIndex=this.mapId==='town-v1'?view.actors.filter(person=>!person.moving && person.node===actor.node).findIndex(person=>person.id===actor.id):index;
      const standing = { x: (localIndex % 3 - 1) * 3, z: 3 + Math.floor(localIndex / 3) * 3 };
      const sidewalk=actor.mobility!=='taxi' && actor.pathKind==='road'?4.4:0;
      const x = actor.pose.x + (actor.moving ? Math.cos(actor.pose.heading)*sidewalk : standing.x);
      const z = actor.pose.z + (actor.moving ? -Math.sin(actor.pose.heading)*sidewalk : standing.z);
      model.group.position.x += (x - model.group.position.x) * ease;
      model.group.position.z += (z - model.group.position.z) * ease;
      const difference = Math.atan2(Math.sin(actor.pose.heading - model.group.rotation.y), Math.cos(actor.pose.heading - model.group.rotation.y));
      model.group.rotation.y += difference * ease;
      model.body.visible = !(actor.mobility === 'taxi' && actor.moving && actor.pathKind!=='walk');
      model.body.position.y = actor.moving ? Math.abs(Math.sin(view.time * 7)) * 0.16 : Math.sin(view.time * 2) * 0.025;
      model.limbs.forEach((limb, index) => { limb.rotation.x = actor.moving ? Math.sin(view.time * 7 + index * Math.PI) * 0.38 : 0; });
      model.parcel.visible = actor.goods > 0 && (actor.mobility !== 'taxi' || actor.pathKind==='walk'); model.ring.visible = actor.id === selected;
      const marker = this.actorLabels.get(actor.id)!;
      const caption = actor.name;
      if (marker.textContent !== caption) marker.textContent = caption;
      marker.setAttribute('aria-label', `Select ${actor.name}, ${actor.occupation}`); marker.setAttribute('aria-pressed', String(actor.id === selected));
      marker.title = actor.activity;
    }
    population.stock.children.forEach((crate, index) => { crate.visible = index < view.resources.marketGoods; });
    population.supplies.children.forEach((crate, index) => { crate.visible = index < view.resources.supplierGoods; });
    const musa = view.actors.find(actor => actor.mobility === 'taxi') ?? view.actors[0]!;
    this.world.taxi.visible=!musa.insideBuildingId && musa.pathKind!=='walk';
    population.cargo.children.forEach((crate, index) => { crate.visible = index < musa.goods; });
    const focused = view.actors.find(actor => actor.id === selected) ?? musa;
    this.render(musa.pose, seconds, focused.pose);
    const actorLabelRects:{left:number;right:number;top:number;bottom:number}[]=[];
    const origin=this.container.getBoundingClientRect();
    for(const element of document.querySelectorAll<HTMLElement>('.places-panel:not([hidden]),.inhabitant-panel:not([hidden]),.activity-feed:not([hidden]),.town-navigation,.scene-caption,.view-controls,.neighbourhood-bar')){
      const rect=element.getBoundingClientRect();
      actorLabelRects.push({left:rect.left-origin.left,right:rect.right-origin.left,top:rect.top-origin.top,bottom:rect.bottom-origin.top});
    }
    const labelOrder=view.actors.map((actor,index)=>({actor,index})).sort((a,b)=>Number(b.actor.id===selected)-Number(a.actor.id===selected));
    for (const {index,actor} of labelOrder) {
      const position = population.models[actor.id]!.group.position;
      this.projection.set(position.x, 8, position.z).project(this.camera);
      const marker = this.actorLabels.get(actor.id)!;
      const localIndex=this.mapId==='town-v1'?view.actors.filter(person=>!person.insideBuildingId && Math.hypot(person.pose.x-actor.pose.x,person.pose.z-actor.pose.z)<18).findIndex(person=>person.id===actor.id):index;
      const labelOffset = -8 - Math.floor(localIndex / 3) * 21;
      const crowded = view.actors.some(other => other.id !== actor.id && Math.hypot(other.pose.x - actor.pose.x, other.pose.z - actor.pose.z) < 18);
      const horizontalOffset = crowded ? (index % 3 - 1) * 30 : 0;
      marker.style.transform = `translate(${(this.projection.x + 1) * this.container.clientWidth / 2 + horizontalOffset}px, ${(1 - this.projection.y) * this.container.clientHeight / 2 + labelOffset}px) translate(-50%, -100%)`;
      marker.hidden = !!actor.insideBuildingId || this.projection.z > 1 || Math.abs(this.projection.x) > 1 || Math.abs(this.projection.y) > 1 || this.mapId==='town-v1' && this.camera.position.distanceTo(this.controls!.target)>350 && actor.id!==selected;
      const x=(this.projection.x+1)*this.container.clientWidth/2+horizontalOffset,y=(1-this.projection.y)*this.container.clientHeight/2+labelOffset;
      const width=actor.name.length*7+26,rect={left:x-width/2,right:x+width/2,top:y-40,bottom:y};
      if(!marker.hidden){
        if(actorLabelRects.some(other=>rect.left<other.right+5 && rect.right>other.left-5 && rect.top<other.bottom+5 && rect.bottom>other.top-5))marker.hidden=true;
        else actorLabelRects.push(rect);
      }
    }
    for (const [id,model] of Object.entries(population.models)) if (!view.actors.some(actor => actor.id === id)) { model.group.visible = false; this.actorLabels.get(id)!.hidden = true; }
    this.populationPlaced = true;
    const labelRects=actorLabelRects;
    const distance=this.controls?this.camera.position.distanceTo(this.controls.target):0;
    const candidates=[...mapFor(this.mapId).buildings,...(this.mapId==='town-v1'?[{...cityGate,name:'Abuja City Gate',floors:2,kind:'landmark',units:[]}]:[])];
    const priority=(id:string)=>id===this.cameraBuilding?0:id==='market-stalls'?1:id===cityGate.id?2:id==='community-office'?3:4;
    for(const building of candidates.sort((a,b)=>priority(a.id)-priority(b.id))){
      const marker=this.buildingLabels.get(building.id)!;const occupants=view.actors.filter(actor=>actor.insideBuildingId===building.id);
      const caption=building.name;if(marker.textContent!==caption)marker.textContent=caption;marker.setAttribute('aria-label',`Inspect ${building.name}${occupants.length?`, ${occupants.length} indoors`:''}`);marker.dataset.context=String(building.id===this.cameraBuilding);
      this.projection.set(building.x,building.floors*7+4,building.z).project(this.camera);
      marker.style.transform=`translate(${(this.projection.x+1)*this.container.clientWidth/2}px,${(1-this.projection.y)*this.container.clientHeight/2}px) translate(-50%,-100%)`;
      const contextual=building.id===this.cameraBuilding || this.follow && occupants.some(actor=>actor.id===selected);
      marker.hidden=this.projection.z>1 || Math.abs(this.projection.x)>.95 || Math.abs(this.projection.y)>.95 || !contextual && distance>(priority(building.id)<4?1500:building.units.length?260:340);
      if(this.container.clientWidth<600 && distance>420 && priority(building.id)>2 && !contextual)marker.hidden=true;
      const x=(this.projection.x+1)*this.container.clientWidth/2,y=(1-this.projection.y)*this.container.clientHeight/2;
      const width=(marker.textContent?.length ?? 0)*6.5+24,rect={left:x-width/2,right:x+width/2,top:y-38,bottom:y+3};
      if(!marker.hidden){
        if(labelRects.some(other=>rect.left<other.right+6 && rect.right>other.left-6 && rect.top<other.bottom+4 && rect.bottom>other.top-4))marker.hidden=true;
        else labelRects.push(rect);
      }
    }
  }
  resetPresentation(): void { this.populationPlaced = false; }
  private setClosure(closed: boolean, edgeId: string): void {
    this.world.closure.visible = closed;
    const map=mapFor(this.mapId),edge=map.edges.find(item=>item.id===edgeId); if (!closed || !edge) return;
    const from=map.nodes.find(node=>node.id===edge.from)!,to=map.nodes.find(node=>node.id===edge.to)!;
    this.world.closure.position.set((from.x+to.x)/2,0,(from.z+to.z)/2);
    this.world.closure.rotation.y=-Math.atan2(to.z-from.z,to.x-from.x);
  }
  private render(pose: ActorPose, seconds: number, cameraPose: ActorPose = pose): void {
    if (this.disposed || this.contextLost) return;
    this.world.taxi.position.set(pose.x, 0.1, pose.z); this.world.taxi.rotation.y = pose.heading;
    if(this.controls){
      if(this.follow || this.cameraBuilding){const map=mapFor(this.mapId),place=this.cameraBuilding===cityGate.id?cityGate:map.buildings.find(b=>b.id===this.cameraBuilding) ?? map.nodes.find(n=>n.id===this.cameraBuilding);const x=place?.x ?? cameraPose.x,z=place?.z ?? cameraPose.z;this.desiredTarget.set(x,0,z);this.desiredPosition.set(x+85,115,z+105);const ease=1-Math.exp(-Math.min(seconds,.05)*3);this.camera.position.lerp(this.desiredPosition,ease);this.controls.target.lerp(this.desiredTarget,ease);}
      const previousTarget=this.controls.target.clone();this.controls.target.x=THREE.MathUtils.clamp(this.controls.target.x,-150,260);this.controls.target.z=THREE.MathUtils.clamp(this.controls.target.z,-150,190);this.camera.position.add(this.controls.target.clone().sub(previousTarget));this.controls.update();
    } else {
    if (this.follow) {
      this.desiredTarget.set(cameraPose.x, 0, cameraPose.z);
      this.desiredPosition.set(cameraPose.x + 65, 80, cameraPose.z + 80);
    } else {
      // Position the legacy neighbourhood for its observer view.
      this.desiredTarget.set(window.innerWidth >= 900 ? 50 : 73, 0, window.innerWidth >= 900 ? 40 : window.innerWidth < 600 && this.population ? 0 : 35);
      this.desiredPosition.copy(this.overview);
    }
    const ease = 1 - Math.exp(-Math.min(seconds, 0.05) * 3);
    this.camera.position.lerp(this.desiredPosition, ease); this.target.lerp(this.desiredTarget, ease);
    this.camera.lookAt(this.target);
    }
    this.camera.updateMatrixWorld();
    for (let index = 0; index < landmarkLabels.length; index++) {
      const landmark = landmarkLabels[index]!;
      this.projection.set(landmark.x, 9, landmark.z).project(this.camera);
      const element = this.labelElements[index]!;
      const x = (this.projection.x + 1) * this.container.clientWidth / 2;
      const y = (1 - this.projection.y) * this.container.clientHeight / 2;
      element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      element.hidden = this.mapId==='town-v1' || this.projection.z > 1 || Math.abs(this.projection.x) > 1.1 || Math.abs(this.projection.y) > 1.1;
    }
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
    this.controls?.dispose();this.buildingLabels.forEach(label=>label.remove());this.buildingLabels.clear();
    this.resizeObserver.disconnect(); this.removeContextListeners();
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) disposeSceneryMaterial(material);
    this.scene.traverse(object => { if (object instanceof THREE.DirectionalLight) object.shadow.dispose(); });
    this.renderer.dispose(); this.renderer.domElement.remove(); this.labels.replaceChildren();
  }
}
