import { skills } from './population.js';
import { isResidentId } from './decision-schema.js';
import { mapFor } from '../world/town-layout.js';
import type { WorldState, WorkBooking } from './types.js';

const integer=(value: unknown): value is number=>Number.isSafeInteger(value) && Number(value)>=0;
function check(value: unknown): asserts value { if (!value) throw new Error('Invalid neighbourhood snapshot: town economy'); }
export function assertTownEconomy(state: WorldState): void {
  const town=state.town;
  const map=mapFor(state.mapId),places=map.places;
  if (!town) {
    for (const npc of Object.values(state.npcs)) if (npc.activity.kind==='work' || npc.activity.kind==='wait') check(npc.activity.job===undefined && npc.activity.resting===undefined);
    return;
  }
  check(town && typeof town==='object' && town.businesses && typeof town.businesses==='object' && !Array.isArray(town.businesses));
  check(Object.keys(town.businesses).length<=32 && town.businesses.market && town.businesses['supply-desk']);
  check([town.initialMoney,town.initialInputs,town.rawInputs,town.produced,town.consumed].every(integer));
  check(town.marketPrice===2 && town.transportPayment===2 && town.supplierCapacity===24);
  check(Number.isFinite(town.nextNeedsAt) && town.nextNeedsAt>state.time && town.nextNeedsAt<=state.time+60);
  const bookings: WorkBooking[]=[];
  const homes=new Set<string>();
  let money=0;
  for (const npc of Object.values(state.npcs)) {
    check(integer(npc.inventory.coins)); money+=npc.inventory.coins;
    check(integer(npc.inventory.food) && npc.inventory.food<=npc.inventory.goods);
    const cargo=Object.values(state.tasks).filter(task=>task.recipient===npc.id && task.status==='collected').reduce((sum,task)=>sum+task.quantity,0);
    check(npc.inventory.food+cargo<=npc.inventory.goods);
    check(Array.isArray(npc.skills) && npc.skills.length>0 && npc.skills.every(skill=>skills.includes(skill)) && new Set(npc.skills).size===npc.skills.length);
    check(npc.home && npc.knowledge.places.includes(npc.home));
    if(state.mapId==='town-v1'){check(map.nodes.find(node=>node.id===npc.home)?.kind==='home' && !homes.has(npc.home));homes.add(npc.home);}
    check(npc.routine && npc.knowledge.places.includes(npc.routine.workplace) && npc.knowledge.places.includes(npc.routine.leisure) && Number.isFinite(npc.routine.sociability) && npc.routine.sociability>=0 && npc.routine.sociability<=1);
    check(npc.knowledge.businesses && typeof npc.knowledge.businesses==='object' && !Array.isArray(npc.knowledge.businesses));
    for (const [id,known] of Object.entries(npc.knowledge.businesses)) {
      check(Object.hasOwn(town.businesses,id) && known && typeof known==='object');
      check((known.available===null || typeof known.available==='boolean') && (known.observedAt===null ? known.available===null : Number.isFinite(known.observedAt) && known.observedAt>=0 && known.observedAt<=state.time));
    }
    if (npc.activity.kind==='work' || npc.activity.kind==='wait') {
      const activity=npc.activity;
      if (activity.resting!==undefined) check(activity.kind==='wait' && Number.isFinite(activity.resting) && activity.resting>=10 && activity.resting<=120 && activity.until-state.time<=activity.resting && !activity.job);
      if (activity.job) {
        const job=activity.job,business=town.businesses[job.businessId];
        const legacySite=business?.id==='market'?'market':['repair-workshop','utility-work'].includes(business?.id ?? '')?'stand':'centre';
        const site=job.siteNode ?? business?.node;
        check(activity.kind==='work' && business && npc.node===site && (site===business.node || state.mapUpgradedAt!==undefined && site===legacySite && activity.until-business.seconds<=state.mapUpgradedAt) && npc.skills.includes(business.skill) && npc.capabilities.includes('take-work'));
        check(integer(job.wage) && job.wage===business.wage && integer(job.inputs) && job.inputs===business.output && job.output===business.output && activity.until-state.time<=business.seconds);
        bookings.push(job); money+=job.wage;
      }
    }
  }
  for (const [id,business] of Object.entries(town.businesses)) {
    check(business && typeof business==='object' && business.id===id && isResidentId(id));
    check(typeof business.name==='string' && business.name.length>0 && business.name.length<=120 && places.some(place=>place.id===business.node));
    check(Object.hasOwn(state.npcs,business.owner) && Array.isArray(business.staff) && business.staff.every(id=>Object.hasOwn(state.npcs,id)));
    check(integer(business.coins) && integer(business.wage) && business.wage>0 && Number.isFinite(business.seconds) && business.seconds>=10 && business.seconds<=120);
    check(integer(business.slots) && business.slots>0 && business.slots<=4 && skills.includes(business.skill) && [0,2].includes(business.output));
    check(business.output===0 || id==='supply-desk' && business.node==='centre');
    check(bookings.filter(job=>job.businessId===id).length<=business.slots); money+=business.coins;
  }
  check(town.businesses.market.node==='market');
  for (const task of Object.values(state.tasks)) {
    check(task.payment===undefined || integer(task.payment) && task.payment===town.transportPayment);
    check(task.escrow===undefined || integer(task.escrow));
    check((task.escrow ?? 0)===(['accepted','collected'].includes(task.status) ? task.payment ?? 0 : 0)); money+=task.escrow ?? 0;
  }
  check(money===town.initialMoney);
  check(town.rawInputs+town.produced+bookings.reduce((sum,job)=>sum+job.inputs,0)===town.initialInputs);
  check(state.resources.supplierGoods+bookings.reduce((sum,job)=>sum+job.output,0)<=town.supplierCapacity);
}
