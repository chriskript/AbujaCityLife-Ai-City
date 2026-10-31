import { describe,expect,it } from 'vitest';
import { mkdtemp,readFile,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NeighbourhoodServerSession } from '../server/session.js';
import { createTown } from '../shared/neighbourhood/town.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { HeadlessTownRunner } from '../shared/neighbourhood/headless-runner.js';
import { NeighbourhoodMockProvider } from '../shared/neighbourhood/mock-provider.js';
import { isNpcDecision,npcDecisionSchema } from '../shared/neighbourhood/decision-schema.js';
import { projectNeighbourhood } from '../shared/neighbourhood/presentation.js';
import type { Action,WorldState } from '../shared/neighbourhood/types.js';

function apply(world:Neighbourhood,id:string,action:Action){const request=world.requestInteractionDecision(id)!;expect(request).not.toBeNull();return world.applyDecision(request.id,{goalId:request.observation.actor.goals[0]!.id,reason:'Offline communication test',action},{mode:'mock',model:'offline'});}
const send=(recipient='musa',channel:'text'|'call'='text',purpose:'chat'|'request-help'='request-help'):Action=>({type:'communicate',recipient,channel,purpose,message:'Could we discuss a paid delivery?',memoryId:null});
const reply=(response:'accept'|'decline'|'defer'|'clarify'|'ignore'='accept',channelId='communication-1'):Action=>({type:'respond-communication',communicationId:channelId,response,message:response==='ignore'?'I prefer not to engage.':'I can discuss the terms.',memoryId:null});
function advance(world:Neighbourhood,seconds:number){for(let remaining=seconds;remaining>0;){const step=Math.min(60,remaining);world.advance(step);remaining-=step;}}
function conservation(state:WorldState){
 const jobs=Object.values(state.npcs).flatMap(npc=>npc.activity.kind==='work' && npc.activity.job?[npc.activity.job]:[]);
 expect(Object.values(state.npcs).reduce((sum,npc)=>sum+npc.inventory.coins!,0)+Object.values(state.town!.businesses).reduce((sum,b)=>sum+b.coins,0)+jobs.reduce((sum,job)=>sum+job.wage,0)+Object.values(state.tasks).reduce((sum,task)=>sum+(task.escrow ?? 0),0)).toBe(state.town!.initialMoney);
 expect(state.resources.supplierGoods+state.resources.marketGoods+Object.values(state.npcs).reduce((sum,npc)=>sum+npc.inventory.goods,0)+state.town!.consumed).toBe(state.initialGoods+state.town!.produced);
}
function agreed(channel:'text'|'call'='text') {const world=createTown('agreed');expect(apply(world,'amina',send('musa',channel)).accepted).toBe(true);if(channel==='text')world.advance(5);expect(apply(world,'musa',reply()).accepted).toBe(true);if(channel==='text')world.advance(5);return world;}

describe('grounded contact communication',()=>{
 it('separates prior contacts from acquaintances, and keeps private contacts and needs out of observations',()=>{
  const world=createTown('contacts');const observation=world.observe('amina');
  expect(observation.communication!.contacts.map(item=>item.id)).toContain('musa');expect(world.observe('tunde').actor.knowledge.people).toContain('chris');expect(world.observe('tunde').actor.knowledge.contacts).not.toContain('chris');
  expect(observation.communication!.contacts[0]).toEqual({id:'musa',name:'Musa',canTransport:true});
  expect(observation.communication!.rules).toMatchObject({textDelay:5,callLifetime:60,cooldown:180,maximumThreads:128});
  expect(observation.communication!.contacts.some(person=>Object.hasOwn(person,'needs') || Object.hasOwn(person,'node') || Object.hasOwn(person,'contacts'))).toBe(false);
 });
 it('permits a one-way contact disclosure after an introduction, without forced friendship or reciprocal access',()=>{
  const world=createTown('introductions');
  expect(apply(world,'chris',{type:'encounter',recipient:'zainab',purpose:'introduce',message:'May I introduce myself?'}).accepted).toBe(true);
  expect(apply(world,'zainab',{type:'respond-encounter',interactionId:'encounter-1',response:'accept',message:'Yes, let us introduce ourselves.'}).accepted).toBe(true);
  const relationships=world.snapshot.npcs.chris!.relationships;
  expect(apply(world,'chris',{type:'offer-contact',recipient:'zainab'}).accepted).toBe(true);
  expect(world.observe('zainab').actor.knowledge.contacts).toContain('chris');expect(world.observe('chris').actor.knowledge.contacts).not.toContain('zainab');
  expect(world.snapshot.npcs.chris!.relationships).toEqual(relationships);
  expect(apply(world,'zainab',{type:'offer-contact',recipient:'chris'}).accepted).toBe(true);expect(world.observe('chris').actor.knowledge.contacts).toContain('zainab');
  expect(apply(world,'chris',{type:'offer-contact',recipient:'zainab'}).reason).toBe('contact-already-shared');
 });
 it('delivers texts and responses after five seconds, with no unread reply or third-party leakage',()=>{
  const world=createTown('delay');expect(apply(world,'amina',send()).accepted).toBe(true);
  expect(world.observe('musa').communication!.threads).toHaveLength(0);world.advance(4.75);expect(world.observe('musa').communication!.threads).toHaveLength(0);
  world.advance(.25);expect(world.observe('musa').communication!.threads[0]!.status).toBe('pending');
  expect(apply(world,'musa',reply('defer')).accepted).toBe(true);
  expect(world.observe('amina').communication!.threads[0]).toMatchObject({status:'pending',reply:null,response:null,responseAt:null});
  expect(world.observe('zainab').communication!.threads).toHaveLength(0);
  world.advance(5);expect(world.observe('amina').communication!.threads[0]).toMatchObject({status:'deferred',response:'defer'});expect(Object.keys(world.snapshot.tasks)).toHaveLength(0);
 });
 it('recovers in-flight texts and replies without redelivery or duplicate memory effects',()=>{
  let world=createTown('in-flight');apply(world,'amina',send());world.advance(2);world=Neighbourhood.restore(world.serialize());world.advance(3);
  expect(world.snapshot.events.filter(item=>item.type==='text-delivered')).toHaveLength(1);apply(world,'musa',reply());world.advance(2);world=Neighbourhood.restore(world.serialize());world.advance(3);
  expect(world.snapshot.events.filter(item=>item.type==='communication-replied')).toHaveLength(1);world=Neighbourhood.restore(world.serialize());world.advance(5);
  expect(world.snapshot.events.filter(item=>item.type==='text-delivered')).toHaveLength(1);expect(world.snapshot.events.filter(item=>item.type==='communication-replied')).toHaveLength(1);
 });
 it('bounds message capacity and inboxes while preserving existing communication records',()=>{
  const world=createTown('bounded');apply(world,'amina',send());const state=world.snapshot;
  const template=state.communication!.threads['communication-1']!;template.status='expired';template.createdAt=0;template.availableAt=5;template.expiresAt=300;template.delivered=true;state.time=300;state.town!.nextNeedsAt=360;
  // Completed transcript fixture, not 128 repeated calls or provider generations.
  state.communication!.threads=Object.fromEntries(Array.from({length:128},(_,index)=>{const id=`communication-${index+1}`;return[id,{...structuredClone(template),id}];}));state.communication!.nextId=129;
  const bounded=Neighbourhood.restore(JSON.stringify(state));const before=bounded.snapshot.communication;
  expect(apply(bounded,'amina',send()).reason).toBe('communication-capacity');expect(bounded.snapshot.communication).toEqual(before);expect(bounded.observe('amina').communication!.canContact).toHaveLength(0);
  const seed=createTown('inbox').snapshot;seed.npcs.emeka!.knowledge.contacts!.push('musa');const inbox=Neighbourhood.restore(JSON.stringify(seed));
  for(const id of ['amina','chris','tunde','emeka'])expect(apply(inbox,id,send('musa','text','chat')).accepted).toBe(true);
  expect(apply(inbox,'musa',send('amina','text','chat')).reason).toBe('communication-inbox-full');expect(()=>Neighbourhood.restore(inbox.serialize())).not.toThrow();
 });
 it.each(['accept','decline','defer','clarify'] as const)('supports independent %s outcomes without creating tasks or changing relationships',response=>{
  const world=createTown('response');const before=world.snapshot;apply(world,'amina',send('musa','call'));expect(apply(world,'musa',reply(response)).accepted).toBe(true);
  const item=world.snapshot.communication!.threads['communication-1']!;expect(item.response).toBe(response);expect(Object.keys(world.snapshot.tasks)).toHaveLength(0);
  expect(world.snapshot.npcs.musa!.relationships).toEqual(before.npcs.musa!.relationships);expect(world.snapshot.resources).toEqual(before.resources);conservation(world.snapshot);
 });
 it.each(['text','call'] as const)('keeps an ignored %s private and resolves silence at its deadline',channel=>{
  const world=createTown('ignored');apply(world,'amina',send('musa',channel));if(channel==='text')world.advance(5);apply(world,'musa',reply('ignore'));
  expect(world.observe('amina').communication!.threads[0]).toMatchObject({status:'pending',response:null,reply:null});advance(world,channel==='text'?295:60);
  expect(world.observe('amina').communication!.threads[0]).toMatchObject({status:channel==='text'?'expired':'missed',response:null,reply:null});
 });
 it('allows work to take priority over an unanswered call and bounds an answered call',()=>{
  const world=createTown('busy');apply(world,'musa',{type:'work',seconds:90});apply(world,'amina',send('musa','call'));expect(world.requestInteractionDecision('musa')).toBeNull();world.advance(60);
  expect(world.snapshot.communication!.threads['communication-1']!.status).toBe('missed');world.advance(30);expect(world.snapshot.npcs.musa!.activity.kind).toBe('idle');
  const answered=agreed('call');answered.advance(60);expect(answered.snapshot.communication!.threads['communication-1']!.status).toBe('ended');
 });
 it('lets either participant end a connected call and prevents concurrent ringing on the same phone',()=>{
  const world=agreed('call');expect(apply(world,'chris',send('musa','call','chat')).reason).toBe('phone-busy');
  expect(apply(world,'musa',{type:'end-call',communicationId:'communication-1'}).accepted).toBe(true);
  expect(world.snapshot.communication!.threads['communication-1']!.status).toBe('ended');expect(apply(world,'amina',{type:'end-call',communicationId:'communication-1'}).reason).toBe('call-not-connected');
 });
 it('shares only the selected personal memory as an uncertain report, without changing authoritative facts',()=>{
  const world=createTown('reports');const memory=world.observe('amina').actor.memories.find(item=>item.subject==='market' && item.kind==='observed')!;expect(memory).toBeTruthy();
  expect(apply(world,'amina',{...send(),memoryId:memory.id} as Action).accepted).toBe(true);const resources=world.snapshot.resources;world.advance(5);
  const report=world.observe('musa').actor.memories.find(item=>item.source==='amina' && item.subject===memory.subject)!;expect(report).toMatchObject({kind:'reported',certainty:'uncertain',detail:memory.detail});
  expect(world.snapshot.resources).toEqual(resources);expect(world.observe('musa').resources.marketGoods).toBeNull();
 });
 it('rejects unknown contacts, impersonated replies, invented memories and duplicate proposals without gameplay mutation',()=>{
  const world=createTown('invalid');
  for(const [id,action]of [['amina',send('chris')],['tunde',{type:'offer-contact',recipient:'chris'}],['amina',{...send(),memoryId:'invented'}],['zainab',reply()]] as [string,Action][]) {
   const before=world.snapshot;expect(apply(world,id,action).accepted).toBe(false);const after=world.snapshot;expect(after.npcs).toEqual(before.npcs);expect(after.communication).toEqual(before.communication);expect(after.resources).toEqual(before.resources);expect(after.tasks).toEqual(before.tasks);
  }
  apply(world,'amina',send());expect(apply(world,'amina',send()).reason).toBe('communication-cooldown');
 });
 it('keeps schema content bounds aligned and rejects extra fields',()=>{
  expect(npcDecisionSchema.properties.action.anyOf).toHaveLength(21);
  const decision=(action:unknown)=>({goalId:'restock',reason:'Test',action});expect(isNpcDecision(decision(send()))).toBe(true);
  expect(isNpcDecision(decision({...send(),message:'x'.repeat(160)}))).toBe(true);expect(isNpcDecision(decision({...send(),message:'x'.repeat(161)}))).toBe(false);
  expect(isNpcDecision(decision({...send(),privateTargetState:{needs:0}}))).toBe(false);
 });
});

describe('communication and real commitments',()=>{
 it('migrates an existing server checkpoint with an exact rollback copy and preserves counters and personal state',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'town-7d-')),checkpoint=join(dir,'session.json');let session:NeighbourhoodServerSession|undefined;
  try{
   session=await NeighbourhoodServerSession.open({checkpoint});await session.decide('musa');await session.command({id:'pause',worldId:session.frame.snapshot.worldId,type:'pause',paused:true});await session.close();
   const saved=JSON.parse(await readFile(checkpoint,'utf8'));const world=JSON.parse(saved.world) as WorldState;delete world.communication;
   for(const npc of Object.values(world.npcs)){delete npc.knowledge.contacts;delete npc.knowledge.sharedContacts;npc.capabilities=npc.capabilities.filter(type=>!['offer-contact','communicate','respond-communication','end-call'].includes(type));}
   saved.world=JSON.stringify(world);const original=JSON.stringify(saved);await writeFile(checkpoint,original);
   session=await NeighbourhoodServerSession.open({checkpoint});expect(await readFile(checkpoint+'.pre-7d-backup','utf8')).toBe(original);
   const upgraded=JSON.parse(await readFile(checkpoint,'utf8'));const recovered=JSON.parse(upgraded.world) as WorldState;
   expect(upgraded.requests).toBe(saved.requests);expect(upgraded.routineRequests).toBe(saved.routineRequests);expect(upgraded.progression).toEqual(saved.progression);expect(upgraded.paused).toBe(true);
   expect(recovered.tasks).toEqual(world.tasks);expect(recovered.resources).toEqual(world.resources);
   for(const id of Object.keys(world.npcs)){expect(recovered.npcs[id]!.memories).toEqual(world.npcs[id]!.memories);expect(recovered.npcs[id]!.inventory).toEqual(world.npcs[id]!.inventory);expect(recovered.npcs[id]!.relationships).toEqual(world.npcs[id]!.relationships);}
   expect(recovered.communication).toBeTruthy();
  }finally{await session?.close();await rm(dir,{recursive:true,force:true});}
 });
 it('distinguishes accepted discussion, delivered offer, accepted commitment, collection and completion across recovery',()=>{
  let world=agreed();expect(Object.keys(world.snapshot.tasks)).toHaveLength(0);
  expect(apply(world,'amina',{type:'propose-transport',recipient:'musa',quantity:4}).accepted).toBe(true);
  expect(world.observe('musa').tasks).toHaveLength(0);expect(world.observe('musa').communication!.threads[0]!.taskId).toBeNull();expect(apply(world,'musa',{type:'respond-transport',taskId:'task-1',accept:true}).accepted).toBe(false);
  world=Neighbourhood.restore(world.serialize());world.advance(5);expect(world.observe('musa').tasks[0]!.status).toBe('proposed');
  const before=world.snapshot.npcs.musa.inventory.coins!;expect(apply(world,'musa',{type:'respond-transport',taskId:'task-1',accept:true}).accepted).toBe(true);
  expect(world.snapshot.tasks['task-1']).toMatchObject({status:'accepted',escrow:2,reserved:4,rewardPaid:false});expect(world.observe('amina').tasks[0]!.status).toBe('proposed');conservation(world.snapshot);
  world=Neighbourhood.restore(world.serialize());world.advance(5);expect(world.observe('amina').tasks[0]!.status).toBe('accepted');
  expect(apply(world,'musa',{type:'fulfil-transport',taskId:'task-1'}).accepted).toBe(true);world.advance(10);
  expect(world.snapshot.tasks['task-1']).toMatchObject({status:'delivered',escrow:0,rewardPaid:true});expect(world.snapshot.npcs.musa.inventory.coins).toBe(before+2);conservation(world.snapshot);
  const saved=world.serialize();expect(apply(world,'musa',{type:'fulfil-transport',taskId:'task-1'}).accepted).toBe(false);expect(world.snapshot.npcs.musa.inventory.coins).toBe(before+2);
  expect(Neighbourhood.restore(saved).snapshot.tasks).toEqual(world.snapshot.tasks);
  apply(world,'musa',{type:'travel',destination:'stand'});world.advance(10);
  expect(apply(world,'amina',{type:'propose-transport',recipient:'musa',quantity:4}).reason).toBe('recipient-not-nearby');
 });
 it('allows a recipient to accept discussion but decline the subsequent task, without escrow or goods transfer',()=>{
  const world=agreed();apply(world,'amina',{type:'propose-transport',recipient:'musa',quantity:4});world.advance(5);const before=world.snapshot;
  expect(apply(world,'musa',{type:'respond-transport',taskId:'task-1',accept:false}).accepted).toBe(true);expect(world.snapshot.tasks['task-1']).toMatchObject({status:'declined',escrow:0});
  expect(world.snapshot.resources).toEqual(before.resources);expect(world.snapshot.npcs.musa.inventory).toEqual(before.npcs.musa.inventory);world.advance(5);expect(world.observe('amina').tasks[0]!.status).toBe('declined');
 });
 it('delays remote clarification and preserves its question during recovery without accepting a task',()=>{
  let world=agreed();apply(world,'amina',{type:'propose-transport',recipient:'musa',quantity:4});world.advance(5);
  apply(world,'musa',{type:'respond-transport',taskId:'task-1',accept:'clarify',question:'How many supplies are you expecting?'});
  expect(world.observe('amina').actor.memories.some(item=>item.detail==='How many supplies are you expecting?')).toBe(false);world=Neighbourhood.restore(world.serialize());world.advance(5);
  expect(world.observe('amina').actor.memories.some(item=>item.detail==='How many supplies are you expecting?')).toBe(true);expect(world.snapshot.tasks['task-1']!.status).toBe('proposed');expect(world.snapshot.tasks['task-1']!.escrow).toBe(0);
 });
 it('bases a reply on the recipient actual needs rather than the caller assumption',async()=>{
  const world=createTown('tired');apply(world,'amina',send('musa','call'));const data=world.snapshot;data.npcs.musa.needs.rest=.95;
  const restored=Neighbourhood.restore(JSON.stringify(data));const request=restored.requestInteractionDecision('musa')!;const result=await new NeighbourhoodMockProvider().decide(request);
  expect(restored.applyDecision(request.id,result.decision,{mode:'mock',model:'offline'}).accepted).toBe(true);expect(restored.snapshot.communication!.threads['communication-1']!.status).toBe('deferred');expect(Object.keys(restored.snapshot.tasks)).toHaveLength(0);
 });
 it.each(['text','call'] as const)('completes a fully autonomous remote %s discussion and paid delivery in the normal town',async channel=>{
  const runner=new HeadlessTownRunner(createTown(`normal-${channel}`),{trader:'cooperate',driver:'accept',remoteChannel:channel});await runner.advance(180);const state=runner.world.snapshot;conservation(state);
  const thread=Object.values(state.communication!.threads).find(item=>item.initiator==='amina' && item.recipient==='musa' && item.channel===channel && item.taskId!==null)!;expect(thread).toBeTruthy();expect(thread.response).toBe('accept');
  expect(state.tasks[thread.taskId!]!.status).toBe('delivered');expect(state.tasks[thread.taskId!]!.rewardPaid).toBe(true);
  expect(projectNeighbourhood(state).snapshot.communications!.some(item=>item.id===thread.id)).toBe(true);expect(state.tasks[thread.taskId!]!.communicationId).toBe(thread.id);
 },15000);
 it('fails closed on corrupt contact, thread, timestamp and remote task metadata',()=>{
  const world=agreed();apply(world,'amina',{type:'propose-transport',recipient:'musa',quantity:4});
  const mutations:((state:WorldState)=>void)[]=[s=>{s.npcs.amina.knowledge.contacts!.push('nobody');},s=>{s.communication!.threads['communication-1']!.recipient='chris';},s=>{s.communication!.threads['communication-1']!.availableAt=-1;},s=>{s.tasks['task-1']!.availableAt=0;},s=>{s.communication!.threads['communication-1']!.taskId='missing';},s=>{s.communication!.threads['communication-1']!.responseNotified=false;}];
  for(const mutate of mutations){const state=world.snapshot;mutate(state);expect(()=>Neighbourhood.restore(JSON.stringify(state))).toThrow();}
 });
});
