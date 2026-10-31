import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { townMap } from '../../../shared/world/town-layout.js';
import { createWorld } from './world.js';

export function createTownWorld(){
 const group=new THREE.Group(),materials=new Map<string,THREE.MeshStandardMaterial>(),cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),leaf=new THREE.IcosahedronGeometry(1,0);
 const material=(color:string)=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return materials.get(color)!;};
 function shape(geometry:THREE.BufferGeometry,color:string,x:number,y:number,z:number,w:number,h:number,d:number){const object=new THREE.Mesh(geometry,material(color));object.position.set(x,y,z);object.scale.set(w,h,d);object.castShadow=h>1;object.receiveShadow=true;group.add(object);return object;}
 const box=(color:string,x:number,y:number,z:number,w:number,h:number,d:number)=>shape(cube,color,x,y,z,w,h,d);
 const tree=(x:number,z:number)=>{shape(cylinder,'#8c6447',x,2,z,.65,4,.65);shape(leaf,'#4d953c',x,6,z,3.5,4,3.5);shape(leaf,'#8bbe40',x+1.5,7.3,z,2.5,2.7,2.5);};
 box('#8fac65',55,-1.8,20,402,3.6,332);box('#cebda0',55,-4,20,406,1,336);
 // Ground-level road/walk geometry follows exactly the authoritative graph.
 const roads=new Map<string,THREE.Mesh>();
 for(const edge of townMap.edges){if(edge.kind==='indoor')continue;const a=townMap.nodes.find(n=>n.id===edge.from)!,b=townMap.nodes.find(n=>n.id===edge.to)!;const distance=Math.hypot(b.x-a.x,b.z-a.z),angle=Math.atan2(b.x-a.x,b.z-a.z),walk=edge.kind==='walk';
  const pavement=box('#ddd6c1',(a.x+b.x)/2,.08,(a.z+b.z)/2,walk?3.4:13,.18,distance+1);pavement.rotation.y=angle;
  if(walk)continue;
  const road=box('#566268',(a.x+b.x)/2,.21,(a.z+b.z)/2,8,.1,distance);road.rotation.y=angle;roads.set(edge.id,road);
  for(let s=6;s<distance-4;s+=9){const dash=box('#efe8ca',a.x+(b.x-a.x)*s/distance,.28,a.z+(b.z-a.z)*s/distance,.2,.02,3.2);dash.rotation.y=angle;}
 }
 for(const n of townMap.nodes.filter(n=>!n.kind || n.kind==='street'))shape(cylinder,'#566268',n.x,.2,n.z,4.1,.18,4.1);
 const bounds=new Map<string,THREE.Box3>();
 for(const b of townMap.buildings){
  const height=b.kind==='flats'?14:b.kind==='office'?12:b.kind==='depot'?9:8;
  box('#e9d8b6',b.x,.4,b.z,b.width+3,.8,b.depth+3);
  box(b.color,b.x,height/2+.8,b.z,b.width,height,b.depth);
  box('#f0dfbf',b.x,height+.9,b.z,b.width+1.5,.8,b.depth+1.5);
  box(b.kind==='house'?'#995039':'#aab19f',b.x,height+1.5,b.z,b.width-1,.5,b.depth-1);
  const front=townMap.nodes.find(n=>n.id===b.entrance)!,dx=front.x-b.x,dz=front.z-b.z,xSide=Math.abs(dx)>Math.abs(dz);
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
    for(const side of [-1,1])box('#d6ac83',b.x+side*(b.width/2+3),1.3,b.z,.45,2.6,b.depth+6);
    box('#d6ac83',b.x,1.3,b.z-b.depth/2-3,b.width+6,2.6,.45);tree(b.x+b.width/2+5,b.z-5);
  }
  if(['workshop','tailor','market','care','learning'].includes(b.kind)){
    box(b.kind==='care'?'#56977e':'#d0643e',b.x,5.5,b.z+b.depth/2+2,b.width,.4,4.5);
    if(b.kind==='workshop'){box('#35484a',b.x,3,b.z+b.depth/2+.15,b.width-6,5,.2);}
  }
  if(b.kind==='market'){
    // Open stalls stand at the public receiving/trading node; the shop behind is scenery.
    for(let i=0;i<4;i++){const x=30+i*6;box('#936240',x,1.4,49,4.5,2.4,3);box(i%2?'#e9b645':'#dc744c',x,4.2,49,5.5,.4,4.5);}
  }
  bounds.set(b.id,new THREE.Box3(new THREE.Vector3(b.x-b.width/2,0,b.z-b.depth/2),new THREE.Vector3(b.x+b.width/2,height+4,b.z+b.depth/2)));
 }
 // Retained lake, overlook and hill garden; the new green is a public rest place.
 shape(cylinder,'#49b2c0',137,.02,-28,57,.12,40);
 box('#d8bd8c',107,.5,27,17,1,12);for(const x of [101,113])for(const z of [23,31])box('#bd9362',x,3,z,.5,5,.5);box('#548a69',107,5.8,27,17,.7,12);
 box('#76ad52',95,.15,85,30,.3,28);box('#d8cfac',95,.35,85,3,.12,28);box('#d8cfac',95,.35,85,30,.12,3);
 for(const [x,z]of [[84,76],[106,76],[84,94],[106,94],[159,100],[171,100],[-120,60],[-103,-60],[-56,-112],[50,-100],[170,155],[235,70],[15,163],[-35,15],[-90,145]])tree(x!,z!);
 for(const [x,z]of [[86,83],[104,88],[161,96]]){box('#96693f',x!,1.2,z!,6,.4,1.3);box('#96693f',x!,2,z!+.6,6,1,.25);}
 for(const n of townMap.nodes.filter(n=>n.kind==='street')){shape(cylinder,'#405450',n.x+6,3.8,n.z+6,.15,7.5,.15);box('#f5de90',n.x+6,7.6,n.z+6,1.4,.35,1.4);}
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
