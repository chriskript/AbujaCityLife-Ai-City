import { describe, expect, it } from 'vitest';
import { createTown } from '../shared/neighbourhood/town.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { assertSnapshot } from '../shared/neighbourhood/snapshot.js';
import { isNpcDecision, npcDecisionSchema } from '../shared/neighbourhood/decision-schema.js';
import { prepareModelInput } from '../server/inference/model-context.js';
import type { Action } from '../shared/neighbourhood/types.js';
import {reasoningOpportunity} from '../server/inference/selective-provider.js';

function town(){const w=createTown('social-contract');w.enableSocialVisits();return w;}
function apply(w:Neighbourhood,id:string,action:Action){
  const request=w.requestInteractionDecision(id);expect(request).not.toBeNull();
  return w.applyDecision(request!.id,{goalId:request!.observation.actor.goals[0]!.id,reason:'Synthetic offline social contract fixture',action},{mode:'meta',model:'synthetic-social-test'});
}
const invitation=(destination='town-green'):Action=>({type:'invite-social',recipient:'musa',destination,channel:'text',seconds:90,message:'Would you like to spend a little time together here?'});
function invite(w:Neighbourhood,destination='town-green'){
  expect(apply(w,'amina',invitation(destination)).accepted).toBe(true);w.advance(5);
  return w.observe('musa').socialVisits!.invitations[0]!.id;
}
function accepted(w:Neighbourhood){const id=invite(w);expect(apply(w,'musa',{type:'respond-social',invitationId:id,response:'accept',destination:null,message:'Yes, I would like to meet.'}).accepted).toBe(true);w.advance(5);return id;}

describe('scoped, consented social invitations and visits',()=>{
  it('schedules separate conversational choices after attendance, preserves turns through recovery and completes shared time',()=>{
    let w=town();const id=accepted(w);
    for(const actor of ['amina','musa'])expect(apply(w,actor,{type:'join-social',invitationId:id}).accepted).toBe(true);
    for(let seconds=0;seconds<180&&w.snapshot.socialVisits!.invitations[id]!.metAt===null;seconds++)w.advance(1);
    const met=w.snapshot.socialVisits!.invitations[id]!.metAt!;expect(met).not.toBeNull();
    for(const actor of ['amina','musa']){
      // No requestInteractionDecision: real arrival/utterance triggers must make
      // a new inference opportunity available without player intervention.
      const request=w.requestDecision(actor)!;expect(request).not.toBeNull();
      expect(reasoningOpportunity(request.observation,request.triggers)).toBe('social-rendezvous-choice');
      const prepared=prepareModelInput(request,'decision');
      expect(prepared.schema.properties.action.anyOf.some(b=>b.properties.type.enum[0]==='socialise')).toBe(true);
      expect(prepared.input.observation.socialVisits!.invitations[0]!.canConverse).toBe(true);
      expect(w.applyDecision(request.id,{goalId:request.observation.actor.goals[0]!.id,reason:'Synthetic offline choice; live conversation is not being claimed',action:{type:'socialise',invitationId:id,seconds:10,message:actor==='amina'?'How have things been going?':'I have been busy with deliveries, thanks for asking.'}},{mode:'meta',model:'synthetic-conversation-contract'}).accepted).toBe(true);
      if(actor==='amina'){
        expect(w.observe('amina').socialVisits!.invitations[0]!.canConverse).toBe(false);
        w=Neighbourhood.restore(w.serialize());
      }
    }
    expect(w.snapshot.events.filter(e=>e.type==='social-conversation')).toHaveLength(2);
    expect(w.snapshot.npcs.amina.relationships.musa!.socialExchanges).toBe(2);
    while(w.snapshot.time<met+90)w.advance(Math.min(60,met+90-w.snapshot.time));
    expect(w.snapshot.events.filter(e=>e.type==='social-time-completed')).toHaveLength(1);
    expect(w.snapshot.socialVisits!.invitations[id]!.joined).toEqual([]);
    expect(w.requestDecision('musa')).not.toBeNull();
    expect(Neighbourhood.restore(w.serialize()).snapshot.events.filter(e=>e.type==='social-time-completed')).toHaveLength(1);
    expect(()=>assertSnapshot(w.snapshot)).not.toThrow();
  });
  it('lets newly introduced residents invite and answer nearby without acquiring phone numbers or trust',()=>{
    const w=town();const actor=w.residentIds.find(id=>w.observe(id).nearbyPeople.some(p=>!p.known&&w.observe(id).encounterOpportunities.includes(p.id)))!;
    expect(actor).toBeTruthy();const recipient=w.observe(actor).nearbyPeople.find(p=>!p.known&&w.observe(actor).encounterOpportunities.includes(p.id))!.id;
    const phones=[w.observe(actor).communication!.contacts,w.observe(recipient).communication!.contacts];
    expect(apply(w,actor,{type:'encounter',recipient,purpose:'introduce',message:'Would you like to introduce ourselves?'}).accepted).toBe(true);
    const encounter=w.observe(recipient).encounters.at(-1)!;
    expect(apply(w,recipient,{type:'respond-encounter',interactionId:encounter.id,response:'accept',message:'Yes, hello.'}).accepted).toBe(true);
    expect(apply(w,actor,{type:'invite-social',recipient,destination:w.snapshot.npcs[actor]!.node,channel:'nearby',seconds:60,message:'Would you like to spend some time here?'}).accepted).toBe(true);
    const invitation=w.observe(recipient).socialVisits!.invitations[0]!;
    expect(apply(w,recipient,{type:'respond-social',invitationId:invitation.id,response:'decline',destination:null,message:'I would prefer some time alone.'}).accepted).toBe(true);
    expect(w.observe(actor).communication!.contacts).toEqual(phones[0]);expect(w.observe(recipient).communication!.contacts).toEqual(phones[1]);
    expect(w.snapshot.npcs[actor]!.relationships[recipient]?.socialExchanges ?? 0).toBe(0);
  });
  it('enables versioned affordances without resetting old saves, inventories, relationships or history',()=>{
    const w=createTown('old-social-save'),before=w.snapshot;w.enableSocialVisits();w.enableSocialVisits();
    const after=w.snapshot;expect(after.events).toEqual(before.events);expect(after.tasks).toEqual(before.tasks);expect(after.town).toEqual(before.town);
    for(const id of w.residentIds){expect(after.npcs[id]!.inventory).toEqual(before.npcs[id]!.inventory);expect(after.npcs[id]!.relationships).toEqual(before.npcs[id]!.relationships);expect(after.npcs[id]!.memories).toEqual(before.npcs[id]!.memories);expect(new Set(after.npcs[id]!.capabilities).size).toBe(after.npcs[id]!.capabilities.length);}
    expect(after.socialVisits).toEqual({version:1,nextId:1,invitations:{}});
    expect(Neighbourhood.restore(w.serialize()).snapshot.socialVisits).toEqual(after.socialVisits);
  });
  it('delivers home-doorstep invitations only to the recipient, and never grants a private unit or phone contact',()=>{
    const w=town(),source=w.observe('amina'),door=source.socialVisits!.venues.find(v=>v.kind==='home-doorstep')!.id;
    const beforeMusa=w.observe('musa'),beforeChris=w.observe('chris');
    expect(beforeMusa.places.some(p=>p.id===door)).toBe(false);
    expect(apply(w,'amina',invitation(door)).accepted).toBe(true);
    const own=w.observe('amina'),sent=own.actor.memories.find(m=>m.subject==='communication-1')!;
    expect(own.memoryEvidence.find(m=>m.id===sent.id)!.interpretation).toBe('speech-only');
    expect(own.actor.memories.find(m=>m.subject==='social-1')).toMatchObject({kind:'reported',source:'amina',certainty:'uncertain'});
    expect(w.observe('musa').socialVisits!.invitations).toEqual([]);
    expect(w.observe('musa').places.some(p=>p.id===door)).toBe(false);w.advance(5);
    expect(w.observe('musa').places.some(p=>p.id===door)).toBe(true);
    expect(w.observe('musa').communication!.contacts).toEqual(beforeMusa.communication!.contacts);
    expect(w.observe('musa').socialVisits!.invitations[0]!.update.deliveredTo).toEqual(['musa']);
    expect(w.observe('chris').socialVisits!.invitations).toEqual([]);expect(w.observe('chris').places).toEqual(beforeChris.places);
    const home=w.snapshot.npcs.amina!.home!;
    expect(apply(w,'musa',{type:'travel',destination:home}).accepted).toBe(false);
    expect(w.observe('musa').places.some(p=>p.id===home)).toBe(false);
    expect(apply(w,'amina',invitation(home)).reason).toBe('unknown-or-private-social-venue');
    expect(()=>assertSnapshot(w.snapshot)).not.toThrow();
  });
  it.each(['decline','postpone'] as const)('allows independent %s without travel, friendship or a financial commitment',response=>{
    const w=town(),id=invite(w),before=w.snapshot;
    expect(apply(w,'musa',{type:'respond-social',invitationId:id,response,destination:null,message:'I prefer to attend to my own priorities.'}).accepted).toBe(true);
    expect(w.observe('amina').socialVisits!.invitations[0]!.update.status).toBe('pending');w.advance(5);
    expect(w.observe('amina').socialVisits!.invitations[0]!.update.status).toBe(response==='decline'?'declined':'postponed');
    expect(w.snapshot.npcs.musa!.node).toBe(before.npcs.musa!.node);expect(w.snapshot.npcs.musa!.relationships).toEqual(before.npcs.musa!.relationships);
    expect(w.snapshot.npcs.amina!.inventory).toEqual(before.npcs.amina!.inventory);expect(w.snapshot.tasks).toEqual({});
  });
  it('requires an independently accepted alternative and hides the counteroffer before delivery',()=>{
    const w=town(),id=invite(w);
    expect(apply(w,'musa',{type:'respond-social',invitationId:id,response:'alternative',destination:'stand',message:'Would the taxi stand suit us better?'}).accepted).toBe(true);
    expect(w.observe('amina').socialVisits!.invitations[0]!.update.destination).toBe('town-green');
    expect(apply(w,'musa',{type:'join-social',invitationId:id}).reason).toBe('social-consent-required');
    w.advance(5);expect(w.observe('amina').socialVisits!.invitations[0]!.update.respondTo).toBe('amina');
    expect(apply(w,'amina',{type:'respond-social',invitationId:id,response:'accept',destination:null,message:'That alternative works for me.'}).accepted).toBe(true);
    expect(w.snapshot.npcs.musa!.activity.kind).toBe('idle');w.advance(5);
    expect(w.observe('musa').socialVisits!.invitations[0]!.update.status).toBe('accepted');
  });
  it('separates acceptance, independent journeys, meeting, actual utterances and leaving',()=>{
    const w=town(),id=accepted(w);
    expect(w.snapshot.npcs.amina!.activity.kind).toBe('idle');expect(w.snapshot.npcs.musa!.activity.kind).toBe('idle');
    expect(apply(w,'amina',{type:'socialise',invitationId:id,seconds:20,message:'Are you here?'}).reason).toBe('social-partner-not-present');
    for(const actor of ['amina','musa'])expect(apply(w,actor,{type:'join-social',invitationId:id}).accepted).toBe(true);
    for(let elapsed=0;elapsed<180&&w.snapshot.socialVisits!.invitations[id]!.metAt===null;elapsed++)w.advance(1);
    // Agreed time starts only when both actually arrive, not at acceptance.
    const state=w.snapshot;expect(state.socialVisits!.invitations[id]!.metAt).not.toBeNull();
    expect(state.events.some(e=>e.type==='social-met')).toBe(true);
    expect(w.observe('amina').socialVisits!.invitations[0]!.update.status).toBe('accepted');
      expect(apply(w,'amina',{type:'socialise',invitationId:id,seconds:20,message:'How has your work been going?'}).accepted).toBe(true);
      expect(apply(w,'amina',{type:'socialise',invitationId:id,seconds:20,message:'I should let you choose whether to reply.'}).reason).toBe('social-turn-awaiting-partner');
      expect(w.snapshot.npcs.amina!.relationships.musa).toMatchObject({successfulJobs:0,socialExchanges:1});
      expect(w.snapshot.npcs.musa!.relationships.amina).toMatchObject({successfulJobs:0,socialExchanges:1});
      expect(apply(w,'musa',{type:'socialise',invitationId:id,seconds:10,message:'I have been considering a quieter afternoon.'}).accepted).toBe(true);
      expect(apply(w,'amina',{type:'leave-social',invitationId:id,message:'I would like some time alone now.'}).accepted).toBe(true);
      expect(w.snapshot.socialVisits!.invitations[id]!.joined).toEqual([]);
    expect(Object.keys(w.snapshot.tasks)).toHaveLength(0);expect(()=>assertSnapshot(w.snapshot)).not.toThrow();
  });
  it('allows withdrawal during an unseen acceptance without revealing that acceptance',()=>{
    const w=town(),id=invite(w);
    expect(apply(w,'musa',{type:'respond-social',invitationId:id,response:'accept',destination:null,message:'I would like to join.'}).accepted).toBe(true);
    expect(w.observe('amina').socialVisits!.invitations[0]!.update.status).toBe('pending');
    expect(apply(w,'amina',{type:'leave-social',invitationId:id,message:'My priorities changed; I cannot meet.'}).accepted).toBe(true);
    w.advance(5);expect(w.observe('musa').socialVisits!.invitations[0]!.update.status).toBe('left');expect(()=>assertSnapshot(w.snapshot)).not.toThrow();
  });
  it('makes schema branches and model knowledge match actual scoped invitations and alternatives',()=>{
    const w=town(),id=invite(w),request=w.requestInteractionDecision('musa')!,prepared=prepareModelInput(request,'decision');
    expect(prepared.input.observation.socialVisits!.invitations[0]!.id).toBe(id);
    expect(prepared.instructions).toContain('never private-unit access');
    const response=prepared.schema.properties.action.anyOf.find(b=>b.properties.type.enum[0]==='respond-social')!;
    expect((response.properties as any).invitationId.enum).toEqual([id]);
    expect(prepared.schema.properties.action.anyOf.some(b=>b.properties.type.enum[0]==='join-social')).toBe(false);
    for(const type of ['invite-social','respond-social','join-social','socialise','leave-social'])expect(npcDecisionSchema.properties.action.anyOf.some(b=>b.properties.type.enum[0]===type)).toBe(true);
    expect(isNpcDecision({goalId:'social',reason:'Consider',action:{type:'respond-social',invitationId:id,response:'accept',destination:'market',message:'Yes'}})).toBe(false);
    expect(apply(w,'amina',{type:'join-social',invitationId:'constructor'}).reason).toBe('unknown-social-invitation');
  });
  it('expires ignored invitations and round-trips delivered context without duplicating updates or rewriting events',()=>{
    const w=town(),id=invite(w);for(let i=0;i<10;i++)w.advance(60);const before=w.snapshot;
    expect(before.socialVisits!.invitations[id]!.updates.at(-1)!.status).toBe('expired');
    const restored=Neighbourhood.restore(w.serialize());expect(restored.snapshot.events).toEqual(before.events);expect(restored.snapshot.socialVisits).toEqual(before.socialVisits);
    expect(()=>assertSnapshot(restored.snapshot)).not.toThrow();
    const corrupt=structuredClone(before);corrupt.socialVisits!.invitations[id]!.updates[0]!.destination=corrupt.npcs.amina!.home!;expect(()=>assertSnapshot(corrupt)).toThrow();
  });
  it('retains experienced social exchanges after the same residents complete a paid delivery',()=>{
    const w=town(),id=accepted(w);
    for(const person of ['amina','musa'])expect(apply(w,person,{type:'join-social',invitationId:id}).accepted).toBe(true);
    w.advance(60);
    expect(apply(w,'amina',{type:'socialise',invitationId:id,seconds:10,message:'It is good to catch up.'}).accepted).toBe(true);
    expect(apply(w,'musa',{type:'socialise',invitationId:id,seconds:10,message:'I am glad we met.'}).accepted).toBe(true);
    const socialAt=w.snapshot.npcs.amina.relationships.musa!.lastSocialAt;
    expect(apply(w,'amina',{type:'leave-social',invitationId:id,message:'I will return to the stall.'}).accepted).toBe(true);
    for(const person of ['amina','musa'])expect(apply(w,person,{type:'travel',destination:'market'}).accepted).toBe(true);
    w.advance(60);
    expect(apply(w,'amina',{type:'propose-transport',recipient:'musa',quantity:2}).accepted).toBe(true);
    expect(apply(w,'musa',{type:'respond-transport',taskId:'task-1',accept:true}).accepted).toBe(true);
    expect(apply(w,'musa',{type:'fulfil-transport',taskId:'task-1'}).accepted).toBe(true);w.advance(60);
    for(const [actor,other] of [['amina','musa'],['musa','amina']])expect(w.snapshot.npcs[actor!]!.relationships[other!]).toMatchObject({socialExchanges:2,lastSocialAt:socialAt,successfulJobs:1});
    expect(Neighbourhood.restore(w.serialize()).snapshot.npcs.amina.relationships.musa).toMatchObject({socialExchanges:2,successfulJobs:1});
  });
});
