import type { Action, NpcId, NpcObservation } from './types.js';
import { Neighbourhood } from './world.js';
import { communicationObservation } from './communication.js';
export const phoneActionTypes=['communicate','respond-communication','end-call','offer-contact','propose-transport','respond-transport'] as const;
export type PhoneAction=Extract<Action,{type:typeof phoneActionTypes[number]}>;
export interface PhoneControlStatus {actorId:string;expiresAt:number}
export interface PhoneLease extends PhoneControlStatus {leaseId:string;worldId:string}
export interface PhoneControlInput {worldId:string;actorId:string;operation:'acquire'|'renew'|'release';leaseId?:string}
export interface PhoneActionInput {id:string;worldId:string;actorId:string;leaseId:string;action:PhoneAction}
export interface PhoneView {
 worldId:string;owner:{id:string;name:string};time:number;paused:boolean;canAct:boolean;reason:string|null;
 communication:NonNullable<NpcObservation['communication']>;names:Record<string,string>;tasks:NpcObservation['tasks'];capabilities:string[];
 memories:{id:string;detail:string}[];nearby:{id:string;name:string}[];control:PhoneControlStatus|null;
}
export function projectPhone(world:Neighbourhood,id:NpcId,paused:boolean,control:PhoneControlStatus|null):PhoneView {
 if(!world.hasResident(id))throw new Error('Unknown resident');
 const observation=world.observe(id),state=world.snapshot,actor=observation.actor;
 if(!observation.communication)throw new Error('Phone unavailable in this fixture');
 return {worldId:world.id,owner:{id,name:actor.name},time:world.time,paused,canAct:!paused && observation.permittedActions.length>0,reason:paused?'The town is paused':observation.permittedActions.length?'':'Finish the current journey, work or rest first',communication:communicationObservation(state,id,128)!,names:Object.fromEntries(actor.knowledge.people.map(other=>[other,state.npcs[other]!.name])),tasks:observation.tasks,capabilities:actor.capabilities,memories:actor.memories.map(memory=>({id:memory.id,detail:memory.detail})),nearby:observation.nearbyPeople.filter(person=>person.known && !actor.knowledge.sharedContacts?.includes(person.id)).map(person=>({id:person.id,name:person.name!})),control};
}
// Ephemeral ownership. Tokens never enter checkpoints or public projections.
export class PhoneControl {
 private lease:PhoneLease|null=null;
 private epochs=new Map<string,number>();
 constructor(private readonly now:()=>number=Date.now){}
 status(worldId:string):PhoneControlStatus|null {const lease=this.lease;return lease && lease.worldId===worldId && lease.expiresAt>this.now()?{actorId:lease.actorId,expiresAt:lease.expiresAt}:null;}
 controlled(worldId:string,id:string):boolean{return this.status(worldId)?.actorId===id;}
 generation(id:string):number{return this.epochs.get(id) ?? 0;}
 owns(worldId:string,actorId:string,leaseId:string):boolean{return this.controlled(worldId,actorId) && this.lease?.leaseId===leaseId;}
 change(world:Neighbourhood,input:PhoneControlInput):PhoneLease|null {
  if(!['acquire','renew','release'].includes(input.operation))throw new Error('Invalid phone control operation');
  if(input.worldId!==world.id || !world.hasResident(input.actorId))throw new Error('World or resident changed');
  if(!world.observe(input.actorId).communication)throw new Error('Phone unavailable in this fixture');
  if(input.operation==='acquire') {
   if(this.status(world.id))throw new Error('A resident phone is already controlled');
   world.invalidateActorDecisions(input.actorId);this.epochs.set(input.actorId,this.generation(input.actorId)+1);
   this.lease={worldId:world.id,actorId:input.actorId,leaseId:crypto.randomUUID(),expiresAt:this.now()+60000};return {...this.lease};
  }
  if(!input.leaseId || !this.owns(world.id,input.actorId,input.leaseId))throw new Error('Phone control expired or belongs to another observer');
  if(input.operation==='renew'){this.lease!.expiresAt=this.now()+60000;return {...this.lease!};}
  world.invalidateActorDecisions(input.actorId);this.epochs.set(input.actorId,this.generation(input.actorId)+1);this.lease=null;return null;
 }
}
