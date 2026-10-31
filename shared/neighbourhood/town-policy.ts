import type { Action, NpcDecision, NpcDecisionRequest } from './types.js';
import type { MockChoices } from './mock-provider.js';
import { pathToNode } from '../navigation/routes.js';

// Reusable OFFLINE rules: no character IDs, dialogue story sequence or world-state access.
export function townDecision(request: NpcDecisionRequest, choices: MockChoices): NpcDecision {
  const o=request.observation,a=o.actor,town=o.town!;
  const choose=(action: Action,reason: string): NpcDecision=>({goalId:a.goals[0]!.id,reason:'OFFLINE: '+reason,action});
  const canReach=(node: string)=>a.knowledge.places.includes(node) && Boolean(pathToNode(a.node,node,new Set(o.knownBlockedEdges)));
  const go=(node: string,reason: string)=>choose({type:'travel',destination:node},reason);
  const rest=()=>a.node===a.home || a.knowledge.placeFacts?.[a.node]?.services.includes('scenic-view') ? choose({type:'rest',seconds:60},'Make time for rest') : canReach(a.home!) ? go(a.home!,'Return to my own home to rest') : choose({type:'wait',seconds:60},'A known route home is unavailable');
  const active=o.tasks.find(task=>task.recipient===a.id && ['accepted','collected'].includes(task.status));
  const incoming=o.encounters.find(item=>item.recipient===a.id && item.status==='pending');
  if (incoming && choices.encounterResponse!=='ignore') {
    const response=choices.encounterResponse ?? (active || a.needs.food>.75 || (a.needs.rest ?? 0)>.75 ? 'defer' : incoming.purpose==='request-help' && !a.capabilities.includes('fulfil-transport') ? 'clarify' : 'accept');
    return choose({type:'respond-encounter',interactionId:incoming.id,response,message:response==='accept' ? 'I can discuss this with you.' : response==='clarify' ? 'What sort of assistance would be useful?' : response==='defer' ? 'I need to attend to another priority first.' : 'I am not available to help.'},'Assess this invitation against my own circumstances');
  }
  if (active) return choose({type:'fulfil-transport',taskId:active.id},'Honour my accepted delivery commitment');
  const offer=o.tasks.find(task=>task.recipient===a.id && task.status==='proposed' && o.nearbyPeople.some(person=>person.id===task.requester));
  if (offer) {
    const restoreFoodSource=o.resources.marketGoods===0 && a.knowledge.placeFacts?.market?.services.includes('food-retail') && a.needs.food>.75;
    return choose({type:'respond-transport',taskId:offer.id,accept:choices.driver==='accept' && (a.needs.food<.85 || Boolean(restoreFoodSource)) && (a.needs.rest ?? 0)<.85 && (a.needs.income>.2 || Boolean(restoreFoodSource))},'Assess the income, fatigue and effect on a personally known food shortage');
  }
  if (a.needs.food>=.6 && (a.inventory.food ?? 0)>0) return choose({type:'eat',quantity:1},'Use my own food to meet hunger');
  if ((a.needs.rest ?? 0)>=.7) return rest();
  const price=town.ownsMarket ? 0 : town.marketPrice;
  if (a.needs.food>=.6 && (a.inventory.coins ?? 0)>=price) {
    if (a.node!=='market' && canReach('market')) return go('market','Seek food at the known market');
    if (a.node==='market' && (o.resources.marketGoods ?? 0)>0 && o.resources.salesOpen && town.marketServing) return choose({type:'buy',quantity:1},'Buy a portion within my means');
    if (a.node==='market' && !a.capabilities.includes('stock-stall')) return choose({type:'wait',seconds:20},'Wait for observed stock or an available vendor before reconsidering food');
  }
  const ownRequest=o.tasks.find(task=>task.requester===a.id && ['proposed','accepted','collected'].includes(task.status));
  if (ownRequest) return ownRequest.status==='proposed' ? choose({type:'wait',seconds:20},'Allow the recipient an independent response') : a.node!=='market' && canReach('market') ? go('market','Return to the stall while the accepted delivery proceeds') : choose({type:'work',seconds:45},'Attend to the market while another resident carries out the job');
  if (o.encounters.some(item=>item.initiator===a.id && item.status==='pending')) return choose({type:'wait',seconds:20},'Wait for an optional response');
  if (a.capabilities.includes('stock-stall')) {
    if (a.inventory.goods-(a.inventory.food ?? 0)>0) return a.node==='market' ? choose({type:'stock-stall',quantity:Math.min(2,a.inventory.goods-(a.inventory.food ?? 0))},'Put carried supplies into the stall') : canReach('market') ? go('market','Carry my stock back to the stall') : rest();
    if ((o.resources.marketGoods ?? 0)<4 && choices.trader!=='wait' && choices.trader!=='reduce-sales') {
      const helper=o.nearbyPeople.filter(person=>person.known && person.canTransport).sort((x,y)=>(a.relationships[y.id]?.successfulJobs ?? 0)-(a.relationships[x.id]?.successfulJobs ?? 0))[0];
      const recentRefusal=o.tasks.some(task=>task.requester===a.id && ['declined','expired'].includes(task.status) && task.expiresAt>o.time-120);
      const batch=o.nearbyPeople.length>=4 ? 6 : 4;
      if (helper && choices.trader!=='self-collect' && !recentRefusal && (a.inventory.coins ?? 0)>=town.transportPayment && (o.resources.supplierGoods===null || o.resources.supplierGoods>=2)) return choose({type:'propose-transport',recipient:helper.id,quantity:Math.min(batch,o.resources.supplierGoods ?? batch)},'Offer bounded paid transport sized for locally observed demand');
      if (a.node==='market' && !recentRefusal && choices.trader!=='self-collect' && (a.knowledge.transporters?.length ?? 0)>0 && canReach('stand')) return go('stand','Look for transport assistance at the known taxi pickup');
      if (a.node!=='centre' && canReach('centre')) return go('centre','Check supplies and consider carrying some myself');
      const capacity=o.actionConstraints['collect-self']?.remainingCarryingCapacity ?? 0;
      if (a.node==='centre' && (o.resources.supplierGoods ?? 0)>0 && capacity>0) return choose({type:'collect-self',quantity:Math.min(capacity,o.resources.supplierGoods!)},'Collect only what I can carry');
    }
    if (a.node!=='market' && canReach('market')) return go('market','Return to the market to serve customers');
    if (choices.trader==='reduce-sales' && a.node==='market' && o.resources.salesOpen) return choose({type:'set-sales',open:false},'Pause sales under the selected alternative policy');
  }
  const productionNeed=a.skills?.includes('supply') && (o.resources.supplierGoods ?? 0)<12;
  const needWork=a.needs.income>.35 || (a.inventory.coins ?? 0)<6 || productionNeed;
  if (needWork) {
    const postings=town.work.filter(work=>work.available!==false || work.observedAt===null || o.time-work.observedAt>=120)
      .sort((x,y)=>Number(y.skill!=='general')-Number(x.skill!=='general') || y.wage/y.seconds-x.wage/x.seconds);
    for (const posting of postings) {
      if (a.node===posting.node && posting.available===true) return choose({type:'take-work',businessId:posting.id},'Accept a funded opening suited to my skills and needs');
      if (a.node!==posting.node && canReach(posting.node)) {
        if (a.capabilities.includes('fulfil-transport') && a.skills?.every(skill=>['general','transport'].includes(skill)) && posting.skill!=='transport' && (a.inventory.coins ?? 0)>=6 && a.node==='stand') break;
        return go(posting.node,'Visit a known workplace to check its actual openings');
      }
    }
  }
  if (a.capabilities.includes('stock-stall') && a.node==='market') return choose({type:'work',seconds:60},'Keep serving the stall while monitoring stock and my own needs');
  if (a.capabilities.includes('fulfil-transport') && a.needs.income>.2 && (a.inventory.coins ?? 0)>=6) return a.node==='stand' ? choose({type:'wait',seconds:60},'Remain available at the taxi pickup for suitable work') : canReach('stand') ? go('stand','Look for transport opportunities') : rest();
  const lastSocial=o.encounters.at(-1)?.createdAt ?? -Infinity;
  const person=o.nearbyPeople.find(person=>!person.known && o.encounterOpportunities.includes(person.id));
  if (person && choices.social!=='ignore' && (a.routine?.sociability ?? 0)>=.55 && o.time-lastSocial>=180 && a.needs.food<.75) return choose({type:'encounter',recipient:person.id,purpose:'introduce',message:'Would you like to introduce ourselves and discuss the neighbourhood?'},'Choose an optional introduction when personal priorities permit');
  if (a.routine && a.node!==a.routine.leisure && canReach(a.routine.leisure)) return go(a.routine.leisure,'Make time for my personal interests');
  if ((a.needs.rest ?? 0)>.3) return rest();
  if (a.routine && a.node!==a.routine.workplace && canReach(a.routine.workplace)) return go(a.routine.workplace,'Check back on my own work and local opportunities');
  return choose({type:'work',seconds:90},'Continue a personal activity while watching for meaningful changes');
}
