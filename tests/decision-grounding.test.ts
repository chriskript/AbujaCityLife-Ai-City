import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {createTown} from '../shared/neighbourhood/town.js';
import {Neighbourhood} from '../shared/neighbourhood/world.js';
import {prepareModelInput} from '../server/inference/model-context.js';
import {decisionGrounding} from '../server/inference/decision-grounding.js';
import {carriedGoods} from '../shared/neighbourhood/personal-rules.js';
import type {NpcDecisionRequest,Action} from '../shared/neighbourhood/types.js';
const fixture=JSON.parse(readFileSync('tests/fixtures/economic-grounding-contexts.json','utf8')) as {cases:{number:number;request:NpcDecisionRequest;decision:unknown}[]};

describe('informed personal, inventory and social choices without a hidden policy',()=>{
  it('grounds the recorded hungry and fatigued work decisions while leaving work available',()=>{
    for(const c of fixture.cases.filter(c=>[140,161].includes(c.number))){
      const original=structuredClone(c.request),p=prepareModelInput(c.request,'decision'),g=p.input.observation.decisionContext;
      expect(g.personal!.current.hunger).toBe(1);expect(g.personal!.current.fatigue).toBeGreaterThanOrEqual(.99);
      expect(g.personal!.scale).toContain('maximum unmet');expect(g.personal!.effects).toContain('does not feed or rest');
      expect(g.personal!.rest.knownPlaces.some(p=>p.id===c.request.observation.actor.home)).toBe(true);
      expect(p.schema.properties.action.anyOf.some(b=>b.properties.type.enum[0]==='take-work')).toBe(true);
      expect(p.input.observation.town!.eligibleWorkIds).toEqual(original.observation.town!.eligibleWorkIds);
      expect(c.request).toEqual(original);expect(g).not.toHaveProperty('recommendedAction');
    }
  });
  it('makes the personal-food subset explicit in every recorded stocking failure without correcting proposals',()=>{
    for(const c of fixture.cases.filter(c=>[72,92,119].includes(c.number))){
      const p=prepareModelInput(c.request,'decision'),g=p.input.observation.decisionContext;
      expect(g.inventory).toMatchObject({total:2,personalFood:2,restockable:0,canStockHere:false,foodIsSubsetOfTotal:true});
      expect(p.schema.properties.action.anyOf.some(b=>b.properties.type.enum[0]==='stock-stall')).toBe(true);
      expect(g.personal!.food.held).toBe(2);
      expect((c.decision as {action:unknown}).action).toEqual({type:'stock-stall',quantity:2});
    }
    expect(carriedGoods(6,2,3).restockable).toBe(1);
  });
  it('records precise failure feedback, then allows a distinct independently supplied alternative',()=>{
    const w=createTown('fresh-failure'),s=w.snapshot;s.npcs.amina.inventory.goods=2;s.npcs.amina.inventory.food=2;s.resources.supplierGoods-=2;
    const restored=Neighbourhood.restore(JSON.stringify(s)),r=restored.requestInteractionDecision('amina')!,before=restored.snapshot;
    expect(restored.applyDecision(r.id,{goalId:'restock',reason:'Offline replay of the actual invalid proposal',action:{type:'stock-stall',quantity:2}},{mode:'mock',model:'offline-grounding'}).reason).toBe('missing-stall-supplies');
    expect(restored.snapshot.resources).toEqual(before.resources);expect(restored.snapshot.npcs.amina.inventory).toEqual(before.npcs.amina.inventory);
    const next=restored.requestDecision('amina')!,prepared=prepareModelInput(next,'decision');expect(next.id).not.toBe(r.id);
    expect(prepared.input.observation.decisionContext.failure!.explanation).toContain('Personal food');
    expect(next.observation.actor.memories.at(-1)!.detail).toContain('only 0 can stock');
    expect(restored.applyDecision(next.id,{goalId:'restock',reason:'Independently supplied offline alternative; no retry/correction',action:{type:'order-external',businessId:'market',quantity:2}},{mode:'mock',model:'offline-alternative'}).accepted).toBe(true);
  });
  it('surfaces already-legitimate social choices without adding people, numbers, addresses or friendships',()=>{
    const w=createTown('opportunities');w.enableSocialVisits();const before=w.serialize();
    for(const id of w.residentIds){const o=w.observe(id),g=decisionGrounding(o).social!;
      expect(g.textCandidates).toEqual(o.communication!.canContact);expect(g.venues).toEqual(o.socialVisits!.venues);
      for(const p of g.nearbyKnown)expect(o.actor.knowledge.people).toContain(p.id);
      for(const p of g.introductions)expect(p.identity).toBeNull();
      expect(g.rules).toContain('choose solitude');expect(g.rules).toContain('No private home entry');
      expect(JSON.stringify(g)).not.toContain('remoteNeeds');expect(g).not.toHaveProperty('recommendedPartner');
    }
    expect(w.serialize()).toBe(before);
  });
  it('keeps remote availability uncertain and food, rest and social choices optional after projection',()=>{
    const w=createTown('remote');w.enableSocialVisits();const r=w.requestDecision('emeka')!,p=prepareModelInput(r,'decision'),g=p.input.observation.decisionContext;
    expect(g.personal!.food.marketStock!.value).toBeNull();expect(p.input.observation.town!.purchase!.canBuyOneNow).toBeNull();
    for(const type of ['take-work','travel','invite-social','communicate','wait'])expect(p.schema.properties.action.anyOf.some(b=>b.properties.type.enum[0]===type)).toBe(true);
    expect(JSON.stringify(p.input).length).toBeLessThanOrEqual(24000);
  });
  it('exposes a host doorstep only after delivery and retains independent refusal and private-unit boundaries',()=>{
    const w=createTown('host-context');w.enableSocialVisits();
    const host=w.observe('amina'),door=host.socialVisits!.venues.find(v=>v.kind==='home-doorstep')!.id;
    const r=w.requestInteractionDecision('amina')!;
    expect(w.applyDecision(r.id,{goalId:'serve',reason:'Offline invitation fixture',action:{type:'invite-social',recipient:'musa',destination:door,channel:'text',seconds:60,message:'Would you like to visit my doorstep?'}},{mode:'mock',model:'offline-host-fixture'}).accepted).toBe(true);
    expect(decisionGrounding(w.observe('musa')).social!.venues.some(v=>v.id===door)).toBe(false);w.advance(5);
    const recipient=w.requestInteractionDecision('musa')!,p=prepareModelInput(recipient,'decision');
    expect(p.input.observation.decisionContext.social!.venues.some(v=>v.id===door)).toBe(true);
    expect(p.input.observation.places.some(v=>v.id===host.actor.home)).toBe(false);
    expect(p.schema.properties.action.anyOf.some(b=>b.properties.type.enum[0]==='respond-social')).toBe(true);
    const before=w.snapshot.npcs.musa.relationships;
    expect(w.applyDecision(recipient.id,{goalId:'earn',reason:'I prefer solitude in this offline fixture',action:{type:'respond-social',invitationId:'social-1',response:'decline',destination:null,message:'I would rather be alone.'}},{mode:'mock',model:'offline-recipient-fixture'}).accepted).toBe(true);
    expect(w.snapshot.npcs.musa.relationships).toEqual(before);
  });
  it('protects committed delivery cargo from stocking even when an actor also has the stocking capability',()=>{
    const s=createTown('cargo-grounding').snapshot;s.npcs.musa.node='market';s.npcs.musa.capabilities.push('stock-stall');
    const w=Neighbourhood.restore(JSON.stringify(s));
    const act=(id:string,action:Action)=>{const r=w.requestInteractionDecision(id)!;return w.applyDecision(r.id,{goalId:r.observation.actor.goals[0]!.id,reason:'Offline cargo protection fixture',action},{mode:'mock',model:'offline-cargo-fixture'});};
    expect(act('amina',{type:'propose-transport',recipient:'musa',quantity:2}).accepted).toBe(true);
    expect(act('musa',{type:'respond-transport',taskId:'task-1',accept:true}).accepted).toBe(true);
    expect(act('musa',{type:'fulfil-transport',taskId:'task-1'}).accepted).toBe(true);
    for(let n=0;n<240&&w.snapshot.tasks['task-1']!.status==='accepted';n++)w.advance(.25);
    const movement=w.snapshot.npcs.musa.activity;if(movement.kind!=='travel')throw new Error('Expected delivery movement');
    const edge=movement.path.edgeIds[movement.step]!;expect(w.setRoadBlocked(edge,true)).toBe(true);w.advance(.25);expect(w.setRoadBlocked(edge,false)).toBe(true);
    expect(w.snapshot.tasks['task-1']!.status).toBe('collected');
    expect(act('musa',{type:'travel',destination:'market'}).accepted).toBe(true);w.advance(60);
    const before=w.snapshot;
    expect(decisionGrounding(w.observe('musa')).inventory).toMatchObject({total:2,committedCargo:2,restockable:0});
    expect(act('musa',{type:'stock-stall',quantity:2}).reason).toBe('missing-stall-supplies');
    expect(w.snapshot.resources).toEqual(before.resources);expect(w.snapshot.tasks).toEqual(before.tasks);expect(w.snapshot.npcs.musa.inventory).toEqual(before.npcs.musa.inventory);
  });
});
