import type { NpcObservation } from '../../shared/neighbourhood/types.js';
import { personalRules, carriedGoods } from '../../shared/neighbourhood/personal-rules.js';

// Only the already-authorised observation enters this projection. No world,
// resident registry, remote wallet, address or inferred friendship is consulted.
export function decisionGrounding(o:NpcObservation){
  const a=o.actor,cargo=o.tasks.filter(t=>t.recipient===a.id&&t.status==='collected').reduce((s,t)=>s+t.quantity,0);
  const inventory=carriedGoods(a.inventory.goods,a.inventory.food ?? 0,cargo);
  const restPlaces=o.places.filter(p=>p.id===a.home||o.placeKnowledge.find(k=>k.placeId===p.id)?.facts?.services.includes('scenic-view')).map(p=>({id:p.id,here:p.id===a.node&&a.activity.kind!=='travel'}));
  const visibleMarket=o.placeKnowledge.find(p=>p.placeId==='market');
  const ownPrice=o.town?(o.town.ownsMarket?0:o.town.marketPrice):null;
  const knownNearby=o.nearbyPeople.filter(p=>p.known&&a.knowledge.people.includes(p.id));
  const pendingCommitments=o.tasks.filter(t=>['accepted','collected'].includes(t.status));
  return {
    version:1,
    personal:o.town?{
      scale:'0 = satisfied; 1 = maximum unmet need, not fullness/energy. High needs impose no work ban or simulated injury.',
      current:{hunger:a.needs.food,fatigue:a.needs.rest ?? 0,incomeNeed:a.needs.income},
      rules:personalRules,
      effects:'Meals reduce hunger now; rest relieves fatigue on completion. Jobs relieve income need and pay on completion, but work does not feed or rest you. Needs still grow.',
      food:{held:inventory.personalFood,canEatNow:o.permittedActions.includes('eat')&&inventory.personalFood>0,onePortionRelief:Math.min(a.needs.food,personalRules.mealRelief),marketUnitPrice:ownPrice,cashLimited:ownPrice!==null&&ownPrice>0,affordableUnits:ownPrice===null?null:ownPrice===0?null:Math.floor((a.inventory.coins ?? 0)/ownPrice),marketStock:{value:visibleMarket?.stock.value ?? null,freshness:visibleMarket?.stock.freshness ?? 'unknown',evidenceId:visibleMarket?.stock.evidenceId ?? null}},
      rest:{knownPlaces:restPlaces,canRestHere:o.permittedActions.includes('rest')&&restPlaces.some(p=>p.here),sixtySecondMaximumRelief:60*personalRules.restReliefPerSecond},
      commitments:pendingCommitments.map(t=>({id:t.id,role:t.requester===a.id?'requester':'carrier',status:t.status,quantity:t.quantity})),
    }:null,
    inventory:{...inventory,scope:'Carried only, not stall stock or orders',...(a.capabilities.includes('stock-stall')?{stockingRule:'Food is INCLUDED in total, not additional. Only total minus food minus cargo can stock the stall.',canStockHere:o.permittedActions.includes('stock-stall')&&a.node==='market'&&inventory.restockable>0}:{})},
    failure:o.decisionRecovery?{
      ...o.decisionRecovery,
      explanation:o.decisionRecovery.reason==='missing-stall-supplies'?'The rejected stock-stall quantity was not backed by eligible stall supplies. Personal food and committed cargo cannot be stocked. See the CURRENT restockable count, not total goods.':o.decisionRecovery.reason==='insufficient-stock'?'The requested retail quantity was unavailable at execution. A previous observation, open sales or seller presence does not reserve goods.':'The previous action was rejected by its recorded world precondition; no invalid transaction occurred.',
      currentInventoryAsOf:o.time,
    }:null,
    social:o.socialVisits?{
      nearbyKnown:knownNearby.map(p=>({id:p.id,activity:p.activity,canDiscuss:o.encounterOpportunities.includes(p.id)})),
      introductions:o.nearbyPeople.filter(p=>!p.known&&o.encounterOpportunities.includes(p.id)).map(p=>({id:p.id,identity:null})),
      textCandidates:o.communication?.canContact ?? [],callCandidates:o.communication?.canCall ?? [],
      shareOwnNumberWith:knownNearby.filter(p=>!(a.knowledge.sharedContacts ?? []).includes(p.id)).map(p=>p.id),
      venues:o.socialVisits.venues,
      pendingMessages:(o.communication?.threads ?? []).filter(t=>t.recipient===a.id&&t.status==='pending').map(t=>({id:t.id,from:t.initiator,purpose:t.purpose})),
      rendezvous:o.socialVisits.invitations.filter(i=>i.expiresAt>o.time).map(i=>({id:i.id,status:i.update.status,respondTo:i.update.respondTo,joined:i.joined,canConverse:i.canConverse})),
      rules:'These are optional opportunities, not recommendations. You may chat without a job request, invite a known person to your public doorstep or a known venue, or ask them to host. You may travel to a known public workplace to look for someone; arrival does not establish their presence or a meeting. Unknown home/work addresses and remote presence remain unknown. No private home entry follows from an invitation. Acceptance, your join-social journey, their independent journey and conversation are separate. A delivered invitation permits accept, decline, postpone or an alternative. You can leave, choose solitude or pursue another priority. Giving your number does not obtain theirs. Existing acquaintance or work records are not proof of friendship or trust.',
      relationshipAccounting:'socialExchanges changes only after validated socialise turns at a consented rendezvous; ordinary encounters/texts do not increment it. No automatic friendship or phone exchange.',
    }:null,
  };
}
