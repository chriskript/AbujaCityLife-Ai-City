import {createReadStream} from 'node:fs';
import {readFile,writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {prepareModelInput} from '../server/inference/model-context.js';
import {Neighbourhood} from '../shared/neighbourhood/world.js';
import type {NpcDecisionRequest} from '../shared/neighbourhood/types.js';

// Offline replay of recorded information, never a replay of consequential requests.
const run='7g-d-economy-20261102T143947Z',path=`output/society-7g/${run}/evidence.ndjson`;
const before=createHash('sha256').update(await readFile(path)).digest('hex');
const decisions=JSON.parse(await readFile('docs/7g-economic-live-decisions.json','utf8')).decisions;
const rows=[];const fixtures=[];
for await(const line of createInterface({input:createReadStream(path),crlfDelay:Infinity})){
  const s=JSON.parse(line);if(s.stage!=='model-started')continue;
  const r=s.request as NpcDecisionRequest,o=s.modelInput.observation,d=decisions.find((d:{number:number})=>d.number===s.number),prepared=prepareModelInput(r,'decision');
  const w=Neighbourhood.restore(s.checkpointBefore.world),venues=r.observation.socialVisits?.venues ?? [];
  const nearby=r.observation.nearbyPeople.filter(p=>p.known).map(p=>p.id),contact=r.observation.communication?.canContact ?? [];
  const target=contact[0] ?? nearby[0];let validInvitation=false;
  if(target&&venues.length){const q=w.requestInteractionDecision(r.actorId);if(q)validInvitation=w.applyDecision(q.id,{goalId:q.observation.actor.goals[0]!.id,reason:'Isolated offline affordance audit, never dispatched',action:{type:'invite-social',recipient:target,destination:venues[0]!.id,channel:contact.includes(target)?'text':'nearby',seconds:60,message:'Would you like to meet here?'}},{mode:'mock',model:'offline-affordance-audit'}).accepted;}
  rows.push({number:s.number,actor:r.actorId,returned:d?.decision!==null,action:d?.decision?.action.type ?? null,needs:o.actor.needs,heldFood:o.actor.inventory.food,coins:o.actor.inventory.coins,restPlaces:r.observation.places.filter(p=>p.id===r.observation.actor.home||r.observation.placeKnowledge.find(k=>k.placeId===p.id)?.facts?.services.includes('scenic-view')).map(p=>p.id),eligibleJobs:o.town?.eligibleWorkIds ?? [],oldNeedScaleExplained:/0 = satisfied|maximum unmet/.test(s.systemInstructions),oldInventory:o.actor.inventory,failureMemories:o.memories.filter((m:{detail:string})=>m.detail.startsWith('Attempt failed:')).map((m:{id:string;detail:string})=>({id:m.id,detail:m.detail})),social:{inviteInSchema:s.decisionSchema.properties.action.anyOf.some((b:{properties:{type:{enum:string[]}}})=>b.properties.type.enum[0]==='invite-social'),venues:venues.length,textCandidates:contact,nearbyKnown:nearby,introductions:r.observation.encounterOpportunities.filter(id=>!r.observation.actor.knowledge.people.includes(id)),numberSharingCandidates:prepared.input.observation.decisionContext.social?.shareOwnNumberWith ?? [],hypotheticalInvitationValidated:validInvitation},characters:{before:JSON.stringify(s.modelInput).length,after:JSON.stringify(prepared.input).length,instructionsBefore:s.systemInstructions.length,instructionsAfter:prepared.instructions.length},newGrounding:prepared.input.observation.decisionContext});
  if([72,92,119,140,161].includes(s.number))fixtures.push({number:s.number,request:r,decision:d.decision});
}
const completed=rows.filter(r=>r.returned),work=completed.filter(r=>r.action==='take-work');
const summary={sourceRun:run,networkCalls:0,evidenceSha256:before,completed:completed.length,workChoices:work.length,workWithHighHunger:work.filter(r=>r.needs.food>=.9).length,workWithHighFatigue:work.filter(r=>(r.needs.rest ?? 0)>=.9).length,workWithBothHigh:work.filter(r=>r.needs.food>=.9&&(r.needs.rest ?? 0)>=.9).length,contextsWithInviteSchema:completed.filter(r=>r.social.inviteInSchema).length,contextsWithValidInvitation:completed.filter(r=>r.social.hypotheticalInvitationValidated).length,contextsWithNumberSharing:completed.filter(r=>r.social.numberSharingCandidates.length).length,contextsWithIntroductions:completed.filter(r=>r.social.introductions.length).length,maximumProjectedCharacters:Math.max(...rows.map(r=>r.characters.after)),allWithinExistingHardCap:rows.every(r=>r.characters.after<=24000),exactNewTokenCounts:'unverified: no provider token-count calls',rows};
if(createHash('sha256').update(await readFile(path)).digest('hex')!==before)throw new Error('Original evidence changed');
await writeFile('docs/decision-grounding-offline-comparison.json',JSON.stringify(summary,null,2)+'\n');
await writeFile('tests/fixtures/economic-grounding-contexts.json',JSON.stringify({sourceRun:run,cases:fixtures},null,2)+'\n');
console.log(JSON.stringify({...summary,rows:undefined},null,2));
