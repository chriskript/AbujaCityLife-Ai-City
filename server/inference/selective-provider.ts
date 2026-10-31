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
  if (threads.some(t=>t.initiator===id && t.purpose==='request-help' && t.response==='accept' && t.taskId===null && ['accepted','connected'].includes(t.status) && t.expiresAt>o.time)) return 'follow-up-offer';
  if (o.tasks.some(t=>t.requester===id && ['proposed','accepted','collected'].includes(t.status)) || threads.some(t=>t.initiator===id && ['queued','pending'].includes(t.status))) return null;
  if (triggers.some(t=>['communication-reply','offer-resolved','clarification-requested','encounter-resolved'].includes(t))) return 'reconsider-response';
  // Once stock is in hand, return/stock execution follows the existing routine policy.
  // A historical shortage must not repeatedly charge reasoning for that continuation.
  if(o.actor.capabilities.includes('stock-stall') && o.actor.inventory.goods-(o.actor.inventory.food ?? 0)>0)return null;
  if (o.actor.capabilities.includes('propose-transport') && o.resources.marketGoods!==null && o.resources.marketGoods<4 && !o.tasks.some(t=>t.requester===id && ['proposed','accepted','collected'].includes(t.status)) && !threads.some(t=>t.initiator===id && ['queued','pending'].includes(t.status))) return 'known-stock-shortage';
  if (o.nearbyPeople.some(p=>!p.known && o.encounterOpportunities.includes(p.id)) && (o.actor.routine?.sociability ?? 0)>=.55 && o.actor.needs.food<.75 && o.time-(o.encounters.at(-1)?.createdAt ?? -Infinity)>=180) return 'optional-encounter';
  if ((o.actor.inventory.coins ?? 0)<6 && o.town?.work.some(w=>w.node===o.actor.node && w.available===true)) return 'local-employment-choice';
  return null;
}

export class SelectiveNeighbourhoodProvider implements NeighbourhoodProvider {
  readonly mode='live-meta'; readonly routineDecisions=true;
  metrics:GenerationMetrics|null=null;
  private readonly residents:Set<string>;
  constructor(readonly selectedResidents:readonly string[], private readonly muse:NeighbourhoodProvider,
    private readonly offline:NeighbourhoodProvider=new MockNeighbourhoodProvider()) {
    if(muse.mode!=='live-meta' || offline.mode!=='mock' || !selectedResidents.length || selectedResidents.length>32 || new Set(selectedResidents).size!==selectedResidents.length || selectedResidents.some(id=>!isResidentId(id)))throw new Error('Invalid selective reasoning configuration');
    this.residents=new Set(selectedResidents);
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
