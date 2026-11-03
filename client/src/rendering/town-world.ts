import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { townMap } from '../../../shared/world/town-layout.js';
import { createWorld } from './world.js';
import { planning, townFurnishings, roadWidth, corridorDistance, pointSegmentDistance } from '../../../shared/world/town-planning.js';

export function createTownWorld(){
 const group=new THREE.Group(),materials=new Map<string,THREE.MeshStandardMaterial>(),cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),leaf=new THREE.IcosahedronGeometry(1,0);
 const material=(color:string)=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return materials.get(color)!;};
 function shape(geometry:THREE.BufferGeometry,color:string,x:number,y:number,z:number,w:number,h:number,d:number){const object=new THREE.Mesh(geometry,material(color));object.position.set(x,y,z);object.scale.set(w,h,d);object.castShadow=h>1;object.receiveShadow=true;group.add(object);return object;}
 const box=(color:string,x:number,y:number,z:number,w:number,h:number,d:number)=>shape(cube,color,x,y,z,w,h,d);
 const tree=(x:number,z:number)=>{shape(cylinder,'#8c6447',x,2,z,.65,4,.65);shape(leaf,'#4d953c',x,6,z,3.5,4,3.5);shape(leaf,'#8bbe40',x+1.5,7.3,z,2.5,2.7,2.5);};
 box('#95ac73',55,-1.8,20,402,3.6,332);box('#cebda0',55,-4,20,406,1,336);
 // Ground-level road/walk geometry follows exactly the authoritative graph.
 const roads=new Map<string,THREE.Mesh>();
 for(const edge of townMap.edges){if(edge.kind==='indoor')continue;const a=townMap.nodes.find(n=>n.id===edge.from)!,b=townMap.nodes.find(n=>n.id===edge.to)!;const distance=Math.hypot(b.x-a.x,b.z-a.z),angle=Math.atan2(b.x-a.x,b.z-a.z),walk=edge.kind==='walk';
  const width=roadWidth(edge);
  const pavement=box(walk?'#d9c8a4':'#ddd6c1',(a.x+b.x)/2,.08,(a.z+b.z)/2,walk?width:width+planning.sidewalk*2,.18,distance+.1);pavement.rotation.y=angle;
  if(walk)continue;
  const road=box('#566268',(a.x+b.x)/2,.21,(a.z+b.z)/2,width,.1,distance);road.rotation.y=angle;roads.set(edge.id,road);
  for(let s=12;s<distance-10;s+=9){const dash=box('#efe8ca',a.x+(b.x-a.x)*s/distance,.28,a.z+(b.z-a.z)*s/distance,.2,.02,3.2);dash.rotation.y=angle;}
  // Crossing stripes stop before junctions, with flush sidewalk approaches.
  if(distance>24)for(const s of [8,distance-8])for(let stripe=-width/2+.65;stripe<width/2;stripe+=1.2){
   const mark=box('#f4ecd8',a.x+(b.x-a.x)*s/distance+Math.cos(angle)*stripe,.29,a.z+(b.z-a.z)*s/distance-Math.sin(angle)*stripe,.65,.025,2.8);mark.rotation.y=angle;
  }
 }
 for(const n of townMap.nodes.filter(n=>!n.kind || n.kind==='street'))shape(cylinder,'#566268',n.x,.2,n.z,4.1,.18,4.1);
 const bounds=new Map<string,THREE.Box3>();
 for(const b of townMap.buildings){
  const height=b.kind==='flats'?14:b.kind==='office'?12:b.kind==='depot'?9:8;
  box(b.units.length?'#b9c28a':'#d2c5a6',b.x,.15,b.z,b.width+6,.25,b.depth+6);
  box('#e9d8b6',b.x,.4,b.z,b.width+2,.8,b.depth+2);
  box(b.color,b.x,height/2+.8,b.z,b.width,height,b.depth);
  box('#f0dfbf',b.x,height+.9,b.z,b.width+1.5,.8,b.depth+1.5);
  box(b.kind==='house'?'#995039':'#aab19f',b.x,height+1.5,b.z,b.width-1,.5,b.depth-1);
  const front=townMap.nodes.find(n=>n.id===b.entrance)!,dx=front.x-b.x,dz=front.z-b.z,xSide=Math.abs(dx)>Math.abs(dz);
  // Doorstep paths connect to the registered entrance, including public squares.
  const door={x:xSide?b.x+Math.sign(dx)*(b.width/2+1):b.x,z:xSide?b.z:b.z+Math.sign(dz)*(b.depth/2+1)};
  const gate=townMap.nodes.find(n=>n.id===(b.id==='market-stalls'?'market-gate':b.id==='supply-depot'?'supply-gate':b.entrance))!;
  const approach=box('#ddcfaf',(door.x+gate.x)/2,.3,(door.z+gate.z)/2,3,.1,Math.hypot(door.x-gate.x,door.z-gate.z)+.2);approach.rotation.y=Math.atan2(door.x-gate.x,door.z-gate.z);
  // Front-facing windows, balcony rails and a visible entrance distinguish the typologies.
  for(let floor=0;floor<b.floors;floor++)for(let window=0;window<3;window++){
    const wx=b.x-b.width/2+4+window*(b.width-8)/2;
    box('#346c83',wx,3.6+floor*6,b.z+b.depth/2+.12,2.3,3,.25);
    box('#f4e9ce',wx,1.9+floor*6,b.z+b.depth/2+.35,3,.35,.6);
    if(b.kind==='flats'){box('#d6ccb0',wx,2+floor*6,b.z+b.depth/2+1.1,3.6,.3,2);box('#435e59',wx,3+floor*6,b.z+b.depth/2+2,3.6,.8,.18);}
  }
  box('#334f49',xSide?b.x+Math.sign(dx)*(b.width/2+.15):b.x,2.5,xSide?b.z:b.z+Math.sign(dz)*(b.depth/2+.15),xSide?.25:2.3,4,xSide?2.3:.25);
  if(b.kind==='flats' || b.kind==='house'){shape(cylinder,'#3e5559',b.x+4,height+2.8,b.z-3,2,2.8,2);}
  if(b.kind==='house'){
    for(const side of [-1,1])if(!xSide || side!==Math.sign(dx))box('#d6ac83',b.x+side*(b.width/2+3),1.3,b.z,.45,2.6,b.depth+6);
    if(xSide || dz>0)box('#d6ac83',b.x,1.3,b.z-b.depth/2-3,b.width+6,2.6,.45);
  }
  if(['workshop','tailor','market','care','learning'].includes(b.kind)){
    box(b.kind==='care'?'#56977e':'#d0643e',xSide?door.x:b.x,5.5,xSide?b.z:door.z,xSide?2:b.width-2,.4,xSide?b.depth-2:2);
    if(b.kind==='workshop'){box('#35484a',b.x,3,b.z+b.depth/2+.15,b.width-6,5,.2);}
  }
  if(b.kind==='market'){
    // Open stalls stand at the public receiving/trading node; the shop behind is scenery.
    for(const [i,stall] of townFurnishings.stalls.entries()){const {x,z,width,depth}=stall;box('#936240',x,1.4,z,width,2.4,depth);box(i%2?'#e9b645':'#dc744c',x,6.3,z,4.8,.4,4.5);for(let j=0;j<3;j++)shape(leaf,j%2?'#d9b953':'#7f9c4b',x-1+j,2.9,z,.45,.45,.45);}
  }
  if(b.kind==='flats' || b.kind==='office')for(let i=0;i<3;i++)box('#3e6875',b.x-6+i*5,height+2,b.z+3,3.5,.22,4);
  bounds.set(b.id,new THREE.Box3(new THREE.Vector3(b.x-b.width/2,0,b.z-b.depth/2),new THREE.Vector3(b.x+b.width/2,height+4,b.z+b.depth/2)));
 }
 // Retained lake, overlook and hill garden; the new green is a public rest place.
 const lake=planning.lake;
 shape(cylinder,'#c9c39a',lake.x,.02,lake.z,lake.radiusX+3,.15,lake.radiusZ+3);
 shape(cylinder,'#49aeb6',lake.x,.14,lake.z,lake.radiusX,.16,lake.radiusZ);
 for(let i=0;i<5;i++)box('#8ec9c5',lake.x-20+i*9,.24,lake.z+(i%2)*9,6,.02,.4);
 box('#d8bd8c',112,.4,8,16,.6,12);for(const x of [106,118])for(const z of [4,12])box('#bd9362',x,3,z,.5,5,.5);box('#548a69',112,5.8,8,17,.7,12);
 box('#76ad52',95,.15,85,30,.3,28);box('#d8cfac',95,.35,85,3,.12,28);box('#d8cfac',95,.35,85,30,.12,3);
 // Deterministic planting excludes every plot, access path and the water reserve.
 for(let x=-128;x<245;x+=17)for(let z=-128;z<171;z+=18){
  const p={x:x+Math.sin(z)*3,z:z+Math.cos(x)*3};
  if(((x+128)/17+(z+128)/18)%3===0)continue;
  if(((p.x-lake.x)/(lake.radiusX+7))**2+((p.z-lake.z)/(lake.radiusZ+7))**2<1)continue;
  if(townMap.buildings.some(b=>Math.abs(p.x-b.x)<b.width/2+9 && Math.abs(p.z-b.z)<b.depth/2+9))continue;
  if(townMap.edges.some(e=>e.kind!=='indoor' && pointSegmentDistance(p,townMap.nodes.find(n=>n.id===e.from)!,townMap.nodes.find(n=>n.id===e.to)!)<roadWidth(e)/2+6))continue;
  tree(p.x,p.z);
 }
 // Taxi lay-by: sheltered waiting, parking spaces and a separate pedestrian court.
 box('#cfc5a8',-17,.18,10,18,.25,11);box('#537c68',-17,6.3,10,13,.5,6);
 for(const x of [-22,-12])box('#775f42',x,3.2,10,.35,6,.35);
 for(const z of [7,10,13])box('#f6e9c9',-26,.34,z,3,.03,.2);
 for(const {x,z,width,depth} of townFurnishings.benches){box('#96693f',x,1.2,z,width,.4,depth);box('#96693f',x,2,z+.6,width,1,.25);}
 for(const n of townMap.nodes.filter(n=>n.kind==='street')){
  const p={x:n.x+8,z:n.z+8};
  if(townMap.buildings.some(b=>corridorDistance(p,p,b)<3))continue;
  if(townMap.edges.some(e=>e.kind!=='indoor' && pointSegmentDistance(p,townMap.nodes.find(v=>v.id===e.from)!,townMap.nodes.find(v=>v.id===e.to)!)<roadWidth(e)/2+1))continue;
  shape(cylinder,'#405450',p.x,3.8,p.z,.15,7.5,.15);box('#f5de90',p.x,7.6,p.z,1.4,.35,1.4);
 }
 // Batch static scenery by material. Ray picking uses catalogue bounding boxes.
 const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
 for(const child of [...group.children])if(child instanceof THREE.Mesh){child.updateMatrix();const geometry=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geometry.applyMatrix4(child.matrix);const mat=child.material as THREE.Material;if(!batches.has(mat))batches.set(mat,[]);batches.get(mat)!.push(geometry);group.remove(child);}
 for(const [mat,geometries]of batches){const merged=mergeGeometries(geometries);if(!merged)throw new Error('Town geometry batching failed');const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);for(const geometry of geometries)geometry.dispose();}
 cube.dispose();cylinder.dispose();leaf.dispose();
 // Keep the existing taxi and intervention barrier rather than introducing replacements.
 const legacy=createWorld(),taxi=legacy.taxi,closure=legacy.closure;legacy.group.remove(taxi,closure);
 const keepGeometry=new Set<THREE.BufferGeometry>(),keepMaterial=new Set<THREE.Material>();
 for(const object of [taxi,closure])object.traverse(child=>{if(child instanceof THREE.Mesh){keepGeometry.add(child.geometry);for(const mat of Array.isArray(child.material)?child.material:[child.material])keepMaterial.add(mat);}});
 const removedGeometry=new Set<THREE.BufferGeometry>(),removedMaterial=new Set<THREE.Material>();legacy.group.traverse(child=>{if(child instanceof THREE.Mesh){removedGeometry.add(child.geometry);for(const mat of Array.isArray(child.material)?child.material:[child.material])removedMaterial.add(mat);}});
 for(const geometry of removedGeometry)if(!keepGeometry.has(geometry))geometry.dispose();for(const mat of removedMaterial)if(!keepMaterial.has(mat))mat.dispose();
 group.add(taxi,closure);return {group,taxi,closure,roads,buildingBounds:bounds};
}
