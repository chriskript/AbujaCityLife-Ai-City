import type { NpcDecision, NpcDecisionRequest, NpcObservation } from '../../shared/neighbourhood/types.js';
import type { ConversationContext } from '../../shared/neighbourhood/conversation.js';
import { contextPolicy, scopedInstructions } from './context-policy.js';
import { employmentDecisionSchema } from './employment-grounding.js';

const activeTasks=new Set(['proposed','accepted','collected']);
const activeThreads=new Set(['queued','pending','connected','ignored']);
const latest=<T>(items:T[],count:number)=>items.slice(-count);
export interface ContextAudit {
  version:1; originalCharacters:number; projectedCharacters:number; targetExceeded:boolean;
  memories:{included:string[];mandatory:string[];omitted:string[]};
  threads:{included:string[];mandatory:string[];omitted:string[]};
  tasks:{included:string[];mandatory:string[];omitted:string[]};
  encounters:{included:string[];mandatory:string[];omitted:string[]};
  historyFacts:{included:string[];omitted:string[]};
}
export class ContextCapacityError extends Error { constructor(){super('Required scoped context exceeds the model-input character budget; no critical evidence was discarded');} }

// This operates exclusively on an already-authorised observation. It never reads
// WorldState, biographies, registries or another resident's private records.
export function selectModelObservation(source:NpcObservation, topic='', triggers:string[]=[]){
  const o=structuredClone(source),id=o.actor.id;
  const terminalRecent=new Set(latest(o.tasks,contextPolicy.recentTasks).map(t=>t.id));
  const requiredTaskIds=new Set(o.tasks.filter(t=>activeTasks.has(t.status) || t.expiresAt>=o.time-120).map(t=>t.id));
  o.tasks=o.tasks.filter(t=>requiredTaskIds.has(t.id)||terminalRecent.has(t.id));
  const mandatoryThreadIds=new Set((o.communication?.threads ?? []).filter(t=>activeThreads.has(t.status) || t.purpose==='request-help' && t.response==='accept' && t.taskId===null && t.expiresAt>o.time || t.taskId && requiredTaskIds.has(t.taskId)).map(t=>t.id));
  const recentThreads=new Set(latest(o.communication?.threads ?? [],contextPolicy.recentThreads).map(t=>t.id));
  if(o.communication)o.communication.threads=o.communication.threads.filter(t=>mandatoryThreadIds.has(t.id)||recentThreads.has(t.id));
  const mandatoryEncounterIds=new Set(o.encounters.filter(e=>e.status==='pending').map(e=>e.id));
  const recentEncounters=new Set(latest(o.encounters,contextPolicy.recentEncounters).map(e=>e.id));
  o.encounters=o.encounters.filter(e=>mandatoryEncounterIds.has(e.id)||recentEncounters.has(e.id));
  const focus=new Set([id,o.actor.node,o.actor.home,o.actor.routine?.workplace,
    ...o.tasks.map(t=>t.id),...o.tasks.flatMap(t=>[t.pickup,t.destination,t.requester,t.recipient]),
    ...(o.communication?.threads ?? []).flatMap(t=>[t.id,t.initiator,t.recipient]),...o.encounters.flatMap(e=>[e.id,e.initiator,e.recipient]),
    ...(o.town?.work.filter(w=>w.canTakeNow).map(w=>w.id) ?? [])]);
  const requiredEvidence=new Set(o.placeKnowledge.flatMap(p=>[p.stock.evidenceId,p.salesOpen.evidenceId]).filter((v):v is string=>!!v));
  const interpretations=new Map(o.memoryEvidence.map(e=>[e.id,e.interpretation]));
  const mandatoryMemories=new Set(o.actor.memories.filter(m=>m.kind!=='observed' || m.source!=='world' || focus.has(m.subject) || requiredEvidence.has(m.id) || interpretations.get(m.id)==='speech-only' || /^(Observed|Verified)\b/.test(m.detail)).map(m=>m.id));
  const optional=o.actor.memories.filter(m=>!mandatoryMemories.has(m.id));
  const words=new Set(topic.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  const relevance=(detail:string)=>[...words].filter(word=>detail.toLowerCase().includes(word)).length;
  optional.sort((a,b)=>relevance(b.detail)-relevance(a.detail)||b.time-a.time||b.id.localeCompare(a.id));
  const optionalIds=new Set(optional.slice(0,Math.max(0,contextPolicy.preferredMemories-mandatoryMemories.size)).map(m=>m.id));
  o.actor.memories=o.actor.memories.filter(m=>mandatoryMemories.has(m.id)||optionalIds.has(m.id));
  if(o.socialContext){
    const interest=topic+' '+o.actor.goals.map(g=>g.description).join(' ');
    o.socialContext.publicFacts=o.socialContext.publicFacts.filter(f=>
      f.id.endsWith(':origins') && (triggers.includes('activation') || /history|origin|past|arriv/i.test(topic)) ||
      f.id.endsWith(':concerns') && /community|neighbourhood|road|afford|maintain|concern/i.test(interest) ||
      f.id.endsWith(':leadership') && /leader|association|election|govern/i.test(topic) ||
      f.id.endsWith(':spaces') && (['hill','overlook','town-green'].includes(o.actor.node)||/garden|green|space|rest/i.test(interest)) ||
      f.id.endsWith(':character') && !mandatoryThreadIds.size && !requiredTaskIds.size);
  }
  const manifest=():ContextAudit=>{
    const list=(all:{id:string}[],selected:{id:string}[],required:Set<string>)=>({included:selected.map(x=>x.id),mandatory:selected.filter(x=>required.has(x.id)).map(x=>x.id),omitted:all.filter(x=>!selected.some(y=>y.id===x.id)).map(x=>x.id)});
    return {version:1,originalCharacters:JSON.stringify(source).length,projectedCharacters:0,targetExceeded:false,
      memories:list(source.actor.memories,o.actor.memories,mandatoryMemories),threads:list(source.communication?.threads ?? [],o.communication?.threads ?? [],mandatoryThreadIds),tasks:list(source.tasks,o.tasks,requiredTaskIds),encounters:list(source.encounters,o.encounters,mandatoryEncounterIds),
      historyFacts:{included:o.socialContext?.publicFacts.map(f=>f.id) ?? [],omitted:source.socialContext?.publicFacts.filter(f=>!o.socialContext?.publicFacts.some(x=>x.id===f.id)).map(f=>f.id) ?? []}};
  };
  return {observation:o,manifest};
}

function encodeObservation(o:NpcObservation,audit:ContextAudit){
  const {knowledge,memories,capabilities,revision,...actor}=o.actor;
  const interpretations=new Map(o.memoryEvidence.map(e=>[e.id,e.interpretation]));
  const facts=new Map(o.placeKnowledge.map(p=>[p.placeId,p]));
  return {
    mapId:o.mapId,time:o.time,actor,
    knownPeople:knowledge.people,knownTransporters:knowledge.transporters ?? [],capabilities,permittedActions:o.permittedActions,actionConstraints:o.actionConstraints,
    places:o.places.map(p=>{const k=facts.get(p.id);return{id:p.id,name:p.name,...(p.node!==p.id?{node:p.node}:{}),facts:k?.facts ?? null,...(k?.factEvidenceId?{factEvidenceId:k.factEvidenceId}:{}),...(k?.stock.value!==null&&k?.stock.value!==undefined?{stock:k.stock}:{}),...(k?.salesOpen.value!==null&&k?.salesOpen.value!==undefined?{salesOpen:k.salesOpen}:{})};}),
    memories:memories.map(({eventId,...m})=>({...m,interpretation:interpretations.get(m.id) ?? 'unverified-report'})),
    nearbyPeople:o.nearbyPeople,encounterOpportunities:o.encounterOpportunities,encounters:o.encounters,
    ...(o.communication?{communication:o.communication}:{}),...(o.town?{town:o.town}:{}),
    tasks:o.tasks,resources:o.resources,knownBlockedEdges:o.knownBlockedEdges,...(o.socialContext?{socialContext:o.socialContext}:{}),
    contextSelection:{version:1,omitted:{memories:audit.memories.omitted.length,threads:audit.threads.omitted.length,tasks:audit.tasks.omitted.length,encounters:audit.encounters.omitted.length,historyFacts:audit.historyFacts.omitted.length}},
  };
}

export function prepareModelInput(input:NpcDecisionRequest|ConversationContext,mode:'decision'|'conversation'){
  const topic='message' in input?input.message:'',triggers='triggers' in input?input.triggers:[];
  const selected=selectModelObservation(input.observation,topic,triggers),o=selected.observation;
  const wrap=()=>{
    const {observation,...envelope}=input;
    // The current player message is already explicit. Remove only an exact
    // duplicate final transcript turn, never an earlier distinct statement.
    if('history' in envelope){const last=envelope.history.at(-1);if(last?.speaker==='player'&&last.text===topic)envelope.history=envelope.history.slice(0,-1);}
    return {...envelope,observation:encodeObservation(o,selected.manifest())};
  };
  let projected=wrap();
  // Never trim a required record to hit the soft target. Optional recent records
  // can be omitted; overflow of mandatory content fails closed at the hard cap.
  while(JSON.stringify(projected).length>contextPolicy.targetCharacters){
    const audit=selected.manifest();
    const optional=o.actor.memories.find(m=>!audit.memories.mandatory.includes(m.id));
    if(optional)o.actor.memories=o.actor.memories.filter(m=>m.id!==optional.id);
    else {
      const archived=o.communication?.threads.find(t=>!audit.threads.mandatory.includes(t.id));
      if(!archived)break;
      o.communication!.threads=o.communication!.threads.filter(t=>t.id!==archived.id);
    }
    projected=wrap();
  }
  if(JSON.stringify(projected).length>contextPolicy.maximumCharacters)throw new ContextCapacityError();
  const audit=selected.manifest();audit.projectedCharacters=JSON.stringify(projected).length;audit.targetExceeded=audit.projectedCharacters>contextPolicy.targetCharacters;
  const memoryIds=new Set(o.actor.memories.map(m=>m.id));o.memoryEvidence=o.memoryEvidence.filter(m=>memoryIds.has(m.id));
  const schema=employmentDecisionSchema(o);
  schema.properties.action.anyOf=schema.properties.action.anyOf.filter(branch=>o.permittedActions.includes(branch.properties.type.enum[0] as NpcDecision['action']['type']));
  if(mode==='decision'&&!schema.properties.action.anyOf.length)throw new Error('No permitted actions for model decision');
  return {input:projected,observation:o,audit,instructions:scopedInstructions(o,mode),schema};
}

export function assertVisibleMemoryReference(decision:NpcDecision,observation:NpcObservation){
  const action=decision.action;
  if('memoryId' in action && action.memoryId!==null && !observation.actor.memories.some(m=>m.id===action.memoryId))throw new Error('Model referenced a memory outside its supplied context');
}
