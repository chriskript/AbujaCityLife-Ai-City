import type { NpcDecisionRequest, NpcInferenceResult, NpcObservation } from '../../shared/neighbourhood/types.js';
import { isResidentId } from '../../shared/neighbourhood/decision-schema.js';
import type { GenerationMetrics } from '../../shared/neighbourhood/conversation.js';
import { MockNeighbourhoodProvider, type NeighbourhoodProvider } from './neighbourhood-provider.js';

// Eligibility for reasoning, not the action the resident must choose. Only scoped input is used.
export function reasoningOpportunity(o: NpcObservation, triggers: string[]): string | null {
  if (!o.permittedActions.length || !triggers.some(t => !['restored','control-changed'].includes(t))) return null;
  const id=o.actor.id, threads=o.communication?.threads ?? [];
  if (threads.some(t=>t.recipient===id && t.status==='pending')) return 'incoming-communication';
  if (o.encounters.some(e=>e.recipient===id && e.status==='pending')) return 'encounter-response';
  if (o.tasks.some(t=>t.recipient===id && t.status==='proposed')) return 'commitment-choice';
  if (triggers.includes('road-change')) return 'discovered-road-change';
  if (o.tasks.some(t=>t.recipient===id && ['accepted','collected'].includes(t.status))) return null;
  // Routine personal care stays offline unless an actual social response above
  // needs an independent choice. Do not charge Muse to buy/eat/rest or walk home.
  if (o.town && ((o.actor.needs.food>=.6 && (o.actor.inventory.food ?? 0)>0) || (o.actor.needs.rest ?? 0)>=.7 ||
    (o.actor.needs.food>=.6 && (o.actor.inventory.coins ?? 0)>=(o.town.ownsMarket?0:o.town.marketPrice) && !(o.actor.node==='market' && o.actor.capabilities.includes('stock-stall'))))) return null;
  if (threads.some(t=>t.initiator===id && t.purpose==='request-help' && t.response==='accept' && t.taskId===null && ['accepted','connected'].includes(t.status) && t.expiresAt>o.time)) return 'follow-up-offer';
  if (o.tasks.some(t=>t.requester===id && ['proposed','accepted','collected'].includes(t.status)) || threads.some(t=>t.initiator===id && ['queued','pending'].includes(t.status))) return null;
  if (triggers.some(t=>['communication-reply','offer-resolved','clarification-requested','encounter-resolved'].includes(t))) return 'reconsider-response';
  // Once stock is in hand, return/stock execution follows the existing routine policy.
  // A historical shortage must not repeatedly charge reasoning for that continuation.
  if(o.actor.capabilities.includes('stock-stall') && o.actor.inventory.goods-(o.actor.inventory.food ?? 0)>0)return null;
  if (o.actor.capabilities.includes('propose-transport') && o.resources.marketGoods!==null && o.resources.marketGoods<4 && !o.tasks.some(t=>t.requester===id && ['proposed','accepted','collected'].includes(t.status)) && !threads.some(t=>t.initiator===id && ['queued','pending'].includes(t.status))) return 'known-stock-shortage';
  if (o.nearbyPeople.some(p=>!p.known && o.encounterOpportunities.includes(p.id)) && (o.actor.routine?.sociability ?? 0)>=.55 && o.actor.needs.food<.75 && o.time-(o.encounters.at(-1)?.createdAt ?? -Infinity)>=180) return 'optional-encounter';
  if ((o.actor.inventory.coins ?? 0)<6 && o.town?.work.some(w=>w.canTakeNow)) return 'local-employment-choice';
  if ((o.actor.routine?.sociability ?? 0)>=.7 && o.actor.needs.food<.6 && (o.actor.needs.rest ?? 0)<.5 && o.time-(threads.at(-1)?.createdAt ?? -Infinity)>=300 &&
    o.communication?.contacts.some(person=>o.communication!.canContact.includes(person.id) && !o.nearbyPeople.some(near=>near.id===person.id))) return 'optional-remote-social-choice';
  return null;
}

export class SelectiveNeighbourhoodProvider implements NeighbourhoodProvider {
  readonly mode='live-meta'; readonly routineDecisions=true;
  metrics:GenerationMetrics|null=null;
  private readonly residents:Set<string>;
  readonly priorityFor?: (o:NpcObservation,triggers:string[])=>number;
  constructor(readonly selectedResidents:readonly string[], private readonly muse:NeighbourhoodProvider,
    private readonly offline:NeighbourhoodProvider=new MockNeighbourhoodProvider(),prioritiseResponses=false) {
    if(muse.mode!=='live-meta' || offline.mode!=='mock' || !selectedResidents.length || selectedResidents.length>32 || new Set(selectedResidents).size!==selectedResidents.length || selectedResidents.some(id=>!isResidentId(id)))throw new Error('Invalid selective reasoning configuration');
    this.residents=new Set(selectedResidents);
    if(prioritiseResponses)this.priorityFor=(o,triggers)=>{
      if(this.sourceFor(o,triggers)!=='live-meta')return 0;
      const opportunity=reasoningOpportunity(o,triggers);
      return ['incoming-communication','encounter-response','commitment-choice'].includes(opportunity ?? '')?2:['follow-up-offer','reconsider-response'].includes(opportunity ?? '')?1:0;
    };
  }
  sourceFor(o:NpcObservation,triggers:string[]):'mock'|'live-meta' {
    return this.residents.has(o.actor.id) && reasoningOpportunity(o,triggers)?'live-meta':'mock';
  }
  async decide(request:NpcDecisionRequest):Promise<NpcInferenceResult> {
    this.metrics=null;
    const provider=this.sourceFor(request.observation,request.triggers)==='live-meta'?this.muse:this.offline;
    // A failed/invalid Muse result never falls through to the offline policy.
    try{return await provider.decide(request);}finally{this.metrics=provider.metrics;}
  }
  async converse(context:Parameters<NeighbourhoodProvider['converse']>[0]) {
    this.metrics=null;try{return await this.muse.converse(context);}finally{this.metrics=this.muse.metrics;}
  }
}
