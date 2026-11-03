import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { townMap } from '../../../shared/world/town-layout.js';
import { createWorld } from './world.js';
import { cityGate, createPlanting, waterfrontBenches } from './town-scenery.js';
import { planning, townFurnishings, roadWidth, corridorDistance, pointSegmentDistance } from '../../../shared/world/town-planning.js';

export function createTownWorld(){
 const group=new THREE.Group(),materials=new Map<string,THREE.MeshStandardMaterial>(),cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),leaf=new THREE.IcosahedronGeometry(1,0);
 const material=(color:string)=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return materials.get(color)!;};
 function shape(geometry:THREE.BufferGeometry,color:string,x:number,y:number,z:number,w:number,h:number,d:number){const object=new THREE.Mesh(geometry,material(color));object.position.set(x,y,z);object.scale.set(w,h,d);object.castShadow=h>1;object.receiveShadow=true;group.add(object);return object;}
 const box=(color:string,x:number,y:number,z:number,w:number,h:number,d:number)=>shape(cube,color,x,y,z,w,h,d);
 const tree=(x:number,z:number,s=1)=>{shape(cylinder,'#8c6447',x,2*s,z,.45*s,4*s,.45*s);shape(leaf,'#487558',x,6*s,z,3.5*s,4*s,3.5*s);shape(leaf,'#789451',x+1.3*s,7.1*s,z,2.5*s,2.7*s,2.5*s);};
 function pitchedRoof(x:number,z:number,w:number,d:number,y:number,color:string){
  const roof=shape(new THREE.ConeGeometry(1,1,4),color,x,y+1.8,z,(w+2)/Math.SQRT2,3.6,(d+2)/Math.SQRT2);roof.rotation.y=Math.PI/4;
 }
 // Small physical signs remain part of the architecture when floating labels hide.
 function sign(text:string,x:number,y:number,z:number,width:number,side=false){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#285548';ctx.fillRect(0,0,512,96);ctx.fillStyle='#fff0cc';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 36px sans-serif';ctx.fillText(text,256,50,476);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const plaque=new THREE.Mesh(new THREE.PlaneGeometry(width,1.65),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));plaque.position.set(x,y,z);if(side)plaque.rotation.y=Math.PI/2;group.add(plaque);
 }
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
  if(['house','learning','market','depot'].includes(b.kind))pitchedRoof(b.x,b.z,b.width,b.depth,height+1.2,b.kind==='house'?'#995e49':b.kind==='market'?'#647d68':b.kind==='depot'?'#697c83':'#536f68');
  else box(b.kind==='office'?'#527d69':'#aab19f',b.x,height+1.5,b.z,b.width-1,.5,b.depth-1);
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
  // Oriented porch/arcade: the actual registered entrance defines the frontage.
  const fx=door.x,fz=door.z,publicBuilding=['office','learning','care'].includes(b.kind);
  if(publicBuilding || b.units.length){
   box(publicBuilding?'#527d69':'#d9b783',fx,5.4,fz,xSide?3:8,.45,xSide?8:3);
   for(const side of [-1,1])box('#f2e4ca',fx+(xSide?0:side*3),2.7,fz+(xSide?side*3:0),.35,5.2,.35);
  }
  if(!b.units.length)sign(b.kind==='care'?'COMMUNITY CARE +':b.kind==='learning'?'UNITY LEARNING':b.kind==='office'?'COMMUNITY CENTRE':b.kind==='market'?'UNITY MARKET':b.kind==='depot'?'SUPPLY COOPERATIVE':b.kind==='tailor'?'BISI Â· TAILORING':'REPAIRS & SERVICES',fx+(xSide?Math.sign(dx)*.2:0),6.5,fz+(xSide?0:Math.sign(dz)*.2),xSide?b.depth-3:b.width-3,xSide);
  if(b.units.length){
   // Curtains, balcony planters and utility details give each occupied plot a domestic scale.
   for(const offset of [-6,6]){
    box('#b37b55',b.x+offset,2.2,b.z+b.depth/2+1.6,2,.6,.8);
    shape(leaf,'#597b4d',b.x+offset,2.8,b.z+b.depth/2+1.6,1.1,.7,.7);
   }
   box('#d9cdb0',b.x-b.width/2-.35,3,b.z,1,1.7,2);
   if(b.kind==='flats')for(const offset of [-7,0,7])box('#e9cf91',b.x+offset,9.5,b.z+b.depth/2+.3,.45,2.7,.25);
  }
  if(b.kind==='office'){
   box('#e7dcc4',b.x,1.1,b.z+b.depth/2+1.9,b.width+2,.5,3);
   for(const x of [-7,0,7])box('#f2e5cc',b.x+x,5,b.z+b.depth/2+1.6,.6,8,.6);
   box('#527d69',b.x,9,b.z+b.depth/2+1.6,b.width+3,.65,3);
  }
  if(b.kind==='workshop' || b.kind==='depot'){
   box('#405c60',b.x,3.1,b.z+b.depth/2+.18,b.width-6,4.8,.25);
   for(let y=1;y<5;y+=.7)box('#80918a',b.x,y,b.z+b.depth/2+.35,b.width-6,.12,.15);
  }
  if(b.kind==='care'){box('#f7f0d9',b.x,6,b.z+b.depth/2+.2,3,3,.25);box('#438472',b.x,6,b.z+b.depth/2+.4,1,2.4,.2);box('#438472',b.x,6,b.z+b.depth/2+.4,2.4,1,.2);}
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
    // A shaded shop arcade on the garden edge makes trade visible from the observer view.
    const arcadeZ=b.z+b.depth/2+1.2;
    box('#537b66',b.x,5.6,arcadeZ,b.width+1,.35,2.2);
    for(const offset of [-12,-6,0,6,12]){
      box('#eddcc0',b.x+offset,2.9,arcadeZ+.6,.3,5.4,.3);
      box('#3c6e70',b.x+offset,3.1,b.z+b.depth/2+.2,3.7,3.8,.2);
      box('#bd8d58',b.x+offset,1.2,arcadeZ,3.4,.8,1.2);
      for(const k of [-1,0,1])shape(leaf,k===0?'#d6aa50':'#6d8e46',b.x+offset+k,1.85,arcadeZ,.4,.4,.4);
    }
    sign('UNITY MARKET · LOCAL PRODUCE',b.x,6.5,arcadeZ+1.15,23);
    // Open stalls stand at the public receiving/trading node; the shop behind is scenery.
    for(const [i,stall] of townFurnishings.stalls.entries()){
     const {x,z,width,depth}=stall;box('#936240',x,1.4,z,width,2.4,depth);
     for(const side of [-1,1])box('#75583d',x+side*2,3.2,z,.16,6,.16);
     box(i%2?'#e9b645':'#dc744c',x,6.3,z,4.8,.4,4.5);
     for(const offset of [-1.5,0,1.5])box('#f4dfad',x+offset,6.53,z,.6,.04,4.5);
     for(let j=0;j<3;j++)shape(leaf,j%2?'#d9b953':'#7f9c4b',x-1+j,2.9,z,.45,.45,.45);
    }
  }
  if(b.kind==='flats' || b.kind==='office')for(let i=0;i<3;i++)box('#3e6875',b.x-6+i*5,height+2,b.z+3,3.5,.22,4);
  bounds.set(b.id,new THREE.Box3(new THREE.Vector3(b.x-b.width/2,0,b.z-b.depth/2),new THREE.Vector3(b.x+b.width/2,height+5,b.z+b.depth/2)));
 }
 // Retained lake, overlook and hill garden; the new green is a public rest place.
 const lake=planning.lake;
 shape(cylinder,'#c9c39a',lake.x,.02,lake.z,lake.radiusX+3,.15,lake.radiusZ+3);
 shape(cylinder,'#49aeb6',lake.x,.14,lake.z,lake.radiusX,.16,lake.radiusZ);
 for(let i=0;i<5;i++)box('#8ec9c5',lake.x-20+i*9,.24,lake.z+(i%2)*9,6,.02,.4);
 box('#d8bd8c',112,.4,8,16,.6,12);for(const x of [106,118])for(const z of [4,12])box('#bd9362',x,3,z,.5,5,.5);box('#548a69',112,5.8,8,17,.7,12);
 box('#76ad52',95,.15,85,30,.3,28);box('#d8cfac',95,.35,85,3,.12,28);box('#d8cfac',95,.35,85,30,.12,3);
 // Intentional avenue rows, domestic garden corners and destination groves.
 for(const plant of createPlanting()){
  if(plant.kind==='tree')tree(plant.x,plant.z,plant.size);
  else {const s=plant.size;box('#b89068',plant.x,.45*s,plant.z,2.5*s,.8*s,2.5*s);shape(leaf,'#6d884f',plant.x,1.2*s,plant.z,1.3*s,s,1.3*s);}
 }
 // A garden-scale City Gate beside the western approach, entirely off the graph.
 const g=cityGate;
 box('#d1c6a8',g.x,.2,g.z,g.width,.35,g.depth);
 // Swept twin pylons and suspended national silhouette echo the Abuja landmark.
 const pylon=new THREE.Shape();pylon.moveTo(0,0);pylon.lineTo(3.2,0);pylon.lineTo(3.2,8);pylon.quadraticCurveTo(3.2,11,6.5,13);pylon.lineTo(4.7,13);pylon.quadraticCurveTo(0,10.5,0,7);pylon.closePath();
 const pylonGeometry=new THREE.ExtrudeGeometry(pylon,{depth:1.8,bevelEnabled:false,curveSegments:5});
 const rightPylon=new THREE.Shape(pylon.getPoints(5).map(p=>new THREE.Vector2(-p.x,p.y)));
 const rightPylonGeometry=new THREE.ExtrudeGeometry(rightPylon,{depth:1.8,bevelEnabled:false});
 for(const side of [-1,1])shape(side===1?rightPylonGeometry:pylonGeometry,'#f2ead6',g.x+side*10,.4,g.z-.9,1,1,1);
 box('#f2ead6',g.x,7,g.z,18,.85,1.8);
 const nigeria=new THREE.Shape();nigeria.moveTo(-3,1.4);nigeria.lineTo(-1.5,2);nigeria.lineTo(-.5,1.3);nigeria.lineTo(1.4,1.8);nigeria.lineTo(3,1);nigeria.lineTo(2.5,-.7);nigeria.lineTo(.7,-1.3);nigeria.lineTo(.1,-2);nigeria.lineTo(-1,-1.1);nigeria.lineTo(-2.4,-.9);nigeria.closePath();
 shape(new THREE.ExtrudeGeometry(nigeria,{depth:.35,bevelEnabled:false}),'#34835e',g.x,9.6,g.z,1,1,1);
 box('#f4edd6',g.x,9.9,g.z+.4,.8,2.5,.1);
 for(const side of [-1,1]){const cable=box('#798e80',g.x+side*4.6,11.4,g.z,5.8,.12,.12);cable.rotation.z=side*.48;}
 sign('ABUJA · YOU ARE WELCOME',g.x,7,g.z+1,16);
 bounds.set(g.id,new THREE.Box3(new THREE.Vector3(g.x-g.width/2,0,g.z-g.depth/2),new THREE.Vector3(g.x+g.width/2,g.height+.5,g.z+g.depth/2)));
 for(const side of [-1,1]){box('#a7835c',g.x+side*8,.7,g.z+3,3,.9,1.3);shape(leaf,'#68834d',g.x+side*8,1.5,g.z+3,1.6,.9,1);}
 // Green and waterfront: shaded seating and a light, open pergola roof.
 for(const x of [106,112,118])box('#e5d4ad',x,6.3,8,.45,.3,12);
 for(const {x,z,width} of waterfrontBenches){box('#927451',x,1.2,z-.25,width,.4,1);box('#927451',x,2,z+.25,width,1,.2);}
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
 const sourceGeometries=new Set<THREE.BufferGeometry>();
 const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
 for(const child of [...group.children])if(child instanceof THREE.Mesh){sourceGeometries.add(child.geometry);child.updateMatrix();const geometry=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geometry.applyMatrix4(child.matrix);const mat=child.material as THREE.Material;if(!batches.has(mat))batches.set(mat,[]);batches.get(mat)!.push(geometry);group.remove(child);}
 for(const [mat,geometries]of batches){const merged=mergeGeometries(geometries);if(!merged)throw new Error('Town geometry batching failed');const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);for(const geometry of geometries)geometry.dispose();}
 sourceGeometries.forEach(geometry=>geometry.dispose());
 // Keep the existing taxi and intervention barrier rather than introducing replacements.
 const legacy=createWorld(),taxi=legacy.taxi,closure=legacy.closure;legacy.group.remove(taxi,closure);
 const keepGeometry=new Set<THREE.BufferGeometry>(),keepMaterial=new Set<THREE.Material>();
 for(const object of [taxi,closure])object.traverse(child=>{if(child instanceof THREE.Mesh){keepGeometry.add(child.geometry);for(const mat of Array.isArray(child.material)?child.material:[child.material])keepMaterial.add(mat);}});
 const removedGeometry=new Set<THREE.BufferGeometry>(),removedMaterial=new Set<THREE.Material>();legacy.group.traverse(child=>{if(child instanceof THREE.Mesh){removedGeometry.add(child.geometry);for(const mat of Array.isArray(child.material)?child.material:[child.material])removedMaterial.add(mat);}});
 for(const geometry of removedGeometry)if(!keepGeometry.has(geometry))geometry.dispose();for(const mat of removedMaterial)if(!keepMaterial.has(mat))mat.dispose();
 group.add(taxi,closure);return {group,taxi,closure,roads,buildingBounds:bounds};
}
