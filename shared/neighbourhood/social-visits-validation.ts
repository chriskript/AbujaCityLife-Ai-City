import { mapFor } from '../world/town-layout.js';
import type { WorldState } from './types.js';
import { socialVisitCapabilities, socialVisitRules } from './social-visits.js';

export function assertSocialVisits(state:WorldState):void {
  if(state.socialVisits===undefined)return;
  const check=(v:unknown)=>{if(!v)throw new Error('Invalid social visit snapshot');};
  const object=(v:unknown)=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
  const finite=(v:number)=>Number.isFinite(v)&&v>=0;
  const visits=state.socialVisits,ids=Object.keys(state.npcs),map=mapFor(state.mapId);
  check(state.town&&state.communication&&object(visits)&&visits.version===1&&Number.isSafeInteger(visits.nextId)&&visits.nextId>=1&&object(visits.invitations));
  check(Object.keys(visits.invitations).length<=socialVisitRules.maximumInvitations);
  for(const npc of Object.values(state.npcs))check(socialVisitCapabilities.every(a=>npc.capabilities.includes(a)));
  for(const [key,i] of Object.entries(visits.invitations)){
    check(object(i)&&i.id===key&&/^social-\d+$/.test(key)&&Number(key.slice(7))<visits.nextId);
    check(Array.isArray(i.participants)&&i.participants.length===2&&new Set(i.participants).size===2&&i.participants.every(id=>ids.includes(id)));
    check(['text','nearby'].includes(i.channel)&&finite(i.createdAt)&&i.createdAt<=state.time&&i.expiresAt===i.createdAt+socialVisitRules.expirySeconds);
    check(i.channel==='nearby'?i.communicationId===null:typeof i.communicationId==='string'&&state.communication!.threads[i.communicationId]?.initiator===i.participants[0]&&state.communication!.threads[i.communicationId]?.recipient===i.participants[1]);
    check(Array.isArray(i.updates)&&i.updates.length>0&&i.updates.length<=socialVisitRules.maximumUpdates);
    for(const [n,u] of i.updates.entries()){
      check(object(u)&&u.number===n+1&&(u.author===null?u.status==='expired':i.participants.includes(u.author))&&i.participants.includes(u.proposalBy));
      check(['pending','accepted','declined','postponed','left','expired'].includes(u.status));
      check(u.status==='pending'?i.participants.includes(u.respondTo!)&&u.respondTo!==u.proposalBy:u.respondTo===null);
      check(map.places.some(p=>p.id===u.destination)&&map.nodes.find(p=>p.id===u.destination)?.kind!=='home');
      check(Number.isFinite(u.seconds)&&u.seconds>=30&&u.seconds<=180&&typeof u.message==='string'&&u.message.trim().length>0&&u.message.length<=160);
      check(finite(u.createdAt)&&u.createdAt>=i.createdAt&&u.createdAt<=state.time&&finite(u.availableAt)&&u.availableAt>=u.createdAt&&u.availableAt<=u.createdAt+5);
      check(Array.isArray(u.deliveredTo)&&new Set(u.deliveredTo).size===u.deliveredTo.length&&(u.author===null?u.deliveredTo.length===2:u.deliveredTo.includes(u.author))&&u.deliveredTo.every(id=>i.participants.includes(id)&&(id===u.author||state.time>=u.availableAt)));
    }
    for(const list of [i.joined,i.present])check(Array.isArray(list)&&new Set(list).size===list.length&&list.every(id=>i.participants.includes(id)));
    check(i.present.every(id=>i.joined.includes(id))&&(i.metAt===null||finite(i.metAt)&&i.metAt<=state.time));
    check(i.lastSpeaker===undefined||i.lastSpeaker===null||i.participants.includes(i.lastSpeaker));
    check(!i.lastSpeaker||i.metAt!==null);
    check(i.updates.at(-1)!.status==='accepted'||!i.joined.length&&!i.present.length);
  }
}
