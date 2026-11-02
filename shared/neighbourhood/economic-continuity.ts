import type { Action, NpcObservation, WorldState } from './types.js';
import type { CommunicationHost } from './communication.js';

// A finite external wholesaler, not local stock and never an automatic refill.
export const wholesaleRules = {unitPrice:1, deliverySeconds:60, cooldownSeconds:120, maximumQuantity:6, sourceLimit:240} as const;
export function enableEconomicContinuity(state:WorldState):void {
  if(!state.town)return;
  state.trade ??= {version:1,nextId:1,sourceRemaining:240,spent:0,importedFood:0,importedInputs:0,orders:[]};
  for(const npc of Object.values(state.npcs)) {
    if(Object.values(state.town.businesses).some(b=>b.owner===npc.id)) {
      if(!npc.capabilities.includes('fund-business'))npc.capabilities.push('fund-business');
      if(['market','supply-desk'].some(key=>state.town!.businesses[key]?.owner===npc.id) && !npc.capabilities.includes('order-external'))npc.capabilities.push('order-external');
    }
  }
}
export function validateTrade(state:WorldState,id:string,action:Action):string|null {
  if(action.type!=='order-external'&&action.type!=='fund-business')return null;
  const business=state.town?.businesses[action.businessId],trade=state.trade,npc=state.npcs[id]!;
  if(!business||!trade||business.owner!==id)return 'not-business-owner';
  if(npc.activity.kind==='travel'||npc.activity.kind==='work'||npc.activity.kind==='wait'&&npc.activity.resting)return 'actor-busy';
  if((npc.inventory.coins ?? 0)<action.quantity)return 'insufficient-funds';
  if(action.type==='fund-business')return null;
  if(!['market','supply-desk'].includes(business.id))return 'unsupported-wholesale-product';
  if(npc.node!==business.node)return 'not-at-order-desk';
  if(trade.orders.some(o=>o.businessId===business.id && o.status==='pending'))return 'order-pending';
  if(trade.orders.some(o=>o.businessId===business.id && state.time<o.createdAt+120))return 'wholesale-cooldown';
  if(trade.sourceRemaining<action.quantity)return 'external-source-exhausted';
  if(trade.orders.length>=240)return 'order-capacity';
  if(business.id==='market' && state.resources.marketGoods+action.quantity>24)return 'storage-capacity';
  if(business.id==='supply-desk' && state.town!.rawInputs+action.quantity>96)return 'input-storage-capacity';
  return null;
}
export function tradeObservation(state:WorldState,id:string):NpcObservation['wholesale'] {
  if(!state.trade||!state.town)return undefined;
  const npc=state.npcs[id]!;
  // Contract terms and accounts belong to this owner. No remote local-stock query.
  return {rules:{...wholesaleRules},offers:Object.values(state.town.businesses).filter(b=>b.owner===id).map(b=>({
    businessId:b.id,product:b.id==='market'?'food-portion':b.id==='supply-desk'?'production-input':null,node:b.node,
    sourceAvailable:npc.node===b.node && npc.activity.kind!=='travel' && ['market','supply-desk'].includes(b.id)?state.trade!.sourceRemaining:null,
    canOrder:validateTrade(state,id,{type:'order-external',businessId:b.id,quantity:1})===null,
    ineligibleReason:validateTrade(state,id,{type:'order-external',businessId:b.id,quantity:1}),
    payer:'personal-coins',balance:npc.inventory.coins!,businessCoins:b.coins,
    localInputs:b.id==='supply-desk'&&npc.node===b.node&&npc.activity.kind!=='travel'?state.town!.rawInputs:null,
    pending:state.trade!.orders.filter(o=>o.actor===id && o.businessId===b.id && o.status==='pending'),
  }))};
}
export function executeTrade(host:CommunicationHost,id:string,action:Action):boolean {
  if(action.type!=='order-external'&&action.type!=='fund-business')return false;
  const {state,record,trigger}=host,b=state.town!.businesses[action.businessId]!,trade=state.trade!,npc=state.npcs[id]!;
  npc.inventory.coins!-=action.quantity;
  if(action.type==='fund-business') {
    b.coins+=action.quantity;
    record('business-funded',id,[id],b.id,'Owner transferred personal credits to the business account',{quantity:action.quantity},'outcome');
  } else {
    trade.sourceRemaining-=action.quantity;trade.spent+=action.quantity;
    const order={id:`wholesale-${trade.nextId++}`,actor:id,businessId:b.id,quantity:action.quantity,cost:action.quantity,createdAt:state.time,dueAt:state.time+60,status:'pending' as const};
    trade.orders.push(order);
    record('external-order-placed',id,[id],order.id,'Paid external wholesaler; finite goods reserved outside town until delivery',{quantity:order.quantity,cost:order.cost,dueAt:order.dueAt,businessId:b.id},'commitment');
  }
  trigger(id,'economic-decision-completed');return true;
}
export function advanceTrade(host:CommunicationHost):boolean {
  const {state,record,trigger}=host;if(!state.trade)return false;let changed=false;
  for(const order of state.trade.orders)if(order.status==='pending' && state.time>=order.dueAt) {
    changed=true;order.status='delivered';
    if(order.businessId==='market'){state.resources.marketGoods+=order.quantity;state.resources.revision++;state.trade.importedFood+=order.quantity;}
    else {state.town!.rawInputs+=order.quantity;state.trade.importedInputs+=order.quantity;}
    record('external-order-delivered',null,[order.actor],order.id,'Wholesaler delivered the previously paid order',{quantity:order.quantity,businessId:order.businessId},'outcome');
    trigger(order.actor,'wholesale-delivery');
  }
  return changed;
}
export function assertTrade(state:WorldState):void {
  const t=state.trade;if(!t)return;
  const check=(x:unknown)=>{if(!x)throw new Error('Invalid neighbourhood snapshot: external trade');};
  const int=(x:number)=>Number.isSafeInteger(x)&&x>=0;
  check(state.town&&t.version===1&&[t.sourceRemaining,t.spent,t.importedFood,t.importedInputs].every(int));
  check(Number.isSafeInteger(t.nextId)&&t.nextId>0&&Array.isArray(t.orders)&&t.orders.length<=240&&t.nextId===t.orders.length+1);
  let spent=0,food=0,inputs=0;const pending=new Set<string>();
  for(const [index,o] of t.orders.entries()) {
    check(o && typeof o==='object');
    check(o.id===`wholesale-${index+1}`&&['market','supply-desk'].includes(o.businessId)&&state.town!.businesses[o.businessId]?.owner===o.actor);
    check(int(o.quantity)&&o.quantity>=1&&o.quantity<=6&&o.cost===o.quantity&&Number.isFinite(o.createdAt)&&o.createdAt>=0&&o.createdAt<=state.time&&o.dueAt===o.createdAt+60);
    check(['pending','delivered'].includes(o.status)&&(o.status==='pending'?o.dueAt>state.time:o.dueAt<=state.time));
    if(o.status==='pending'){check(!pending.has(o.businessId));pending.add(o.businessId);}
    const previous=t.orders.slice(0,index).filter(p=>p.businessId===o.businessId).at(-1);check(!previous||o.createdAt>=previous.createdAt+120);
    spent+=o.cost;if(o.status==='delivered'){if(o.businessId==='market')food+=o.quantity;else inputs+=o.quantity;}
  }
  check(t.spent===spent&&t.sourceRemaining+spent===240&&t.importedFood===food&&t.importedInputs===inputs);
}
