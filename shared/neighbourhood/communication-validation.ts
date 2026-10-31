import type { WorldState } from './types.js';
import { communicationRules, communicationCapabilities } from './communication.js';

export function assertCommunication(state:WorldState):void {
 const comm=state.communication;if(comm===undefined)return;
 const check=(value:unknown)=>{if(!value)throw new Error('Invalid communication snapshot');};
 const object=(value:unknown)=>!!value && typeof value==='object' && !Array.isArray(value);
 const text=(value:unknown)=>typeof value==='string' && value.trim().length>0 && value.length<=160;
 const time=(value:unknown)=>typeof value==='number' && Number.isFinite(value) && value>=0;
 check(object(comm) && Number.isSafeInteger(comm.nextId) && comm.nextId>0 && object(comm.threads) && object(comm.cooldowns));
 const ids=Object.keys(state.npcs);
 for(const npc of Object.values(state.npcs)) {
  check(Array.isArray(npc.knowledge.contacts) && new Set(npc.knowledge.contacts).size===npc.knowledge.contacts!.length && npc.knowledge.contacts!.every(id=>id!==npc.id && npc.knowledge.people.includes(id)));
  check(Array.isArray(npc.knowledge.sharedContacts) && new Set(npc.knowledge.sharedContacts).size===npc.knowledge.sharedContacts!.length && npc.knowledge.sharedContacts!.every(id=>npc.knowledge.people.includes(id) && state.npcs[id]?.knowledge.contacts?.includes(npc.id)));
  check(communicationCapabilities.every(type=>npc.capabilities.includes(type)));
 }
 check(Object.keys(comm.threads).length<=communicationRules.maximumThreads);
 const openCalls=new Set<string>();
 for(const [key,item]of Object.entries(comm.threads)) {
  check(object(item) && key===item.id && /^communication-\d+$/.test(key) && Number(key.slice(14))<comm.nextId);
  check(ids.includes(item.initiator) && ids.includes(item.recipient) && item.initiator!==item.recipient && state.npcs[item.initiator]!.knowledge.contacts!.includes(item.recipient));
  check(['call','text'].includes(item.channel) && ['chat','request-help'].includes(item.purpose) && text(item.message));
  check(item.purpose!=='request-help' || state.npcs[item.initiator]!.capabilities.includes('propose-transport'));
  check(time(item.createdAt) && item.createdAt<=state.time && item.availableAt===item.createdAt+(item.channel==='text'?communicationRules.textDelay:0) && item.expiresAt===item.createdAt+(item.channel==='text'?communicationRules.textLifetime:communicationRules.callLifetime));
  check(typeof item.delivered==='boolean' && (item.delivered ? item.availableAt<=state.time : item.availableAt>state.time));
  check(['queued','pending','connected','accepted','declined','deferred','clarified','ignored','missed','expired','ended'].includes(item.status));
  check(item.response===null || ['accept','decline','defer','clarify','ignore'].includes(item.response));
  check(typeof item.responseNotified==='boolean');
  check(item.taskId===null || typeof item.taskId==='string' && state.tasks[item.taskId]?.communicationId===item.id);
  check(item.response===null ? item.reply===null && item.replyReport===null && item.responseAt===null && !item.responseNotified : text(item.reply) && time(item.responseAt) && item.responseAt!>=item.availableAt && item.responseAt!<=state.time+(item.channel==='text'?communicationRules.textDelay:0));
  for(const report of [item.report,item.replyReport])check(report===null || object(report) && typeof report.subject==='string' && report.subject.length>0 && report.subject.length<=500 && typeof report.detail==='string' && report.detail.length>0 && report.detail.length<=1000);
  if(item.responseNotified)check(item.response!==null && item.response!=='ignore' && item.responseAt!<=state.time);
  if(item.response!==null)check(item.delivered && item.responseAt!-(item.channel==='text'?communicationRules.textDelay:0)>=item.availableAt);
  if(item.response!==null && item.response!=='ignore' && !item.responseNotified)check(item.responseAt!>state.time);
  if(['queued','pending'].includes(item.status))check(item.response===null && state.time<item.expiresAt);
  if(item.status==='queued')check(item.channel==='text' && !item.delivered);
  if(item.status==='pending')check(item.delivered);
  if(['connected','accepted'].includes(item.status))check(item.response==='accept' && (item.status==='connected'?item.channel==='call':item.channel==='text'));
  for(const [status,response]of [['declined','decline'],['deferred','defer'],['clarified','clarify'],['ignored','ignore']])if(item.status===status)check(item.response===response);
  if(['pending','connected','ignored'].includes(item.status))check(state.time<item.expiresAt);
  if(item.status==='missed')check(item.channel==='call' && state.time>=item.expiresAt && (item.response===null || item.response==='ignore'));
  if(item.status==='expired')check(item.channel==='text' && state.time>=item.expiresAt && (item.response===null || item.response==='ignore'));
  if(item.status==='ended')check(item.channel==='call' && item.response==='accept');
  if(item.channel==='call' && ['pending','connected'].includes(item.status))for(const id of [item.initiator,item.recipient]){check(!openCalls.has(id));openCalls.add(id);}
 }
 check(Object.keys(comm.cooldowns).length<=ids.length*ids.length);
 for(const id of ids)check(Object.values(comm.threads).filter(item=>['queued','pending','connected','ignored'].includes(item.status) && [item.initiator,item.recipient].includes(id)).length<=communicationRules.maximumPending);
 for(const[key,value]of Object.entries(comm.cooldowns)){const parts=key.split(':');check(parts.length===2 && parts[0]!<parts[1]! && parts.every(id=>ids.includes(id)) && time(value));}
 for(const task of Object.values(state.tasks))if(task.communicationId!==undefined) {
  const item=comm.threads[task.communicationId];
  check(item && item.initiator===task.requester && item.recipient===task.recipient && item.purpose==='request-help' && item.response==='accept');
  check(task.availableAt===task.expiresAt-90+communicationRules.textDelay);
  if(task.clarification!==undefined)check(object(task.clarification) && text(task.clarification.message) && time(task.clarification.availableAt) && task.clarification.availableAt<=state.time+communicationRules.textDelay && typeof task.clarification.notified==='boolean' && (!task.clarification.notified || task.clarification.availableAt<=state.time));
  check(task.responseAt===undefined ? task.responseNotified===undefined && ['proposed','expired'].includes(task.status) : time(task.responseAt) && task.responseAt!>=task.availableAt! && task.responseAt!<=state.time+communicationRules.textDelay && typeof task.responseNotified==='boolean' && ['accepted','collected','delivered','declined'].includes(task.status));
  if(task.responseAt!==undefined)check(task.responseAt>=task.availableAt!+communicationRules.textDelay && (task.responseNotified?task.responseAt<=state.time:task.responseAt>state.time));
 }
 for(const task of Object.values(state.tasks))if(task.communicationId===undefined)check(task.availableAt===undefined && task.responseAt===undefined && task.responseNotified===undefined && task.clarification===undefined);
}
