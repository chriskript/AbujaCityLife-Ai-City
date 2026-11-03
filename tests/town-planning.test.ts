import { describe, expect, it, vi } from 'vitest';
import { planning, validateTownPlan, validateTownFurnishings, roadWidth } from '../shared/world/town-planning.js';
import { townMap } from '../shared/world/town-layout.js';
import { pathToNode } from '../shared/navigation/routes.js';
import { createTown } from '../shared/neighbourhood/town.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { projectNeighbourhood } from '../shared/neighbourhood/presentation.js';
import { RemoteNeighbourhoodSession } from '../client/src/simulation/remote-neighbourhood-session.js';

describe('Unity Gardens integrated planning', () => {
  it('keeps every footprint and setback clear of roads, sidewalks, paths, other plots and water', () => {
    expect(validateTownPlan()).toEqual([]);
    expect(validateTownFurnishings()).toEqual([]);
    const broken=structuredClone(townMap);
    broken.buildings[0]!.x=0;broken.buildings[0]!.z=0;
    expect(validateTownPlan(broken)).toContain('west-flats: stand-centre clearance');
    expect(planning.setback).toBeGreaterThanOrEqual(3);
    expect(roadWidth(townMap.edges.find(e=>e.id==='stand-centre')!)).toBeGreaterThan(roadWidth(townMap.edges.find(e=>e.id==='stand--west-lane')!));
  });

  it('connects all destinations on foot and every building entrance to the vehicle network', () => {
    const roadNodes=new Set(townMap.edges.filter(e=>e.kind==='road').flatMap(e=>[e.from,e.to]));
    const roadMap={...townMap,edges:townMap.edges.filter(e=>e.kind==='road')};
    const accessMap={...townMap,edges:townMap.edges.filter(e=>e.kind==='walk')};
    for(const node of townMap.nodes)expect(pathToNode('stand',node.id,new Set(),townMap),node.id).not.toBeNull();
    for(const building of townMap.buildings) {
      const access=[...roadNodes].find(node=>pathToNode(building.entrance,node,new Set(),accessMap));
      expect(access,building.id).toBeDefined();
      expect(pathToNode('stand',access!,new Set(),roadMap),building.id).not.toBeNull();
    }
    // The supply-market intervention retains its connected road detour.
    expect(pathToNode('centre','market',new Set(['centre-market']),roadMap)).not.toBeNull();
    expect(new Set(townMap.nodes.map(n=>n.id)).size).toBe(townMap.nodes.length);
    expect(new Set(townMap.edges.map(e=>e.id)).size).toBe(townMap.edges.length);
    expect(townMap.edges.every(e=>Number.isFinite(e.distance) && e.distance>0)).toBe(true);
  });

  it('provides a shared graph junction wherever two roads intersect',()=>{
    const roads=townMap.edges.filter(edge=>edge.kind==='road');
    for(const [index,first] of roads.entries())for(const second of roads.slice(index+1)){
      if([first.from,first.to].some(id=>[second.from,second.to].includes(id)))continue;
      const a=townMap.nodes.find(n=>n.id===first.from)!,b=townMap.nodes.find(n=>n.id===first.to)!;
      const c=townMap.nodes.find(n=>n.id===second.from)!,d=townMap.nodes.find(n=>n.id===second.to)!;
      const dx=b.x-a.x,dz=b.z-a.z,ex=d.x-c.x,ez=d.z-c.z,det=dx*ez-dz*ex;
      if(Math.abs(det)<1e-9)continue;
      const t=((c.x-a.x)*ez-(c.z-a.z)*ex)/det,u=((c.x-a.x)*dz-(c.z-a.z)*dx)/det;
      expect(t>=0 && t<=1 && u>=0 && u<=1,`${first.id} crosses ${second.id} without a junction`).toBe(false);
    }
  });

  it('migrates the old civic zero-length leg explicitly, retaining personal and economic history', () => {
    const state=createTown('layout-migration').snapshot;
    delete state.layoutRevision;
    state.npcs.chris!.node='north-office';
    state.npcs.chris!.activity={kind:'travel',path:{nodeIds:['north-office','community-office-entrance','community-office-work'],edgeIds:['north-office--community-office-entrance','community-office-entrance--community-office-work'],distance:10},step:0,progress:0,taskId:null,leg:null};
    const restored=Neighbourhood.restore(JSON.stringify(state)),after=restored.snapshot;
    expect(after.layoutRevision).toBe(2);
    expect(after.npcs.chris!.activity).toMatchObject({kind:'travel',path:{distance:18},progress:0});
    for(const id of Object.keys(state.npcs))for(const key of ['home','relationships','memories','inventory','knowledge'] as const)expect(after.npcs[id]![key]).toEqual(state.npcs[id]![key]);
    expect(after.town).toEqual(state.town);expect(after.tasks).toEqual(state.tasks);expect(after.communication).toEqual(state.communication);
    expect(Neighbourhood.restore(restored.serialize()).serialize()).toBe(restored.serialize());
    restored.advance(6);expect(restored.snapshot.npcs.chris!.node).toBe('community-office-work');
    if(state.npcs.chris!.activity.kind==='travel')state.npcs.chris!.activity.path.distance=999;
    expect(()=>Neighbourhood.restore(JSON.stringify(state))).toThrow('Invalid neighbourhood snapshot');
  });

  it('uses walking speed and consistent poses for a driver on pedestrian access', () => {
    const world=createTown('driver-access'),state=world.snapshot;
    state.npcs.musa.node='west-court';
    const path=pathToNode('west-court','west-flats-entrance',new Set(),townMap)!;
    state.npcs.musa.activity={kind:'travel',path,step:0,progress:0,taskId:null,leg:null};
    const restored=Neighbourhood.restore(JSON.stringify(state));restored.advance(1);
    expect(restored.snapshot.npcs.musa.activity).toMatchObject({kind:'travel',progress:4});
    const actor=projectNeighbourhood(restored.snapshot).snapshot.actors.find(n=>n.id==='musa')!;
    expect(actor.pathKind).toBe('walk');
    const a=townMap.nodes.find(n=>n.id==='west-court')!,b=townMap.nodes.find(n=>n.id==='west-flats-entrance')!;
    expect(actor.pose.x).toBeCloseTo(a.x+(b.x-a.x)*4/path.distance);
    expect(actor.pose.z).toBeCloseTo(a.z+(b.z-a.z)*4/path.distance);
  });

  it('rejects an older backend layout without displaying mismatched poses or issuing phone actions',async()=>{
    const projection=projectNeighbourhood(createTown('old-backend').snapshot);
    delete projection.snapshot.layoutRevision;
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({version:2,sessionId:'old',sequence:1,...projection}),{status:200}));
    vi.stubGlobal('fetch',fetcher);
    const remote=new RemoteNeighbourhoodSession(),received=vi.fn(),connections:string[]=[];
    remote.subscribe(received);remote.onConnection(state=>connections.push(state));
    try{
      await vi.waitFor(()=>expect(connections).toContain('incompatible'));
      expect(received).not.toHaveBeenCalled();expect(fetcher).toHaveBeenCalledTimes(1);
      await expect(remote.phone('amina')).rejects.toThrow('Restart the backend');
      expect(fetcher).toHaveBeenCalledTimes(1);
    }finally{remote.dispose();vi.unstubAllGlobals();}
  });
});
