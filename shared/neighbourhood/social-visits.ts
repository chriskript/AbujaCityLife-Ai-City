import { buildingFor, mapFor } from '../world/town-layout.js';
import { pathToNode } from '../navigation/routes.js';
import { initialPlaceFacts } from './knowledge.js';
import { communicationRules, executeCommunication, validateCommunication, type CommunicationHost } from './communication.js';
import type { Action, NpcObservation, SocialInvitation, SocialUpdate, WorldState } from './types.js';

export const socialVisitCapabilities=['invite-social','respond-social','join-social','socialise','leave-social'] as const;
export const socialVisitRules={maximumInvitations:128,maximumActive:4,expirySeconds:600,maximumUpdates:8,privateAccess:false} as const;
const active=(s:SocialUpdate['status'])=>s==='pending'||s==='accepted';
const last=(i:SocialInvitation)=>i.updates.at(-1)!;
const other=(i:SocialInvitation,id:string)=>i.participants.find(p=>p!==id)!;
const visible=(i:SocialInvitation,id:string)=>i.updates.filter(u=>u.deliveredTo.includes(id)).at(-1);
const stationary=(state:WorldState,id:string)=>state.npcs[id]!.activity.kind!=='travel';
const available=(state:WorldState,id:string)=>{const a=state.npcs[id]!.activity;return a.kind==='idle'||a.kind==='wait'&&!a.resting;};

// Opt-in, versioned extension. No events, acquaintances or invitations are invented.
export function enableSocialVisits(state:WorldState):void {
  if(!state.town||!state.communication)throw new Error('Social visits require the existing town and communications');
  state.socialVisits ??={version:1,nextId:1,invitations:{}};
  for(const npc of Object.values(state.npcs))for(const action of socialVisitCapabilities)if(!npc.capabilities.includes(action))npc.capabilities.push(action);
  for(const npc of Object.values(state.npcs)){
    const entrance=npc.home?buildingFor(npc.home,state.mapId)?.entrance:undefined;
    if(entrance&&!npc.knowledge.places.includes(entrance)){npc.knowledge.places.push(entrance);Object.assign(npc.knowledge.placeFacts ??={},initialPlaceFacts([entrance]));}
  }
}
export function socialVenues(state:WorldState,id:string):NonNullable<NpcObservation['socialVisits']>['venues'] {
  const npc=state.npcs[id]!,map=mapFor(state.mapId),door=npc.home?buildingFor(npc.home,state.mapId)?.entrance:undefined;
  return map.places.filter(p=>npc.knowledge.places.includes(p.id)&&map.nodes.find(n=>n.id===p.node)?.kind!=='home').map(p=>({id:p.id,kind:p.id===door?'home-doorstep':map.nodes.find(n=>n.id===p.node)?.kind==='workplace'?'workplace':'public'}));
}
export function socialVisitObservation(state:WorldState,id:string):NpcObservation['socialVisits'] {
  if(!state.socialVisits)return undefined;
  const invitations=Object.values(state.socialVisits.invitations).filter(i=>i.participants.includes(id)).flatMap(i=>{
    const update=visible(i,id);if(!update)return[];
    const together=stationary(state,id)&&stationary(state,other(i,id))&&state.npcs[id]!.node===update.destination&&state.npcs[other(i,id)]!.node===update.destination&&i.present.includes(id)&&i.present.includes(other(i,id));
    // No remote attendance, destination changes, responses or private needs leak.
    return[{id:i.id,participants:i.participants,channel:i.channel,communicationId:i.communicationId,expiresAt:i.expiresAt,update:{...structuredClone(update),deliveredTo:[id]},joined:i.joined.includes(id),otherPresent:together,canConverse:together&&available(state,id)&&available(state,other(i,id))&&i.lastSpeaker!==id,metAt:together?i.metAt:null,lastSpeaker:i.lastSpeaker ?? null}];
  });
  const current=(i:typeof invitations[number])=>active(i.update.status)&&i.expiresAt>state.time;
  return {version:1,venues:socialVenues(state,id),invitations:invitations.filter(current).concat(invitations.filter(i=>!current(i)).slice(-3)),rules:socialVisitRules};
}
export function validateSocialVisit(state:WorldState,id:string,action:Action):string|null {
  if(!socialVisitCapabilities.includes(action.type as typeof socialVisitCapabilities[number])){
    if(action.type==='respond-communication'&&Object.values(state.socialVisits?.invitations ?? {}).some(i=>i.communicationId===action.communicationId))return 'use-structured-social-response';
    return null;
  }
  if(!state.socialVisits)return 'social-visits-unavailable';
  const npc=state.npcs[id]!;
  const reachable=(destination:string)=>socialVenues(state,id).some(v=>v.id===destination)&&Boolean(pathToNode(npc.node,destination,new Set(npc.knowledge.blockedEdges),mapFor(state.mapId)));
  if(action.type==='invite-social'){
    const target=state.npcs[action.recipient];
    if(!target||action.recipient===id||!npc.knowledge.people.includes(action.recipient))return 'unknown-social-recipient';
    if(!reachable(action.destination))return 'unknown-or-private-social-venue';
    const all=Object.values(state.socialVisits.invitations);
    if(all.length>=socialVisitRules.maximumInvitations)return 'social-invitation-capacity';
    if([id,action.recipient].some(person=>all.filter(i=>i.participants.includes(person)&&active(last(i).status)&&state.time<i.expiresAt).length>=socialVisitRules.maximumActive))return 'social-inbox-full';
    if(all.some(i=>i.participants.includes(id)&&i.participants.includes(action.recipient)&&active(last(i).status)&&state.time<i.expiresAt))return 'social-invitation-already-open';
    if(action.channel==='nearby')return stationary(state,action.recipient)&&target.node===npc.node?null:'social-recipient-not-nearby';
    return validateCommunication(state,id,{type:'communicate',recipient:action.recipient,channel:'text',purpose:'chat',message:action.message,memoryId:null});
  }
  if(!('invitationId' in action))return null;
  if(!Object.hasOwn(state.socialVisits.invitations,action.invitationId))return 'unknown-social-invitation';
  const i=state.socialVisits.invitations[action.invitationId];
  if(!i||!i.participants.includes(id))return 'unknown-social-invitation';
  const u=last(i),view=visible(i,id);
  if(action.type==='leave-social')return view&&active(view.status)&&state.time<i.expiresAt?null:'social-invitation-closed';
  if(!view||view.number!==u.number)return 'social-update-not-delivered';
  if(!active(u.status)||state.time>=i.expiresAt)return 'social-invitation-closed';
  if(action.type==='respond-social'){
    if(u.status!=='pending'||u.respondTo!==id)return 'not-social-responder';
    if(i.channel==='nearby'&&(!stationary(state,other(i,id))||state.npcs[other(i,id)]!.node!==npc.node))return 'social-recipient-not-nearby';
    if(i.updates.length>=socialVisitRules.maximumUpdates-1)return 'social-update-capacity';
    if(action.response==='alternative'&&!reachable(action.destination!))return 'unknown-or-private-social-venue';
  }else if(action.type==='join-social'){
    if(u.status!=='accepted')return 'social-consent-required';
    if(i.joined.includes(id))return 'social-visit-already-joined';
    if(Object.values(state.socialVisits.invitations).some(x=>x.id!==i.id&&active(last(x).status)&&x.joined.includes(id)))return 'existing-social-visit';
    if(!reachable(u.destination))return 'no-known-social-route';
  }else if(action.type==='socialise'){
    if(u.status!=='accepted'||npc.node!==u.destination||!i.present.includes(id)||!i.present.includes(other(i,id))||state.npcs[other(i,id)]!.node!==u.destination||!stationary(state,other(i,id)))return 'social-partner-not-present';
    if(!available(state,other(i,id)))return 'social-partner-busy';
    if(i.lastSpeaker===id)return 'social-turn-awaiting-partner';
  }
  return null;
}

function addUpdate(host:CommunicationHost,i:SocialInvitation,update:Omit<SocialUpdate,'number'|'createdAt'|'availableAt'|'deliveredTo'|'author'>&{author:string}){
  const delay=i.channel==='text'?communicationRules.textDelay:0;
  i.updates.push({...update,number:i.updates.length+1,createdAt:host.state.time,availableAt:host.state.time+delay,deliveredTo:[update.author]});
  host.record('social-choice',update.author,[update.author],i.id,update.message,{status:update.status,destination:update.destination},'reported',update.author,true);
  host.trigger(update.author,'social-choice');
}
export function executeSocialVisit(host:CommunicationHost,id:string,action:Action,travel:(destination:string)=>void):boolean {
  if(!socialVisitCapabilities.includes(action.type as typeof socialVisitCapabilities[number]))return false;
  const {state,record,trigger}=host,npc=state.npcs[id]!;
  if(action.type==='invite-social'){
    let communicationId:string|null=null;
    if(action.channel==='text'){
      communicationId=`communication-${state.communication!.nextId}`;
      executeCommunication(host,id,{type:'communicate',recipient:action.recipient,channel:'text',purpose:'chat',message:action.message,memoryId:null});
    }
    const i:SocialInvitation={id:`social-${state.socialVisits!.nextId++}`,participants:[id,action.recipient],channel:action.channel,communicationId,createdAt:state.time,expiresAt:state.time+socialVisitRules.expirySeconds,updates:[],joined:[],present:[],metAt:null,lastSpeaker:null};
    state.socialVisits!.invitations[i.id]=i;
    addUpdate(host,i,{author:id,proposalBy:id,respondTo:action.recipient,status:'pending',destination:action.destination,seconds:action.seconds,message:action.message});
  }else if('invitationId' in action){
    const i=state.socialVisits!.invitations[action.invitationId]!,u=last(i);
    if(action.type==='respond-social'){
      if(i.communicationId&&state.communication!.threads[i.communicationId]!.recipient===id&&state.communication!.threads[i.communicationId]!.status==='pending')executeCommunication(host,id,{type:'respond-communication',communicationId:i.communicationId,response:action.response==='alternative'?'clarify':action.response==='postpone'?'defer':action.response,message:action.message,memoryId:null});
      addUpdate(host,i,{author:id,proposalBy:action.response==='alternative'?id:u.proposalBy,respondTo:action.response==='alternative'?other(i,id):null,status:action.response==='alternative'?'pending':action.response==='accept'?'accepted':action.response==='decline'?'declined':'postponed',destination:action.destination ?? u.destination,seconds:u.seconds,message:action.message});
    }else if(action.type==='join-social'){
      i.joined.push(id);record('social-visit-started',id,[id],i.id,'Chose to travel to the agreed public rendezvous',{destination:u.destination},'commitment');
      if(npc.node!==u.destination)travel(u.destination);else trigger(id,'social-arrival');
    }else if(action.type==='socialise'){
      const recipient=other(i,id);
      i.lastSpeaker=id;
      record('social-conversation',id,i.participants,i.id,action.message,{recipient,seconds:action.seconds},'reported',id,true);
      for(const [a,b] of [[id,recipient],[recipient,id]]){
        const relationship=state.npcs[a!]!.relationships[b!] ??={successfulJobs:0};
        relationship.socialExchanges=(relationship.socialExchanges ?? 0)+1;relationship.lastSocialAt=state.time;
      }
      npc.activity={kind:'wait',until:state.time+action.seconds};trigger(recipient,'social-conversation');
    }else if(action.type==='leave-social'){
      i.joined=i.joined.filter(p=>p!==id);i.present=i.present.filter(p=>p!==id);
      const known=visible(i,id)!;
      // Withdrawal is valid even while the other person's response is in flight.
      if(active(u.status))addUpdate(host,i,{author:id,proposalBy:known.proposalBy,respondTo:null,status:'left',destination:known.destination,seconds:known.seconds,message:action.message});
      else record('social-withdrawal-chosen',id,[id],i.id,action.message,{},'reported',id,true);
    }
  }
  advanceSocialVisits(host);return true;
}

export function advanceSocialVisits(host:CommunicationHost):void {
  const {state,record,trigger}=host;
  for(const i of Object.values(state.socialVisits?.invitations ?? {})){
    const audible=i.channel==='text'||i.participants.every(id=>stationary(state,id))&&state.npcs[i.participants[0]]!.node===state.npcs[i.participants[1]]!.node;
    for(const u of i.updates)if(state.time>=u.availableAt&&audible&&(i.channel==='text'||state.time===u.createdAt))for(const id of i.participants)if(!u.deliveredTo.includes(id)){
      u.deliveredTo.push(id);const npc=state.npcs[id]!;
      if(!npc.knowledge.places.includes(u.destination)){npc.knowledge.places.push(u.destination);Object.assign(npc.knowledge.placeFacts ??={},initialPlaceFacts([u.destination]));}
      record('social-update-delivered',u.author,[id],i.id,u.message,{status:u.status,destination:u.destination},u.author===null?'outcome':'reported',u.author ?? 'world',u.author!==null);trigger(id,'social-update');
    }
    const u=last(i);
    if(active(u.status)&&(state.time>=i.expiresAt||i.metAt!==null&&state.time>=i.metAt+u.seconds)){
      i.joined=[];i.present=[];
      record(i.metAt===null?'social-expired':'social-time-completed',null,i.participants,i.id,i.metAt===null?'The invitation reached its bound':'The independently agreed social time reached its bound',{},'outcome');
      // A deterministic deadline is a system outcome, never a fabricated speech
      // turn or a resident choice. Both already know this rule and deadline.
      i.updates.push({number:i.updates.length+1,author:null,proposalBy:u.proposalBy,respondTo:null,status:'expired',destination:u.destination,seconds:u.seconds,message:'The bounded social time ended; each resident may independently choose what to do next.',createdAt:state.time,availableAt:state.time,deliveredTo:[...i.participants]});
      for(const id of i.participants)trigger(id,'social-expired');
    }else if(u.status==='accepted'){
      const present=i.joined.filter(id=>stationary(state,id)&&state.npcs[id]!.node===u.destination);
      for(const id of present)if(!i.present.includes(id)){record('social-arrival',id,[id],i.id,'Arrived at the social rendezvous; the other resident may be absent',{},'observed');trigger(id,'social-arrival');}
      i.present=present;
      if(present.length===2&&i.metAt===null){i.metAt=state.time;record('social-met',null,i.participants,i.id,'Both independently arrived at their agreed rendezvous',{},'outcome');for(const id of i.participants)trigger(id,'social-partner-arrived');}
    }else {i.present=[];if(!active(u.status))i.joined=[];}
  }
}
