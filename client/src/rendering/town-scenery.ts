import { townMap } from '../../../shared/world/town-layout.js';
import { corridorDistance, planning, roadWidth, townFurnishings } from '../../../shared/world/town-planning.js';

// Presentation only: no nodes, destinations or save schema are added.
export const cityGate = { id: 'abuja-city-gate', x: -65, z: -23, width: 23, depth: 9, height: 13 };
export const waterfrontBenches = [{x:101,z:4,width:4,depth:1.5},{x:122,z:15.25,width:4,depth:1.5}];
export const plantingReserves = [
  ...waterfrontBenches, ...townFurnishings.benches, ...townFurnishings.stalls, townFurnishings.stock, townFurnishings.supplies,
  {x:95,z:85,width:3,depth:28}, {x:95,z:85,width:30,depth:3},
  {x:112,z:8,width:17,depth:12},
];
export interface Planting { x: number; z: number; size: number; kind: 'tree' | 'shrub' }

export function sceneryClear(p: {x:number;z:number;width:number;depth:number}, margin = 0): boolean {
  const lake = planning.lake;
  if (((p.x-lake.x)/(lake.radiusX+p.width/2+margin))**2 + ((p.z-lake.z)/(lake.radiusZ+p.depth/2+margin))**2 < 1) return false;
  if (townMap.buildings.some(b => Math.abs(p.x-b.x)<(p.width+b.width)/2+margin && Math.abs(p.z-b.z)<(p.depth+b.depth)/2+margin)) return false;
  return !townMap.edges.some(e => e.kind!=='indoor' && corridorDistance(townMap.nodes.find(n=>n.id===e.from)!,townMap.nodes.find(n=>n.id===e.to)!,p)<roadWidth(e)/2+(e.kind==='road'?planning.sidewalk:0)+margin);
}

export function createPlanting(): Planting[] {
  const plants: Planting[] = [];
  function add(x:number,z:number,size=1,kind:Planting['kind']='tree') {
    const radius = kind==='tree'?4*size:1.3*size;
    const footprint={x,z,width:radius*2,depth:radius*2};
    if (!sceneryClear(footprint, .7)) return;
    if (plantingReserves.some(b=>Math.abs(x-b.x)<b.width/2+radius+1 && Math.abs(z-b.z)<b.depth/2+radius+1)) return;
    if (Math.abs(x-cityGate.x)<cityGate.width/2+radius+2 && Math.abs(z-cityGate.z)<cityGate.depth/2+radius+2) return;
    if (plants.some(p=>Math.hypot(p.x-x,p.z-z)<(p.kind==='tree'?4*p.size:1.3*p.size)+radius+1)) return;
    plants.push({x,z,size,kind});
  }
  // Paired avenue planting, with gaps at junctions and entrances.
  for (const edge of townMap.edges.filter(e=>e.kind==='road')) {
    const a=townMap.nodes.find(n=>n.id===edge.from)!,b=townMap.nodes.find(n=>n.id===edge.to)!;
    const length=Math.hypot(b.x-a.x,b.z-a.z), dx=(b.x-a.x)/length,dz=(b.z-a.z)/length;
    for(let s=17;s<length-13;s+=27) for(const side of [-1,1]) add(a.x+dx*s-dz*12*side,a.z+dz*s+dx*12*side,.85);
  }
  // Domestic garden corners leave the central doorstep approach open.
  for(const b of townMap.buildings) for(const side of [-1,1]) {
    add(b.x+side*(b.width/2+4.8),b.z-b.depth/2-3.8,.7);
    add(b.x+side*(b.width/2-2),b.z+b.depth/2+4.8,.75,'shrub');
  }
  // Small groves frame the green, hill garden and the lake; open lawns stay open.
  for(const [cx,cz] of [[79,96],[112,73],[164,106],[184,94],[192,-66],[173,-82],[116,-82],[100,-58],[-122,68],[-57,-121]])
    for(const [dx,dz,s] of [[0,0,1.15],[7,4,.85],[-6,5,.9]]) add(cx!+dx!,cz!+dz!,s!);
  return plants;
}
