import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { createTown } from '../shared/neighbourhood/town.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { assertSnapshot } from '../shared/neighbourhood/snapshot.js';
import { prepareModelInput } from '../server/inference/model-context.js';
import { ordinaryRejection } from '../shared/neighbourhood/decision-recovery.js';
import { NeighbourhoodMockProvider } from '../shared/neighbourhood/mock-provider.js';
import type { Action } from '../shared/neighbourhood/types.js';

const provenance={mode:'mock',model:'offline-economic-contract'} as const;
function apply(w:Neighbourhood,id:string,action:Action){
  const r=w.requestInteractionDecision(id)!;expect(r).not.toBeNull();
  const decision={goalId:r.observation.actor.goals[0]!.id,reason:'Offline fixture; no live model evidence',action};
  return {request:r,decision,outcome:w.applyDecision(r.id,decision,provenance)};
}
function atMarket(){const s=createTown('scarcity').snapshot;s.npcs.zainab.node='market';s.npcs.amina.node='market';s.npcs.ngozi!.node='market';return Neighbourhood.restore(JSON.stringify(s));}
function assets(w:Neighbourhood){const s=w.snapshot;return {resources:s.resources,inventories:Object.fromEntries(Object.values(s.npcs).map(n=>[n.id,n.inventory])),businesses:s.town!.businesses,tasks:s.tasks,trade:s.trade};}

describe('scarcity, learning and explicit economic continuity',()=>{
  it('reproduces Phase D request 19 from immutable recorded evidence and refreshes only legitimate local stock',async()=>{
    const recorded=JSON.parse(readFileSync('tests/fixtures/phase-d-purchase.json','utf8'));
    expect(recorded.time).toBe(93);
    expect(recorded.market.stock).toMatchObject({value:0,observedAt:30.25,freshness:'historical'});
    const w=atMarket();apply(w,'ngozi',{type:'buy',quantity:1});w.advance(60);w.advance(33);
    const before=assets(w),r=w.requestInteractionDecision('zainab')!;
    const o=r.observation,stock=o.placeKnowledge.find(p=>p.placeId==='market')!.stock;
    expect(stock).toMatchObject({value:0,observedAt:93,freshness:'current'});
    const prepared=prepareModelInput(r,'decision');expect(JSON.stringify(prepared.input)).toContain('visible-stock:zainab:market');
    expect(w.applyDecision(r.id,recorded.decision,provenance).reason).toBe('insufficient-stock');expect(assets(w)).toEqual(before);
    const next=w.requestDecision('zainab')!;expect(next.id).not.toBe(r.id);expect(next.observation.decisionRecovery?.reason).toBe('insufficient-stock');
    expect(next.observation.actor.memories.at(-1)?.detail).toContain('No transaction');
    expect(w.observe('musa').actor.memories.some(m=>m.eventId===next.observation.actor.memories.at(-1)!.eventId)).toBe(false);
    const offline=await new NeighbourhoodMockProvider().decide(next);expect((offline.decision as any).action).toEqual({type:'wait',seconds:20});
    expect(w.applyDecision(next.id,offline.decision,provenance).accepted).toBe(true);expect(w.snapshot.npcs.zainab.activity).toMatchObject({kind:'wait'});
    // Merely leaving does not retain the read-time snapshot as current remote knowledge.
    const remote=w.observe('fatima').placeKnowledge.find(p=>p.placeId==='market')!;expect(remote.stock.freshness).not.toBe('current');
  });
  it('serialises competing purchases and leaves assets unchanged on insufficient or empty stock',()=>{
    const w=atMarket();expect(apply(w,'zainab',{type:'buy',quantity:2}).outcome.reason).toBe('insufficient-stock');
    expect(apply(w,'zainab',{type:'buy',quantity:1}).outcome.accepted).toBe(true);
    const before=assets(w);expect(apply(w,'ngozi',{type:'buy',quantity:1}).outcome.reason).toBe('insufficient-stock');expect(assets(w)).toEqual(before);assertSnapshot(w.snapshot);
  });
  it('revalidates simultaneous purchase proposals against intervening sales without a second debit',()=>{
    const w=atMarket(),first=w.requestInteractionDecision('zainab')!,second=w.requestInteractionDecision('ngozi')!;
    const decision=(r:typeof first)=>({goalId:r.observation.actor.goals[0]!.id,reason:'Offline competing buyer fixture',action:{type:'buy',quantity:1}});
    expect(w.applyDecision(first.id,decision(first),provenance).accepted).toBe(true);const before=assets(w);
    expect(w.applyDecision(second.id,decision(second),provenance).accepted).toBe(false);expect(assets(w)).toEqual(before);
    expect(w.observe('ngozi').decisionRecovery).toBeDefined();assertSnapshot(w.snapshot);
  });
  it('retains historical information remotely, while current local visibility is fresh and unknown remote stock stays unknown',()=>{
    const w=atMarket();apply(w,'zainab',{type:'buy',quantity:1});
    const s=w.snapshot;s.npcs.zainab.node=s.npcs.zainab.home!;const restored=Neighbourhood.restore(JSON.stringify(s));restored.advance(1);
    expect(restored.observe('zainab').placeKnowledge.find(p=>p.placeId==='market')!.stock).toMatchObject({value:0,freshness:'historical'});
    expect(restored.observe('grace').placeKnowledge.find(p=>p.placeId==='market')!.stock.value).toBeNull();
    expect(restored.observe('grace').wholesale!.offers).toEqual([]);
  });
  it('bounds repeated failures per resident across recovery without retrying or blocking others',()=>{
    let w=atMarket();apply(w,'ngozi',{type:'buy',quantity:1});
    for(let i=0;i<3;i++){expect(apply(w,'zainab',i%2?{quantity:1,type:'buy'}:{type:'buy',quantity:1}).outcome.reason).toBe('insufficient-stock');if(i<2)w.advance(20);}
    expect(w.requestDecision('zainab')).toBeNull();const until=w.observe('zainab').decisionRecovery!.blockedUntil;
    w=Neighbourhood.restore(w.serialize());expect(w.requestDecision('zainab')).toBeNull();expect(w.requestDecision('musa')).not.toBeNull();
    while(w.time<until)w.advance(Math.min(60,until-w.time));expect(w.requestDecision('zainab')).not.toBeNull();
    expect(ordinaryRejection('invalid-schema')).toBe(false);expect(ordinaryRejection('unknown-recipient')).toBe(false);
    assertSnapshot(w.snapshot);
  });
  it('places paid finite wholesale food orders, recovers pending delivery once, and conserves money and goods',()=>{
    let w=atMarket();const before=w.snapshot,coins=before.npcs.amina.inventory.coins!;
    const placed=apply(w,'amina',{type:'order-external',businessId:'market',quantity:6});expect(placed.outcome.accepted).toBe(true);
    expect(w.snapshot.resources.marketGoods).toBe(before.resources.marketGoods);expect(w.snapshot.npcs.amina.inventory.coins).toBe(coins-6);
    expect(w.snapshot.trade).toMatchObject({spent:6,sourceRemaining:234,importedFood:0});
    expect(apply(w,'amina',{type:'order-external',businessId:'market',quantity:1}).outcome.reason).toBe('order-pending');
    w.advance(30);w=Neighbourhood.restore(w.serialize());w.advance(30);assertSnapshot(w.snapshot);
    expect(w.snapshot.resources.marketGoods).toBe(before.resources.marketGoods+6);expect(w.snapshot.trade!.importedFood).toBe(6);
    w=Neighbourhood.restore(w.serialize());w.advance(60);expect(w.snapshot.resources.marketGoods).toBe(before.resources.marketGoods+6);
    expect(w.snapshot.events.filter(e=>e.type==='external-order-delivered')).toHaveLength(1);
    expect(w.observe('grace').resources.marketGoods).toBeNull();
    expect(w.snapshot.npcs.zainab.inventory).toEqual(before.npcs.zainab.inventory);
  });
  it('enforces ownership, personal affordability, source exhaustion, owner funding and raw-input accounting',()=>{
    const s=createTown('inputs').snapshot;s.npcs.halima!.node='centre';s.town!.initialInputs=0;s.town!.rawInputs=0;
    const w=Neighbourhood.restore(JSON.stringify(s));
    expect(apply(w,'halima',{type:'order-external',businessId:'supply-desk',quantity:6}).outcome.accepted).toBe(true);
    const before=assets(w);expect(apply(w,'amina',{type:'order-external',businessId:'supply-desk',quantity:1}).outcome.reason).toBe('not-business-owner');expect(assets(w)).toEqual(before);
    w.advance(60);expect(w.snapshot.town!.rawInputs).toBe(6);expect(w.snapshot.trade!.importedInputs).toBe(6);assertSnapshot(w.snapshot);
    expect(apply(w,'halima',{type:'fund-business',businessId:'supply-desk',quantity:6}).outcome.accepted).toBe(true);expect(w.snapshot.npcs.halima!.inventory.coins).toBe(0);
    expect(apply(w,'halima',{type:'order-external',businessId:'supply-desk',quantity:1}).outcome.reason).toBe('insufficient-funds');assertSnapshot(w.snapshot);
    const corrupt=w.snapshot;corrupt.trade!.importedInputs++;expect(()=>Neighbourhood.restore(JSON.stringify(corrupt))).toThrow();
  });
  it('exhausts finite external supply through real paid orders without resetting the source or local assets',()=>{
    const s=atMarket().snapshot;
    // Explicit test fixture pools existing money; no new currency enters the world.
    for(const n of Object.values(s.npcs))n.inventory.coins=0;
    for(const b of Object.values(s.town!.businesses))b.coins=0;
    s.npcs.amina.inventory.coins=s.town!.initialMoney;
    const w=Neighbourhood.restore(JSON.stringify(s));
    for(let i=0;i<40;i++){
      expect(apply(w,'amina',{type:'order-external',businessId:'market',quantity:6}).outcome.accepted).toBe(true);
      w.advance(60);expect(apply(w,'amina',{type:'buy',quantity:6}).outcome.accepted).toBe(true);
      expect(apply(w,'amina',{type:'eat',quantity:6}).outcome.accepted).toBe(true);w.advance(60);assertSnapshot(w.snapshot);
    }
    const before=assets(w);expect(w.snapshot.trade!.sourceRemaining).toBe(0);
    expect(apply(w,'amina',{type:'order-external',businessId:'market',quantity:1}).outcome.reason).toBe('external-source-exhausted');expect(assets(w)).toEqual(before);
    expect(Neighbourhood.restore(w.serialize()).snapshot.trade!.sourceRemaining).toBe(0);
  },30_000);
  it('keeps player-controlled wholesale orders subject to the same account and ownership checks',()=>{
    const w=atMarket();const before=assets(w);
    expect(w.applyPhoneAction('amina',{type:'order-external',businessId:'supply-desk',quantity:1}).accepted).toBe(false);expect(assets(w)).toEqual(before);
    expect(w.applyPhoneAction('amina',{type:'order-external',businessId:'market',quantity:2}).accepted).toBe(true);
    expect(w.snapshot.npcs.amina.inventory.coins).toBe(22);expect(w.snapshot.trade!.spent).toBe(2);
  });
  it('migrates old town checkpoints idempotently without giving local goods, cash or historical transactions',()=>{
    const old=createTown('old-economy').snapshot;delete old.trade;for(const n of Object.values(old.npcs))n.capabilities=n.capabilities.filter(c=>!['order-external','fund-business'].includes(c));
    const w=Neighbourhood.restore(JSON.stringify(old)),s=w.snapshot;
    expect(s.resources).toEqual(old.resources);expect(s.events).toEqual(old.events);expect(s.tasks).toEqual(old.tasks);
    for(const n of Object.values(old.npcs)){expect(s.npcs[n.id]!.inventory).toEqual(n.inventory);expect(s.npcs[n.id]!.relationships).toEqual(n.relationships);expect(s.npcs[n.id]!.memories).toEqual(n.memories);}
    expect(Neighbourhood.restore(w.serialize()).snapshot).toEqual(s);expect(s.trade!.orders).toEqual([]);
    expect(Object.keys(s.npcs)).toHaveLength(16);
  });
  it('never automatically restocks a shortage when time advances without resident choices',()=>{
    const w=atMarket();apply(w,'ngozi',{type:'buy',quantity:1});const before=w.snapshot;
    for(let i=0;i<30;i++)w.advance(60);
    expect(w.snapshot.resources).toEqual(before.resources);expect(w.snapshot.trade).toEqual(before.trade);assertSnapshot(w.snapshot);
  });
});
