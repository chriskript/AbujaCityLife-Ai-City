import { describe, expect, it } from 'vitest';
import { createTown } from '../shared/neighbourhood/town.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { HeadlessTownRunner } from '../shared/neighbourhood/headless-runner.js';
import { neighbourhoodHistory, residentHistories } from '../shared/neighbourhood/social-context.js';
import { assertSnapshot } from '../shared/neighbourhood/snapshot.js';
import { validateConversation } from '../server/inference/neighbourhood-provider.js';
import { compareSocialContext } from '../scripts/compare-social-context.js';
import type { Action } from '../shared/neighbourhood/types.js';

function apply(world: Neighbourhood, id: string, action: Action) {
  const request = world.requestInteractionDecision(id)!;
  return world.applyDecision(request.id, { goalId: request.observation.actor.goals[0]!.id, reason: 'Offline validation', action }, { mode: 'mock', model: 'social-context-test' });
}

describe('Unity Gardens authored history and knowledge grants', () => {
  it('keeps all sixteen residents and existing state unchanged when migrating an old checkpoint', () => {
    const prior = createTown('prior-social-context').snapshot;
    delete prior.socialContext;
    // A live town's authoritative records are preserved, including non-default resources.
    const world = Neighbourhood.restore(JSON.stringify(prior));
    expect(world.residentIds).toEqual(['musa','amina','zainab','chris','fatima','tunde','halima','ibrahim','yusuf','ngozi','emeka','grace','ladi','sadiq','maryam','bisi']);
    const after = world.snapshot;
    expect(after.npcs).toEqual(prior.npcs);
    expect(after.events).toEqual(prior.events);
    expect(after.tasks).toEqual(prior.tasks);
    expect(after.social).toEqual(prior.social);
    expect(after.communication).toEqual(prior.communication);
    expect(after.town).toEqual(prior.town);
    expect(after.roads).toEqual(prior.roads);
    expect(after.mapId).toBe(prior.mapId);
    expect(after.socialContext).toMatchObject({ version: 1, canon: 'unity-gardens-v1' });
    for (const id of world.residentIds) {
      const observation = world.observe(id);
      expect(observation.socialContext!.background).toMatchObject(residentHistories[id]!);
      expect(observation.socialContext!.background!.id).toBe(`history:unity-v1:self:${id}`);
      expect(observation.socialContext!.publicFacts.length).toBeLessThanOrEqual(3);
      expect(observation.socialContext!.publicFacts.every(fact => Object.values(neighbourhoodHistory).includes(fact.detail as typeof neighbourhoodHistory.origins))).toBe(true);
      expect(observation.actor.capabilities.length).toBeGreaterThan(0);
    }
  });

  it('does not manufacture event history, memories, contacts, successful work or mandatory goals', () => {
    const world = createTown('social-state');
    for (const npc of Object.values(world.snapshot.npcs)) {
      expect(npc.memories.every(memory => !memory.id.startsWith('history:'))).toBe(true);
      expect(Object.values(npc.relationships).every(value => value?.successfulJobs === 0)).toBe(true);
    }
    expect(world.snapshot.events.some(event => event.type.includes('history'))).toBe(false);
    const tunde = world.observe('tunde').socialContext!.connections.find(person => person.id === 'chris')!;
    expect(tunde).toMatchObject({identityKnown:true, hasPhoneNumber:false, successfulJobs:0, trust:'not-established-by-history'});
    expect(apply(world,'tunde',{type:'communicate',recipient:'chris',channel:'text',purpose:'chat',message:'Hello',memoryId:null})).toMatchObject({accepted:false,reason:'missing-contact'});
    expect(world.observe('grace').actor.knowledge.people).toEqual(['yusuf']);
    expect(world.observe('chris').actor.knowledge.people).not.toContain('amina');
  });

  it('never projects another resident biography, private knowledge or ungranted public facts', () => {
    const world = createTown('privacy');
    for (const id of world.residentIds) {
      const serialized = JSON.stringify(world.observe(id));
      for (const [other, biography] of Object.entries(residentHistories)) {
        if (other !== id) {
          expect(serialized).not.toContain(biography.private);
          expect(serialized).not.toContain(biography.public);
        }
      }
    }
    const state = world.snapshot;
    state.socialContext!.residents.chris = {publicFacts:['origins'],ownHistory:false};
    delete state.socialContext!.residents.grace;
    const restored = Neighbourhood.restore(JSON.stringify(state));
    expect(restored.observe('chris').socialContext!.background).toBeNull();
    expect(restored.observe('chris').socialContext!.publicFacts).toHaveLength(1);
    expect(JSON.stringify(restored.observe('chris'))).not.toContain(neighbourhoodHistory.concerns);
    expect(restored.observe('grace').socialContext).toBeUndefined();
    expect(restored.observe('chris','Tell me about community concerns and leadership').socialContext!.publicFacts).toHaveLength(1);
    expect(world.observe('maryam','Was there an association or leader?').socialContext!.publicFacts.some(fact => fact.detail===neighbourhoodHistory.leadership)).toBe(true);
    expect(new Neighbourhood().observe('chris').socialContext).toBeUndefined();
  });

  it('validates bounded revision and grants and rejects invented or cross-resident history evidence', () => {
    const world = createTown('validation');
    for (const mutate of [
      (state: any) => {state.socialContext.version=2;},
      (state: any) => {state.socialContext.canon='future';},
      (state: any) => {state.socialContext.residents.chris.publicFacts.push('invented');},
      (state: any) => {state.socialContext.residents.chris.publicFacts.push('origins');},
      (state: any) => {state.socialContext.residents.chris.private=residentHistories.amina;},
    ]) {
      const state = world.snapshot; mutate(state);
      expect(() => Neighbourhood.restore(JSON.stringify(state))).toThrow('snapshot');
    }
    const context = {observation:world.observe('chris'),message:'Tell me about yourself',history:[]};
    const reply = {reply:'I am a recent arrival.', evidenceIds:['history:unity-v1:self:chris'], uncertain:false, proposedDecision:null, claims:[]};
    expect(() => validateConversation(reply,context)).not.toThrow();
    expect(() => validateConversation({...reply,evidenceIds:['history:unity-v1:self:amina']},context)).toThrow();
    expect(apply(world,'chris',{type:'communicate',recipient:'musa',channel:'text',purpose:'chat',message:'My background',memoryId:'history:unity-v1:self:chris'})).toMatchObject({accepted:false,reason:'unknown-memory'});
  });

  it('preserves active jobs, communications, commitments and history over repeated recovery without duplicates', async () => {
    const runner = new HeadlessTownRunner(createTown('active-migration'));
    await runner.advance(60);
    const prior = runner.world.snapshot; delete prior.socialContext;
    let recovered = Neighbourhood.restore(JSON.stringify(prior));
    expect(recovered.snapshot.npcs).toEqual(prior.npcs);
    expect(recovered.snapshot.events).toEqual(prior.events);
    expect(recovered.snapshot.tasks).toEqual(prior.tasks);
    expect(recovered.snapshot.communication).toEqual(prior.communication);
    const context = recovered.snapshot.socialContext;
    for (let cycle=0; cycle<4; cycle++) {
      const before = recovered.snapshot;
      recovered = Neighbourhood.restore(recovered.serialize());
      expect(recovered.snapshot.socialContext).toEqual(context);
      expect(recovered.snapshot.events).toEqual(before.events);
      expect(recovered.snapshot.npcs).toEqual(before.npcs);
      expect(() => assertSnapshot(recovered.snapshot)).not.toThrow();
    }
  });

  it('retains optional introductions, separate number exchange, refusal and independent priorities', () => {
    const world = createTown('optional');
    expect(apply(world,'chris',{type:'encounter',recipient:'zainab',purpose:'introduce',message:'May we talk?'}).accepted).toBe(true);
    expect(apply(world,'zainab',{type:'respond-encounter',interactionId:'encounter-1',response:'decline',message:'I have my own errands.'}).accepted).toBe(true);
    expect(world.observe('zainab').socialContext!.connections.find(person => person.id==='chris')).toMatchObject({identityKnown:true,metInSimulation:true,hasPhoneNumber:false,relationshipRecorded:false,successfulJobs:0});
    expect(apply(world,'maryam',{type:'wait',seconds:30}).accepted).toBe(true);
    expect(apply(world,'ibrahim',{type:'travel',destination:'centre'}).accepted).toBe(true);
    expect(Object.keys(world.snapshot.tasks)).toHaveLength(0);
  });

  it('keeps autonomous progression deterministic with context present or omitted from decision inputs', async () => {
    const enriched = new HeadlessTownRunner(createTown('deterministic-social'));
    const baseline = new HeadlessTownRunner(createTown('deterministic-social'));
    // Simulate the old decision-input view; leave the actual authoritative state identical.
    const observe = baseline.world.observe.bind(baseline.world);
    baseline.world.observe = id => { const observation=observe(id); delete observation.socialContext; return observation; };
    const actors = new Set<string>(), types = new Set<string>();
    for (let minute=0; minute<6; minute++) {
      await enriched.advance(60); await baseline.advance(60);
      expect(enriched.world.snapshot).toEqual(baseline.world.snapshot);
      for (const id of enriched.world.residentIds) expect(JSON.stringify(enriched.world.observe(id)).length + 400).toBeLessThan(24_000);
      for (const event of enriched.world.snapshot.events) {
        types.add(event.type);
        if(event.type==='action-validated' && event.data.accepted) actors.add(event.actor!);
      }
    }
    expect(actors.size).toBe(16);
    for (const type of ['paid-work-completed','purchase-paid','food-consumed','rest-completed','arrived']) expect(types).toContain(type);
    expect(enriched.scheduler.decisionCount).toBeLessThan(2048);
  }, 20_000);

  it('compares six bounded real decision inputs offline without claiming reasoning gains', () => {
    const result = compareSocialContext();
    expect(result.generations).toBe(0); expect(result.liveEvidence).toBe(false);
    expect(result.cases).toHaveLength(6);
    for (const item of result.cases) {
      expect(item.addedCharacters).toBeGreaterThan(0);
      expect(item.withContextCharacters).toBeLessThan(24_000);
      expect(item.addedContext!.connections.length).toBeLessThanOrEqual(6);
      expect(item.addedContext!.background!.id).toBe(`history:unity-v1:self:${item.actorId}`);
    }
    expect(result.cases.find(item=>item.actorId==='musa')!.deliveredRequests).toHaveLength(1);
  });
});
