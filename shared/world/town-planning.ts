import { townMap, type Building, type MapEdge, type TownMap } from './town-layout.js';

/** Metres. Shared by scenery, clearance checks and destination access. */
export const planning = {
  revision: 2,
  setback: 3,
  sidewalk: 2.5,
  lake: { x: 144, z: -40, radiusX: 47, radiusZ: 32 },
  green: { x: 95, z: 85, width: 30, depth: 28 },
} as const;
export const publicSpaces = [
  { id:'stand', name:'Taxi Stand', description:'Transport · A waiting court beside Stand Road. Musa starts here and collects local delivery work.' },
  { id:'town-green', name:'Town Green', description:'Recreation · A shaded neighbourhood meeting place, with paths toward Hill Garden and Market Street.' },
  { id:'overlook', name:'Lake Overlook', description:'Lakeside · A public scenic destination connected to the sheltered promenade.' },
  { id:'hill', name:'Hill Garden', description:'Recreation · A quiet garden at the end of Hill Road, connected to the green and lakeside.' },
  { id:'lakeside-gate', name:'Lakeside Promenade', description:'Lakeside · A pedestrian approach to the waterfront shelter. Reach it from Lake Overlook.' },
] as const;
export const townFurnishings = {
  stalls:[52,57,75,80].map((x,index)=>({id:`market-stall-${index}`,x,z:55,width:4.5,depth:3})),
  stock:{id:'market-stock',x:86.6,z:60,width:4.65,depth:1.3},
  supplies:{id:'supply-crates',x:71.6,z:-16,width:4.65,depth:1.3},
  benches:[{id:'green-west-bench',x:86,z:81.5,width:6,depth:1.3},{id:'green-east-bench',x:107,z:90,width:6,depth:1.3},{id:'hill-bench',x:161,z:96,width:6,depth:1.3}],
};

export function roadWidth(edge: MapEdge): number {
  return edge.kind === 'walk' ? 4 : edge.kind === 'indoor' ? 0 : edge.id.includes('--') ? 6 : 8;
}
export function zoneFor(building: Building): string {
  if (building.units.length) return 'Residential';
  if (['care', 'office', 'learning'].includes(building.kind)) return 'Civic';
  return building.kind === 'depot' ? 'Service & logistics' : 'Commercial';
}

type Point = { x: number; z: number };
export function pointSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x-a.x, dz = b.z-a.z;
  const t = Math.max(0, Math.min(1, ((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz || 1)));
  return Math.hypot(p.x-a.x-t*dx, p.z-a.z-t*dz);
}
export function corridorDistance(a: Point, b: Point, building: Pick<Building,'x'|'z'|'width'|'depth'>): number {
  const minX=building.x-building.width/2, maxX=building.x+building.width/2;
  const minZ=building.z-building.depth/2, maxZ=building.z+building.depth/2;
  // Slab intersection, then the minimum distance between segment and rectangle.
  let enter=0, leave=1;
  for (const [origin, delta, min, max] of [[a.x,b.x-a.x,minX,maxX],[a.z,b.z-a.z,minZ,maxZ]]) {
    if (Math.abs(delta!)<1e-9) { if(origin!<min! || origin!>max!) { enter=2; break; } }
    else { const t1=(min!-origin!)/delta!, t2=(max!-origin!)/delta!; enter=Math.max(enter,Math.min(t1,t2)); leave=Math.min(leave,Math.max(t1,t2)); }
  }
  if(enter<=leave) return 0;
  const corners=[{x:minX,z:minZ},{x:minX,z:maxZ},{x:maxX,z:minZ},{x:maxX,z:maxZ}];
  const toBox=(p:Point)=>Math.hypot(Math.max(minX-p.x,0,p.x-maxX),Math.max(minZ-p.z,0,p.z-maxZ));
  return Math.min(toBox(a),toBox(b),...corners.map(p=>pointSegmentDistance(p,a,b)));
}

/** No renderer-only collision exceptions: entries are the authoritative graph nodes. */
export function validateTownPlan(map: TownMap = townMap): string[] {
  const errors:string[]=[];
  const byId=new Map(map.nodes.map(node=>[node.id,node]));
  for(const b of map.buildings) {
    const entrance=byId.get(b.entrance);
    if(!entrance || Math.abs(entrance.x-b.x)<b.width/2 && Math.abs(entrance.z-b.z)<b.depth/2) errors.push(`${b.id}: entrance inside footprint`);
    const lake=planning.lake;
    const dx=Math.max(0,Math.abs(b.x-lake.x)-b.width/2-planning.setback)/lake.radiusX;
    const dz=Math.max(0,Math.abs(b.z-lake.z)-b.depth/2-planning.setback)/lake.radiusZ;
    if(dx*dx+dz*dz<=1)errors.push(`${b.id}: water clearance`);
    for(const edge of map.edges) {
      if(edge.kind==='indoor')continue;
      const a=byId.get(edge.from)!, c=byId.get(edge.to)!;
      if(!a || !c){errors.push(`${edge.id}: invalid edge`);continue;}
      const clearance=roadWidth(edge)/2+(edge.kind==='walk'?0:planning.sidewalk+planning.setback);
      if(corridorDistance(a,c,b)<clearance-1e-6) errors.push(`${b.id}: ${edge.id} clearance`);
    }
    for(const other of map.buildings)if(b.id<other.id && Math.abs(b.x-other.x)<(b.width+other.width)/2+2*planning.setback && Math.abs(b.z-other.z)<(b.depth+other.depth)/2+2*planning.setback)errors.push(`${b.id}: ${other.id} plot overlap`);
  }
  for(const edge of map.edges) {
    const a=byId.get(edge.from), b=byId.get(edge.to);
    if(!a || !b || !(edge.distance>0)) { errors.push(`${edge.id}: invalid edge`);continue; }
    if(edge.kind==='indoor')continue;
    const lake=planning.lake, half=roadWidth(edge)/2+(edge.kind==='road'?planning.sidewalk:0);
    if(pointSegmentDistance({x:0,z:0},{x:(a.x-lake.x)/(lake.radiusX+half),z:(a.z-lake.z)/(lake.radiusZ+half)},{x:(b.x-lake.x)/(lake.radiusX+half),z:(b.z-lake.z)/(lake.radiusZ+half)})<1)errors.push(`${edge.id}: water crossing`);
  }
  return errors;
}

export function validateTownFurnishings(map:TownMap=townMap):string[] {
  const errors:string[]=[];
  for(const prop of [...townFurnishings.stalls,townFurnishings.stock,townFurnishings.supplies,...townFurnishings.benches]){
    for(const edge of map.edges){
      if(edge.kind==='indoor')continue;
      const a=map.nodes.find(n=>n.id===edge.from)!,b=map.nodes.find(n=>n.id===edge.to)!;
      if(corridorDistance(a,b,prop)<roadWidth(edge)/2+(edge.kind==='road'?planning.sidewalk:0))errors.push(`${prop.id}: ${edge.id} clearance`);
    }
    for(const building of map.buildings)if(Math.abs(prop.x-building.x)<(prop.width+building.width)/2 && Math.abs(prop.z-building.z)<(prop.depth+building.depth)/2)errors.push(`${prop.id}: ${building.id} footprint`);
  }
  return errors;
}
