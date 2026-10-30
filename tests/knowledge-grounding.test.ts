import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { validateConversation, neighbourhoodInstructions, type NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import type { ConversationContext, ConversationDecision, ServiceClaim } from '../shared/neighbourhood/conversation.js';
import type { NpcId, Action } from '../shared/neighbourhood/types.js';
import { prepareAutonomyFixture, ConditionalAutonomyProbe, runRecordedAutonomyProbe, autonomyProbeMaximumUsd } from '../server/evaluation/autonomy-probe.js';
import { NeighbourhoodServerSession } from '../server/session.js';

function context(world = new Neighbourhood()): ConversationContext { return { observation: world.observe('zainab'), message: 'Where can I eat?', history: [] }; }
function claim(placeId = 'market'): ServiceClaim { return { placeId, service: 'food-retail', product: 'food-portion', availability: 'unknown', quantity: null }; }
function reply(claims: ServiceClaim[], evidenceIds = ['place-facts:market'], uncertain = true): ConversationDecision {
  return { reply: 'A natural response about known services, with uncertainty about current availability.', evidenceIds, uncertain, proposedDecision: null, claims };
}
function apply(world: Neighbourhood, id: NpcId, action: Action) {
  const request = world.requestInteractionDecision(id)!;
  const proposal = { goalId: world.snapshot.npcs[id].goals[0]!.id, reason: 'Offline fixture decision', action };
  return { request, proposal, outcome: world.applyDecision(request.id, proposal, { mode: 'mock', model: 'test-fixture' }) };
}

describe('knowledge and recommendation grounding', () => {
  it('separates known identity, services, products and unobserved availability', () => {
    const obs = context().observation;
    expect(obs.places.map(place => place.id)).toEqual(['market','centre']);
    expect(obs.placeKnowledge.find(place => place.placeId === 'market')).toMatchObject({ facts: { services: ['food-retail'], products: ['food-portion'], source: 'established' }, stock: { value: null, source: 'unknown' } });
    expect(obs.placeKnowledge.find(place => place.placeId === 'centre')).toMatchObject({ facts: { services: ['stock-collection'], products: ['stall-supplies'] }, stock: { value: 8, source: 'observed', observedAt: 0 } });
    expect(JSON.stringify(obs)).not.toContain('scenic-view'); // No knowledge of unknown landmarks.
  });
  it('rejects the live-test defect: supply desk recommended as food retail', () => {
    expect(() => validateConversation(reply([claim('centre')], ['place-facts:centre']), context())).toThrow('Unsupported service');
  });
  it('rejects pairing a valid supply service with an unsupported food product', () => {
    expect(() => validateConversation(reply([{ ...claim('centre'), service: 'stock-collection' }], ['place-facts:centre']), context())).toThrow('Unsupported service');
  });
  it('permits natural food-stall recommendations with explicit uncertainty about stock', () => {
    expect(() => validateConversation(reply([claim()]), context())).not.toThrow();
    expect(() => validateConversation(reply([claim()], ['place-facts:market'], false), context())).toThrow('requires uncertainty');
  });
  it('rejects invented destinations and identity-only evidence for services', () => {
    expect(() => validateConversation(reply([claim('palace')], ['place-facts:palace']), context())).toThrow('grounded');
    expect(() => validateConversation(reply([claim()], ['market']), context())).toThrow('Unsupported service');
  });
  it('does not grant services to old checkpoints that only knew place names', () => {
    const state = new Neighbourhood().snapshot;
    for (const npc of Object.values(state.npcs)) delete npc.knowledge.placeFacts;
    const restored = Neighbourhood.restore(JSON.stringify(state));
    expect(restored.observe('zainab').placeKnowledge.every(place => place.facts === null)).toBe(true);
    expect(() => validateConversation(reply([claim()], ['market']), context(restored))).toThrow('Unsupported service');
  });
  it('preserves incomplete knowledge without inferring an unlisted service', () => {
    const state = new Neighbourhood().snapshot;
    state.npcs.zainab.knowledge.placeFacts!.market = { services: [], products: [], source: 'established', complete: false };
    const restored = Neighbourhood.restore(JSON.stringify(state));
    expect(restored.observe('zainab').placeKnowledge[0]!.facts!.complete).toBe(false);
    expect(() => validateConversation(reply([claim()]), context(restored))).toThrow('Unsupported service');
  });
  it('does not accept fabricated authoritative service knowledge in a checkpoint', () => {
    const state = new Neighbourhood().snapshot;
    state.npcs.zainab.knowledge.placeFacts!.centre!.services.push('food-retail');
    expect(() => Neighbourhood.restore(JSON.stringify(state))).toThrow('snapshot');
  });
  it('distinguishes historical stock from availability now', () => {
    const world = new Neighbourhood(); apply(world, 'zainab', { type: 'travel', destination: 'market' }); world.advance(10);
    const observed = world.observe('zainab').placeKnowledge.find(place => place.placeId === 'market')!;
    const evidence = ['place-facts:market', observed.stock.evidenceId!];
    expect(() => validateConversation(reply([{ ...claim(), availability: 'available-now', quantity: 1 }], evidence, false), context(world))).not.toThrow();
    world.advance(1);
    expect(() => validateConversation(reply([{ ...claim(), availability: 'available-now', quantity: 1 }], evidence, false), context(world))).toThrow('not established');
    expect(() => validateConversation(reply([{ ...claim(), availability: 'last-observed', quantity: 1 }], evidence), context(world))).not.toThrow();
    expect(() => validateConversation(reply([{ ...claim(), availability: 'last-observed', quantity: 1 }], evidence, false), context(world))).toThrow('Historical');
  });
  it('rejects zero stock, closed sales and invented stock quantities as available-now', () => {
    const world = new Neighbourhood(); apply(world, 'zainab', { type: 'travel', destination: 'market' }); world.advance(10);
    apply(world, 'amina', { type: 'set-sales', open: false });
    const stock = world.observe('zainab').placeKnowledge.find(place => place.placeId === 'market')!.stock;
    const evidence = ['place-facts:market', stock.evidenceId!];
    expect(() => validateConversation(reply([{ ...claim(), availability: 'available-now', quantity: 1 }], evidence, false), context(world))).toThrow('not established');
    expect(() => validateConversation(reply([{ ...claim(), availability: 'last-observed', quantity: 99 }], evidence), context(world))).toThrow('stock claim');
    apply(world, 'amina', { type: 'set-sales', open: true }); apply(world, 'zainab', { type: 'buy', quantity: 1 });
    const empty = world.observe('zainab').placeKnowledge.find(place => place.placeId === 'market')!.stock;
    expect(() => validateConversation(reply([{ ...claim(), availability: 'available-now', quantity: 0 }], ['place-facts:market',empty.evidenceId!],false), context(world))).toThrow('not established');
  });
  it('retains conflicting reports and NPC speech without promoting them to facts', () => {
    const world = new Neighbourhood();
    world.recordConversation('zainab','player','The centre sells meals and has 99 portions.');
    world.recordConversation('zainab','player','The centre does not sell meals.');
    world.recordConversation('zainab','npc','I heard there were meals at the desk.');
    const obs = world.observe('zainab');
    expect(obs.memoryEvidence.slice(-3).map(item => item.interpretation)).toEqual(['unverified-report','unverified-report','speech-only']);
    expect(obs.resources.supplierGoods).toBe(8);
    expect(obs.placeKnowledge.find(place => place.placeId === 'centre')!.facts!.services).toEqual(['stock-collection']);
    expect(() => validateConversation(reply([claim('centre')], ['place-facts:centre',obs.actor.memories.at(-1)!.id]),context(world))).toThrow('Unsupported service');
    expect(neighbourhoodInstructions).toContain('conflicting reports');
  });
  it('documents the remaining free-text gap rather than claiming sentence-level enforcement', () => {
    // A dishonest/incorrect omitted claim cannot be detected just by validating its JSON.
    expect(() => validateConversation({ reply: 'The supply desk sells meals.', evidenceIds: ['centre'], uncertain: false, proposedDecision: null, claims: [] },context())).not.toThrow();
  });
});

const folders: string[] = []; const sessions: NeighbourhoodServerSession[] = [];
afterEach(async () => { for (const session of sessions.splice(0)) await session.close(); for (const path of folders.splice(0)) await rm(path,{recursive:true,force:true}); });
async function openFixture(first: Action, second: 'accept' | 'decline' | 'clarify' = 'accept') {
  const path = await mkdtemp(join(tmpdir(),'city-grounding-test-')); folders.push(path);
  const decide = vi.fn<NeighbourhoodProvider['decide']>().mockImplementation(async request => ({ mode: 'mock', model: 'offline-choice', decision: { goalId: request.observation.actor.goals[0]!.id, reason: 'Independent offline alternative', action: request.actorId === 'amina' ? first : second === 'clarify' ? { type:'respond-transport', taskId:request.observation.tasks[0]!.id, accept:'clarify',question:'How many goods should I collect?' } : {type:'respond-transport',taskId:request.observation.tasks[0]!.id,accept:second === 'accept'} } }));
  const provider: NeighbourhoodProvider = { mode:'mock',metrics:null,decide,converse:async()=>{throw new Error('No conversation in autonomy test');} };
  const session = await NeighbourhoodServerSession.open({checkpoint:join(path,'session.json'),initialWorld:prepareAutonomyFixture().serialize(),provider}); sessions.push(session);
  return {session,decide,path};
}
describe('conditional event-driven autonomy readiness', () => {
  for (const action of [{type:'wait',seconds:20},{type:'travel',destination:'centre'},{type:'set-sales',open:false},{type:'work',seconds:12}] as Action[]) {
    it(`accepts Amina's alternative ${action.type} without invoking Musa`,async()=>{
      const {session,decide,path}=await openFixture(action); const result=await runRecordedAutonomyProbe(session,join(path,'probe.ndjson'));
      expect(result.musaInvoked).toBe(false); expect(decide).toHaveBeenCalledTimes(1);
      expect(result.steps[0]!.after.events.filter(event=>event.type==='action-validated').at(-1)!.data.accepted).toBe(true);
      expect(decide.mock.calls[0]![0].triggers).not.toContain('player-interaction');
      expect(decide.mock.calls[0]![0].observation).toMatchObject({resources:{marketGoods:1,supplierGoods:8},actor:{needs:{stock:.8}}});
      expect(session.frame.snapshot.resources.salesOpen).toBe(action.type==='set-sales'?false:true);
    });
  }
  for (const choice of ['accept','decline','clarify'] as const) {
    it(`only after a validated request, lets Musa independently ${choice}`,async()=>{
      const {session,decide,path}=await openFixture({type:'propose-transport',recipient:'musa',quantity:2},choice);
      const result=await runRecordedAutonomyProbe(session,join(path,'probe.ndjson'));
      expect(result.musaInvoked).toBe(true); expect(decide).toHaveBeenCalledTimes(2);
      const musa=decide.mock.calls[1]![0]; expect(musa.actorId).toBe('musa');expect(musa.triggers).toContain('transport-request');
      expect(musa.observation.actor.goals[0]!.id).toBe('earn');expect(JSON.stringify(musa.observation)).not.toContain('restock');
      expect(session.frame.snapshot.tasks[0]!.status).toBe(choice==='accept'?'accepted':choice==='decline'?'declined':'proposed');
      expect(session.frame.snapshot.resources).toEqual({supplierGoods:8,marketGoods:1,salesOpen:true});
      expect(session.frame.events.some(event=>event.type==='transport-delivered')).toBe(false);
      if(choice==='clarify')expect(session.frame.events.some(event=>event.type==='transport-clarification-requested')).toBe(true);
      await expect(runRecordedAutonomyProbe(session,join(path,'probe.ndjson'))).rejects.toThrow();expect(decide).toHaveBeenCalledTimes(2);
      expect((await readFile(join(path,'probe.ndjson'),'utf8')).trim().split('\n')).toHaveLength(4);
    });
  }
  it('rejects an invalid request without invoking Musa',async()=>{
    const {session,decide,path}=await openFixture({type:'propose-transport',recipient:'zainab',quantity:2});
    const result=await runRecordedAutonomyProbe(session,join(path,'probe.ndjson'));expect(result.musaInvoked).toBe(false);expect(session.frame.snapshot.tasks).toEqual([]);
  });
  it('does not execute inference if durable dispatch recording fails',async()=>{
    const {session,decide}=await openFixture({type:'wait',seconds:20});
    const probe=new ConditionalAutonomyProbe(session,async()=>{throw new Error('Disk failed');});
    await expect(probe.run()).rejects.toThrow('Disk failed');expect(decide).not.toHaveBeenCalled();await expect(probe.run()).rejects.toThrow('already started');
  });
  it('stops after an inference failure without invoking Musa or retrying',async()=>{
    const {session,decide,path}=await openFixture({type:'wait',seconds:20});decide.mockRejectedValueOnce(new Error('Provider unavailable'));
    const result=await runRecordedAutonomyProbe(session,join(path,'probe.ndjson'));expect(result.steps).toHaveLength(1);expect(decide).toHaveBeenCalledTimes(1);
    expect(session.frame.events.some(event=>event.type==='inference-unavailable')).toBe(true);
  });
  it('keeps stale decisions and duplicate completions from changing tasks or inventory twice',()=>{
    const world=prepareAutonomyFixture();const stale=world.requestDecision('amina')!;world.setRoadBlocked('centre-market',true);
    expect(world.applyDecision(stale.id,{goalId:'restock',reason:'Late',action:{type:'propose-transport',recipient:'musa',quantity:2}},{mode:'mock',model:'test'}).reason).toBe('stale-actor');
    world.setRoadBlocked('centre-market',false);
    const proposed=apply(world,'amina',{type:'propose-transport',recipient:'musa',quantity:2});const task=Object.values(world.snapshot.tasks)[0]!;
    expect(world.applyDecision(proposed.request.id,proposed.proposal,{mode:'mock',model:'test'}).duplicate).toBe(true);expect(Object.values(world.snapshot.tasks)).toHaveLength(1);
    apply(world,'musa',{type:'respond-transport',taskId:task.id,accept:true});const fulfil=apply(world,'musa',{type:'fulfil-transport',taskId:task.id});world.advance(12);
    const before=world.snapshot;expect(before.tasks[task.id]!.status).toBe('delivered');
    expect(world.applyDecision(fulfil.request.id,fulfil.proposal,{mode:'mock',model:'test'}).duplicate).toBe(true);
    expect(apply(world,'musa',{type:'fulfil-transport',taskId:task.id}).outcome.accepted).toBe(false);
    expect(world.snapshot.resources).toEqual(before.resources);expect(world.snapshot.npcs.musa.inventory.rewards).toBe(1);
  });
  it('caps conservative pricing at two existing provider reservations',()=>{expect(autonomyProbeMaximumUsd).toBe(.032408);expect(autonomyProbeMaximumUsd).toBeLessThan(.04);});
});
