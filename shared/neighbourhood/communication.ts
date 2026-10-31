import type { Action, Communication, MemoryKind, NpcObservation, WorldEvent, WorldState } from './types.js';

export const communicationRules = { textDelay: 5, callLifetime: 60, textLifetime: 300, cooldown: 180, maximumThreads: 128, maximumPending:4 } as const;
export const communicationCapabilities = ['offer-contact','communicate','respond-communication','end-call'] as const;
type RecordEvent = (type:string,actor:string|null,audience:string[],subject:string,detail:string,data?:WorldEvent['data'],kind?:MemoryKind,source?:string,uncertain?:boolean)=>WorldEvent;
export interface CommunicationHost { state:WorldState; record:RecordEvent; trigger:(id:string,reason:string)=>void }
const pair=(a:string,b:string)=>[a,b].sort().join(':');
const liveCall=(item:Communication)=>item.channel==='call' && ['pending','connected'].includes(item.status);

// Authored prior contact exchange, deliberately separate from knowing someone's identity.
const initialContacts:Record<string,string[]>= {amina:['musa','zainab'],musa:['amina'],zainab:['amina'],chris:['musa'],fatima:['halima'],halima:['fatima','ibrahim'],ibrahim:['halima'],tunde:['musa'],ngozi:['amina'],yusuf:['grace'],grace:['yusuf'],emeka:['tunde'],ladi:['amina'],sadiq:['tunde'],maryam:['halima'],bisi:['ngozi']};
export function enableCommunication(state:WorldState):boolean {
 let changed=false;
 if(!state.communication){state.communication={nextId:1,threads:{},cooldowns:{}};changed=true;}
 for(const npc of Object.values(state.npcs)) {
  if(npc.knowledge.contacts===undefined){npc.knowledge.contacts=(initialContacts[npc.id] ?? []).filter(id=>npc.knowledge.people.includes(id));changed=true;}
  for(const type of communicationCapabilities)if(!npc.capabilities.includes(type)){npc.capabilities.push(type);changed=true;}
 }
 for(const npc of Object.values(state.npcs))if(npc.knowledge.sharedContacts===undefined){npc.knowledge.sharedContacts=npc.knowledge.people.filter(id=>state.npcs[id]!.knowledge.contacts?.includes(npc.id));changed=true;}
 return changed;
}
export function remoteExchange(state:WorldState,a:string,b:string):Communication|undefined {
 return Object.values(state.communication?.threads ?? {}).find(item=>item.initiator===a && item.recipient===b && item.purpose==='request-help' && item.taskId===null && item.response==='accept' && item.responseNotified && ['accepted','connected'].includes(item.status) && state.time<item.expiresAt);
}
export function communicationObservation(state:WorldState,id:string):NpcObservation['communication'] {
 if(!state.communication)return undefined;const npc=state.npcs[id]!;
 const relevant=Object.values(state.communication.threads).filter(item=>item.initiator===id || item.recipient===id && item.delivered);
 // Keep current exchanges even if older than recent completed conversations.
 const views=relevant.map(item=>{
  const view=structuredClone(item);
  // Neither a read/ignore choice nor an in-flight reply is a sender-visible receipt.
  if(item.initiator===id && !item.responseNotified) {
   if(!['expired','missed'].includes(item.status))view.status=item.delivered?'pending':'queued';
   view.response=null;view.reply=null;view.replyReport=null;view.responseAt=null;
  }
  if(item.recipient===id && item.taskId && state.time<state.tasks[item.taskId]!.availableAt!)view.taskId=null;
  return view;
 });
 const threads=views.filter(item=>['queued','pending','connected','ignored'].includes(item.status)).concat(views.filter(item=>!['queued','pending','connected','ignored'].includes(item.status)).slice(-6));
 const contacts=(npc.knowledge.contacts ?? []).map(other=>({id:other,name:state.npcs[other]!.name,canTransport:npc.knowledge.transporters?.includes(other) ?? false}));
 const canContact=contacts.filter(other=>validateCommunication(state,id,{type:'communicate',recipient:other.id,channel:'text',purpose:'chat',message:'Check availability',memoryId:null})===null).map(other=>other.id);
 const canCall=contacts.filter(other=>validateCommunication(state,id,{type:'communicate',recipient:other.id,channel:'call',purpose:'chat',message:'Check availability',memoryId:null})===null).map(other=>other.id);
 const contactOffers=npc.knowledge.sharedContacts ?? [];
 return {contacts,threads,canContact,canCall,contactOffers,rules:communicationRules};
}
export function validateCommunication(state:WorldState,id:string,action:Action):string|null {
 const comm=state.communication,npc=state.npcs[id]!;
 if(!communicationCapabilities.includes(action.type as typeof communicationCapabilities[number]))return null;
 if(!comm)return 'communication-unavailable';
 if('memoryId' in action && action.memoryId!==null && !npc.memories.some(memory=>memory.id===action.memoryId))return 'unknown-memory';
 if(action.type==='offer-contact') {
  const other=state.npcs[action.recipient];
  if(!other || id===action.recipient || !npc.knowledge.people.includes(other.id) || npc.node!==other.node || other.activity.kind==='travel')return 'contact-recipient-not-nearby';
  if(other.knowledge.contacts?.includes(id))return 'contact-already-shared';
 }
 if(action.type==='communicate') {
  if(id===action.recipient || !npc.knowledge.contacts?.includes(action.recipient))return 'missing-contact';
  if(Object.keys(comm.threads).length>=communicationRules.maximumThreads)return 'communication-capacity';
  if([id,action.recipient].some(person=>Object.values(comm.threads).filter(item=>['queued','pending','connected','ignored'].includes(item.status) && [item.initiator,item.recipient].includes(person)).length>=communicationRules.maximumPending))return 'communication-inbox-full';
  if((comm.cooldowns[pair(id,action.recipient)] ?? 0)>state.time)return 'communication-cooldown';
  if(action.purpose==='request-help' && !npc.capabilities.includes('propose-transport'))return 'missing-assistance-capability';
  if(Object.values(comm.threads).some(item=>['queued','pending','connected','ignored'].includes(item.status) && [item.initiator,item.recipient].includes(id) && [item.initiator,item.recipient].includes(action.recipient)))return 'conversation-already-open';
  if(action.channel==='call' && Object.values(comm.threads).some(item=>liveCall(item) && [item.initiator,item.recipient].some(person=>person===id || person===action.recipient)))return 'phone-busy';
 }
 if(action.type==='respond-communication') {
  const item=comm.threads[action.communicationId];
  if(!item || item.recipient!==id)return 'wrong-communication-recipient';
  if(!item.delivered || item.status!=='pending' || state.time>=item.expiresAt)return 'communication-not-open';
 }
 if(action.type==='end-call') {
  const item=comm.threads[action.communicationId];
  if(!item || ![item.initiator,item.recipient].includes(id) || item.channel!=='call' || item.status!=='connected')return 'call-not-connected';
 }
 return null;
}
export function executeCommunication(host:CommunicationHost,id:string,action:Action):boolean {
 const {state,record,trigger}=host,comm=state.communication!;
 if(action.type==='offer-contact') {
  state.npcs[action.recipient]!.knowledge.contacts!.push(id);
  state.npcs[id]!.knowledge.sharedContacts!.push(action.recipient);
  record('contact-offered',id,[id,action.recipient],id,'Shared my own phone contact; no reciprocal contact assumed',{recipient:action.recipient},'reported',id,true);
  trigger(action.recipient,'contact-received');return true;
 }
 const report=(memoryId:string|null)=>{const memory=state.npcs[id]!.memories.find(item=>item.id===memoryId);return memory?{subject:memory.subject,detail:memory.detail}:null;};
 if(action.type==='communicate') {
  const item:Communication={id:`communication-${comm.nextId++}`,initiator:id,recipient:action.recipient,channel:action.channel,purpose:action.purpose,message:action.message,report:report(action.memoryId),response:null,reply:null,replyReport:null,status:action.channel==='text'?'queued':'pending',createdAt:state.time,availableAt:state.time+(action.channel==='text'?communicationRules.textDelay:0),expiresAt:state.time+(action.channel==='text'?communicationRules.textLifetime:communicationRules.callLifetime),delivered:false,responseAt:null,responseNotified:false,taskId:null};
  comm.threads[item.id]=item;comm.cooldowns[pair(id,action.recipient)]=state.time+communicationRules.cooldown;
  record('communication-sent',id,[id],item.id,action.message,{recipient:action.recipient,channel:action.channel,purpose:action.purpose},'observed');
  trigger(id,'communication-sent');advanceCommunications(host);return true;
 }
 if(action.type==='respond-communication') {
  const item=comm.threads[action.communicationId]!;item.response=action.response;item.reply=action.message;item.replyReport=report(action.memoryId);
  item.status=({accept:item.channel==='call'?'connected':'accepted',decline:'declined',defer:'deferred',clarify:'clarified',ignore:'ignored'} as const)[action.response];
  item.responseAt=state.time+(item.channel==='text'?communicationRules.textDelay:0);
  record('communication-response-chosen',id,[id],item.id,action.message,{response:action.response,channel:item.channel},'observed');
  trigger(id,'communication-handled');advanceCommunications(host);return true;
 }
 if(action.type==='end-call') {
  const item=comm.threads[action.communicationId]!;item.status='ended';
  record('call-ended',id,[item.initiator,item.recipient],item.id,'Ended the phone conversation',{},'outcome');
  trigger(item.initiator,'communication-ended');trigger(item.recipient,'communication-ended');return true;
 }
 return false;
}
export function advanceCommunications({state,record,trigger}:CommunicationHost):void {
 for(const item of Object.values(state.communication?.threads ?? {})) {
  if(!item.delivered && state.time>=item.availableAt) {
   item.delivered=true;item.status='pending';
   record(item.channel==='text'?'text-delivered':'phone-ringing',item.initiator,[item.recipient],item.id,item.message,{channel:item.channel,purpose:item.purpose},'reported',item.initiator,true);
   if(item.report)record('communication-report',item.initiator,[item.recipient],item.report.subject,item.report.detail,{},'reported',item.initiator,true);
   trigger(item.recipient,'communication-received');
  }
  if(item.response!==null && item.response!=='ignore' && !item.responseNotified && state.time>=item.responseAt!) {
   item.responseNotified=true;
   record('communication-replied',item.recipient,[item.initiator],item.id,item.reply!,{response:item.response,channel:item.channel},'reported',item.recipient,true);
   if(item.replyReport)record('communication-report',item.recipient,[item.initiator],item.replyReport.subject,item.replyReport.detail,{},'reported',item.recipient,true);
   trigger(item.initiator,'communication-reply');
  }
  if(state.time>=item.expiresAt && ['queued','pending','connected','ignored'].includes(item.status)) {
   item.status=item.channel==='call'?(item.status==='connected'?'ended':'missed'):'expired';
   record('communication-closed',null,[item.initiator,item.recipient],item.id,item.status==='ended'?'Call duration reached its bound':item.channel==='call'?'Call was not answered':'Message received no reply before expiry',{status:item.status},'outcome');
   trigger(item.initiator,'communication-ended');trigger(item.recipient,'communication-ended');
  }
 }
 // Remote proposals and responses remain distinct from their delivery notifications.
 for(const task of Object.values(state.tasks))if(task.communicationId) {
  if(task.clarification && !task.clarification.notified && state.time>=task.clarification.availableAt){
   task.clarification.notified=true;record('remote-task-clarification',task.recipient,[task.requester],task.id,task.clarification.message,{},'reported',task.recipient,true);trigger(task.requester,'clarification-requested');
  }
  if(state.time>=task.availableAt! && state.npcs[task.recipient]!.knowledge.tasks[task.id]===undefined) {
   state.npcs[task.recipient]!.knowledge.tasks[task.id]=task.status;
   record('remote-task-received',task.requester,[task.recipient],task.id,'Received a transport offer through the established conversation',{quantity:task.quantity},'reported',task.requester,true);trigger(task.recipient,'transport-request');
  }
  if(task.responseAt!==undefined && !task.responseNotified && state.time>=task.responseAt) {
   task.responseNotified=true;
   if(state.npcs[task.requester]!.knowledge.tasks[task.id]!=='delivered')state.npcs[task.requester]!.knowledge.tasks[task.id]=task.status==='declined'?'declined':'accepted';
   record('remote-task-response',task.recipient,[task.requester],task.id,task.status==='declined'?'Declined the remote transport offer':'Accepted the remote transport commitment',{},'reported',task.recipient,true);trigger(task.requester,'offer-resolved');
  }
 }
}
