import { nodes as legacyNodes, edges as legacyEdges, type RoadNode, type RoadEdge } from './neighbourhood.js';

export type MapId = 'legacy-v1' | 'town-v1';
export interface MapNode extends RoadNode { name?:string; kind?:'street'|'entrance'|'home'|'workplace'|'park'; buildingId?:string }
export interface MapEdge extends RoadEdge { kind?:'road'|'walk'|'indoor' }
export interface Building { id:string; name:string; address:string; kind:'flats'|'house'|'workshop'|'office'|'learning'|'market'|'depot'|'care'|'tailor'; x:number;z:number;width:number;depth:number;floors:number; entrance:string; units:string[]; businessId?:string; color:string }
export interface TownMap { id:MapId; nodes:readonly MapNode[];edges:readonly MapEdge[];places:readonly {id:string;node:string;name:string}[];buildings:readonly Building[];bounds:{minX:number;maxX:number;minZ:number;maxZ:number} }
export const legacyPlaces=[{id:'stand',node:'stand',name:'Taxi Stand'},{id:'market',node:'market',name:'Market Square'},{id:'centre',node:'centre',name:'Community Centre supply desk'},{id:'overlook',node:'overlook',name:'Lake Overlook'},{id:'hill',node:'hill',name:'Hill Garden'}];
const nodes:MapNode[]=legacyNodes.map(node=>({...node,name:legacyPlaces.find(place=>place.id===node.id)?.name ?? node.id}));
const edges:MapEdge[]=legacyEdges.map(edge=>({...edge,kind:'road'}));
const buildings:Building[]=[];
function node(id:string,x:number,z:number,name:string,kind:MapNode['kind']='street',buildingId?:string){nodes.push({id,x,z,name,kind,...(buildingId?{buildingId}:{})});return id;}
function link(a:string,b:string,kind:MapEdge['kind']='road',distance?:number){const from=nodes.find(n=>n.id===a)!,to=nodes.find(n=>n.id===b)!;edges.push({id:`${a}--${b}`,from:a,to:b,distance:distance ?? Math.hypot(to.x-from.x,to.z-from.z),kind});}
const streets:[string,number,number][]=[['west-lane',-40,0],['west-court',-85,0],['north-west',-85,-65],['north-mid',-25,-65],['north-office',8,-65],['north-east',40,-65],['south-west',-50,40],['south-court',-50,110],['south-mid',40,110],['south-east',120,110],['east-south',120,150],['east-end',210,150],['east-mid',210,117],['east-north',210,80]];
for(const [id,x,z]of streets)node(id,x,z,id.split('-').join(' '));
for(const path of [['stand','west-lane','west-court','north-west','north-mid','north-office','north-east','centre'],['west','south-west','south-court','south-mid','market'],['south-mid','south-east','east-south','east-end','east-mid','east-north','hill']])for(let i=1;i<path.length;i++)link(path[i-1]!,path[i]!);
function home(id:string,name:string,address:string,x:number,z:number,entranceX:number,entranceZ:number,street:string,kind:'flats'|'house',color:string){
 const entrance=node(`${id}-entrance`,entranceX,entranceZ,`${name} entrance`,'entrance',id);link(street,entrance,'walk');
 const units=Array.from({length:kind==='flats'?4:1},(_,i)=>{
  const unit=`${id}-${kind==='flats'?`flat-${i+1}`:'home'}`;node(unit,x+(i%2?2:-2),z+(i>=2?2:-2),`${kind==='flats'?`Flat ${i+1}, `:''}${address}`,'home',id);link(entrance,unit,'indoor',8+Math.floor(i/2)*5);return unit;
 });
 buildings.push({id,name,address,kind,x,z,width:kind==='flats'?24:16,depth:kind==='flats'?22:16,floors:kind==='flats'?2:1,entrance,units,color});
}
home('west-flats','Acacia Court','12 Acacia Lane',-110,30,-94,30,'west-court','flats','#e7aa54');
home('north-flats','Centre Gardens','8 Centre Gardens',-30,-112,-30,-96,'north-mid','flats','#ca6850');
home('market-flats','Market View','14 Market Street',-15,145,-15,129,'south-court','flats','#4e91a0');
home('hill-flats','Hill Court','6 Hill Road',235,117,219,117,'east-mid','flats','#bd8170');
home('tunde-house','Acacia Bungalow','4 Acacia Lane',-111,-27,-97,-27,'west-court','house','#edc880');
home('fatima-house','Garden Cottage','3 Centre Gardens',-78,-105,-78,-92,'north-west','house','#e4b89b');
home('halima-house','North Courtyard','11 Centre Gardens',20,-112,20,-98,'north-east','house','#da9d69');
home('amina-house','Market Compound','5 Market Street',-94,110,-80,110,'south-court','house','#e9bc75');
export const initialHomes:Record<string,string>={musa:'west-flats-flat-1',emeka:'west-flats-flat-2',sadiq:'west-flats-flat-3',zainab:'north-flats-flat-1',yusuf:'north-flats-flat-2',maryam:'north-flats-flat-3',ngozi:'market-flats-flat-1',ladi:'market-flats-flat-2',bisi:'market-flats-flat-3',chris:'hill-flats-flat-1',ibrahim:'hill-flats-flat-2',grace:'hill-flats-flat-3',tunde:'tunde-house-home',fatima:'fatima-house-home',halima:'halima-house-home',amina:'amina-house-home'};
function workplace(id:string,businessId:string,name:string,address:string,kind:Building['kind'],x:number,z:number,w:number,d:number,street:string,ex:number,ez:number,color:string,existing?:string){
 const entrance=existing ?? node(`${id}-entrance`,ex,ez,`${name} entrance`,'entrance',id);
 if(!existing)link(street,entrance,'walk');
 const workspace=existing ?? node(`${id}-work`,x,z,name,'workplace',id);if(!existing)link(entrance,workspace,'indoor',10);
 buildings.push({id,businessId,name,address,kind,x,z,width:w,depth:d,floors:kind==='office'?2:1,entrance,units:[],color});return workspace;
}
export const workSites:Record<string,string>={
 market:workplace('market-stalls','market','Market Square','1 Market Square','market',48,63,30,18,'market',40,40,'#e8c168','market'),
 'supply-desk':workplace('supply-depot','supply-desk','Supply Cooperative','2 Centre Road','depot',53,-13,18,16,'centre',40,0,'#b8a784','centre'),
 'repair-workshop':workplace('repair-shop','repair-workshop','Tunde’s Workshop','2 Acacia Lane','workshop',-36,-22,24,18,'west-lane',-36,-8,'#c87b47'),
 'utility-work':workplace('electrical-shop','utility-work','Electrical Workshop','3 Stand Road','workshop',-23,24,18,16,'west',-10,24,'#6097a0'),
 'care-desk':workplace('care-office','care-desk','Community Care','4 Centre Road','care',4,-38,20,18,'north-east',18,-38,'#e2d5af'),
 'community-errands':workplace('community-office','community-errands','Community Offices','6 Centre Road','office',8,-79,22,18,'north-office',8,-65,'#ce7c61'),
 'learning-desk':workplace('learning-centre','learning-desk','Learning Centre','7 Market Street','learning',-82,67,20,18,'south-west',-67,67,'#75a69b'),
 'tailoring-desk':workplace('tailoring-shop','tailoring-desk','Bisi’s Tailoring','18 Market Street','tailor',72,143,20,18,'south-mid',72,129,'#b481a8'),
};
export const initialLocations:Record<string,string>={fatima:'home',ibrahim:'home',grace:'home',maryam:'home',tunde:workSites['repair-workshop']!,emeka:workSites['utility-work']!,yusuf:workSites['learning-desk']!,bisi:workSites['tailoring-desk']!};
node('town-green',95,85,'Town Green','park');link('south-east','town-green','walk');
export const townMap:TownMap={id:'town-v1',nodes,edges,buildings,places:nodes.filter(n=>n.kind!=='street').map(n=>({id:n.id,node:n.id,name:n.name!})),bounds:{minX:-140,maxX:250,minZ:-140,maxZ:180}};
export const legacyMap:TownMap={id:'legacy-v1',nodes:legacyNodes,edges:legacyEdges,places:legacyPlaces,buildings:[],bounds:{minX:-80,maxX:215,minZ:-77,maxZ:129}};
export function mapFor(id:MapId):TownMap{return id==='town-v1'?townMap:legacyMap;}
export function addressFor(nodeId:string,mapId:MapId):string|undefined{return mapFor(mapId).places.find(p=>p.id===nodeId)?.name;}
export function buildingFor(nodeId:string,mapId:MapId):Building|undefined{const map=mapFor(mapId),point=map.nodes.find(n=>n.id===nodeId);return map.buildings.find(b=>b.id===point?.buildingId || b.entrance===nodeId);}
