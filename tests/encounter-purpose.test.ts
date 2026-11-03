import {describe,it,expect,vi} from 'vitest';
import {createTown} from '../shared/neighbourhood/town.js';
import {Neighbourhood} from '../shared/neighbourhood/world.js';
import {ordinaryRejection} from '../shared/neighbourhood/decision-recovery.js';
import {prepareModelInput} from '../server/inference/model-context.js';
import {SelectiveNeighbourhoodProvider} from '../server/inference/selective-provider.js';
import type {NeighbourhoodProvider} from '../server/inference/neighbourhood-provider.js';
import type {NpcDecision,Action} from '../shared/neighbourhood/types.js';

// Exact response 94, 7g-informed-20261103T054118Z. Positioning below is an
// offline contract fixture, not a continuation or retry of that live request.
const rejected:NpcDecision={action:{message:"Hello, I'm Sadiq, repair apprentice. I'm short on food and work—any advice?",purpose:'request-help',recipient:'grace',type:'encounter'},goalId:'personal',reason:'Hunger 0.82 and income need 1 with 1 coin and no work available here, so I will seek help from nearby Grace before waiting or traveling.'};
function fixture(){
  const w=createTown('encounter-purpose-offline');w.enableSocialVisits();
  for(const id of ['sadiq','grace']){
    const r=w.requestInteractionDecision(id)!;
    expect(w.applyDecision(r.id,{goalId:r.observation.actor.goals[0]!.id,reason:'Synthetic offline positioning',action:{type:'travel',destination:'community-office-work'}},{mode:'mock',model:'offline-fixture'}).accepted).toBe(true);
  }
  w.advance(60);w.advance(60);return w;
}
function apply(w:Neighbourhood,id:string,action:Action){const r=w.requestInteractionDecision(id)!;return w.applyDecision(r.id,{goalId:r.observation.actor.goals[0]!.id,reason:'Synthetic offline independently supplied choice',action},{mode:'meta',model:'synthetic-no-network'});}

describe('encounter purpose grounding and bounded recovery',()=>{
  it('grounds general advice and transport purposes in only the deciding resident capability',()=>{
    const w=fixture();
    for(const id of ['sadiq','amina']){
      const r=w.requestInteractionDecision(id)!,p=prepareModelInput(r,'decision');
      for(const type of ['encounter','communicate']){
        const b=p.schema.properties.action.anyOf.find(b=>b.properties.type.enum[0]===type)!;
        const purposes=(b.properties as any).purpose.enum;
        expect(purposes).toContain(type==='encounter'?'ask':'chat');
        expect(purposes.includes('request-help')).toBe(r.observation.actor.capabilities.includes('propose-transport'));
      }
      expect(p.instructions).toContain('ask is for general questions or advice');
      expect(p.instructions).toContain('requires your own propose-transport capability');
      w.abandonDecision(r.id);
    }
  });
  it('rejects Sadiq’s exact response without effects, then supplies fresh scoped feedback to an independent decision',async()=>{
    const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
    try{
      const w=fixture(),r=w.requestInteractionDecision('sadiq')!,before=w.snapshot;
      expect(w.applyDecision(r.id,rejected,{mode:'meta',model:'recorded-response-offline-replay'})).toMatchObject({accepted:false,reason:'missing-assistance-capability'});
      const after=w.snapshot;
      for(const key of ['tasks','town','resources','social','socialVisits','communication'] as const)expect(after[key]).toEqual(before[key]);
      for(const id of w.residentIds){expect(after.npcs[id]!.inventory).toEqual(before.npcs[id]!.inventory);expect(after.npcs[id]!.relationships).toEqual(before.npcs[id]!.relationships);expect(after.npcs[id]!.knowledge).toEqual(before.npcs[id]!.knowledge);}
      expect(after.npcs.grace!.memories).toEqual(before.npcs.grace!.memories);
      expect(w.observe('grace').decisionRecovery).toBeUndefined();
      expect(w.applyDecision(r.id,rejected,{mode:'meta',model:'duplicate'}).duplicate).toBe(true);
      expect(w.snapshot.decisionRecovery!.sadiq!.repetitions).toBe(1);
      const fresh=w.requestDecision('sadiq')!;expect(fresh.id).not.toBe(r.id);
      const p=prepareModelInput(fresh,'decision');expect(p.input.observation.decisionRecovery!.reason).toBe('missing-assistance-capability');
      expect(p.input.observation.memories.some(m=>m.detail.includes('General face-to-face questions use ask'))).toBe(true);
      // A separate synthetic provider chooses ask. There is no action rewriting,
      // hidden retry or call to the default offline decision policy.
      const decide=vi.fn(async()=>({mode:'meta' as const,model:'synthetic-independent-choice',decision:{...rejected,action:{...rejected.action,purpose:'ask'} as Action}}));
      const provider:NeighbourhoodProvider={mode:'live-meta',metrics:null,decide,async converse(){throw new Error('unused');}};
      const selective=new SelectiveNeighbourhoodProvider(w.residentIds,provider);
      const result=await selective.decide(fresh);expect(decide).toHaveBeenCalledOnce();expect(result.mode).toBe('meta');
      expect(w.applyDecision(fresh.id,result.decision,{mode:result.mode,model:result.model}).accepted).toBe(true);
      expect(w.snapshot.social.interactions['encounter-1']!.purpose).toBe('ask');
      expect(w.snapshot.social.interactions['encounter-1']!.status).toBe('pending');
      expect(w.snapshot.tasks).toEqual({});expect(w.snapshot.npcs.grace!.knowledge.contacts).toEqual(before.npcs.grace!.knowledge.contacts);
      expect(network).not.toHaveBeenCalled();
    }finally{vi.restoreAllMocks();}
  });
  it('bounds identical failures across save/load and retains fail-closed privacy, consent and unrelated capability guards',()=>{
    let w=fixture();
    for(let n=1;n<=3;n++){
      const r=w.requestInteractionDecision('sadiq')!;expect(w.applyDecision(r.id,rejected,{mode:'meta',model:'offline-replay'}).accepted).toBe(false);
      expect(w.snapshot.decisionRecovery!.sadiq!.repetitions).toBe(n);w=Neighbourhood.restore(w.serialize());
    }
    expect(w.requestInteractionDecision('sadiq')).toBeNull();
    expect(w.requestInteractionDecision('maryam')).not.toBeNull();
    expect(w.snapshot.social.interactions).toEqual({});
    w.advance(60);w.advance(60);const resumed=w.requestDecision('sadiq');expect(resumed).not.toBeNull();w.abandonDecision(resumed!.id);
    for(const reason of ['missing-contact','unknown-social-recipient','unknown-or-private-social-venue','social-consent-required','missing-capability','invalid-schema'])expect(ordinaryRejection(reason)).toBe(false);
    expect(ordinaryRejection('missing-assistance-capability')).toBe(true);
    expect(apply(w,'sadiq',{type:'communicate',recipient:'grace',channel:'text',purpose:'chat',message:'Any advice?',memoryId:null}).reason).toBe('missing-contact');
  });
});
