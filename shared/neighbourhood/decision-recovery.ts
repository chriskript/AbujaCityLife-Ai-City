import { carriedGoods } from './personal-rules.js';
import type { Action, WorldState } from './types.js';
import type { CommunicationHost } from './communication.js';

// Fail closed for every reason not explicitly classified as an ordinary world outcome.
const ordinary=new Set(['not-at-workplace','not-at-rest-place','not-at-supplier','not-at-market','not-at-order-desk','missing-skill','stale-actor','actor-busy','communication-inbox-full','communication-cooldown','conversation-already-open','phone-busy','communication-not-open','call-not-connected','social-inbox-full','social-invitation-already-open','social-invitation-closed','social-recipient-not-nearby','social-visit-already-joined','existing-social-visit','no-known-social-route','social-partner-not-present','social-partner-busy','social-turn-awaiting-partner','insufficient-stock','insufficient-funds','insufficient-payer-funds','insufficient-supplies','work-unavailable','offer-not-open','task-not-active','encounter-not-open','encounter-unavailable','initiator-not-nearby','initiator-busy','trader-not-nearby','sales-paused','existing-commitment','missing-personal-food','missing-goods','missing-stall-supplies','carrying-capacity','no-known-route','order-pending','wholesale-cooldown','external-source-exhausted','storage-capacity','input-storage-capacity']);
// This guard concerns only the initiator's own transport capability. It is
// checked before effects; recovery reveals no recipient/private information.
ordinary.add('missing-assistance-capability');
for (const reason of ['inactive-goal','unknown-goal-record','duplicate-goal','goal-capacity','seed-goal-immutable','empty-revision','terminal-goal','goal-not-active','redundant-transition','invalid-goal-transition','last-active-goal','duplicate-intention','intention-capacity','intention-not-pending','unknown-intention']) ordinary.add(reason);
export const ordinaryRejection=(reason:string):boolean=>ordinary.has(reason);
export function recordRejection(host:CommunicationHost,id:string,requestId:string,reason:string,action:Action):void {
  const {state,record,trigger}=host;
  const fingerprint=JSON.stringify(Object.fromEntries(Object.entries(action).sort(([a],[b])=>a.localeCompare(b)))),old=state.decisionRecovery?.[id];
  const repetitions=old?.action===fingerprint&&old.reason===reason&&state.time-old.at<=120?old.repetitions+1:1;
  const blockedUntil=repetitions>=3?state.time+120:state.time;
  state.decisionRecovery ??={};
  state.decisionRecovery[id]={version:1,action:fingerprint,reason,requestId,at:state.time,repetitions:Math.min(3,repetitions),blockedUntil};
  const npc=state.npcs[id]!,cargo=Object.values(state.tasks).filter(t=>t.recipient===id&&t.status==='collected').reduce((s,t)=>s+t.quantity,0),goods=carriedGoods(npc.inventory.goods,npc.inventory.food ?? 0,cargo);
  const explanation=reason==='missing-stall-supplies'?` Total goods ${goods.total} includes personal food ${goods.personalFood} and committed cargo ${goods.committedCargo}; only ${goods.restockable} can stock the stall. These categories cannot be substituted.`:reason==='missing-assistance-capability'?' request-help is restricted to transport assistance and requires your own propose-transport capability. General face-to-face questions use ask; remote general discussion uses chat. These are optional alternatives, not an executed correction.':'';
  record('action-rejected',id,[id],requestId,`Attempt failed: ${reason}. No transaction or commitment was applied.${explanation}`,{reason,action:action.type,blockedUntil},'outcome');
  if(repetitions>=3)record('repeated-rejection-paused',id,[id],requestId,'Three identical failures within 120 seconds; this resident has a 120-second inference cooldown. Other residents and deterministic mechanics continue.',{blockedUntil},'outcome');
  trigger(id,'action-rejected');
}
export function assertDecisionRecovery(state:WorldState):void {
  if(state.decisionRecovery===undefined)return;
  const fail=()=>{throw new Error('Invalid neighbourhood snapshot: decision recovery');};
  if(!state.decisionRecovery||typeof state.decisionRecovery!=='object'||Array.isArray(state.decisionRecovery)||Object.keys(state.decisionRecovery).length>Object.keys(state.npcs).length)fail();
  for(const [id,r] of Object.entries(state.decisionRecovery)) {
    if(!Object.hasOwn(state.npcs,id)||!r||r.version!==1||typeof r.action!=='string'||r.action.length>1000||!ordinaryRejection(r.reason)||typeof r.requestId!=='string'||r.requestId.length>160||!Number.isFinite(r.at)||r.at<0||r.at>state.time||!Number.isInteger(r.repetitions)||r.repetitions<1||r.repetitions>3||!Number.isFinite(r.blockedUntil)||r.blockedUntil!==r.at+(r.repetitions===3?120:0))fail();
  }
}
