import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { prepareModelInput } from '../server/inference/model-context.js';
import { generationReservation } from '../server/inference/model-limits.js';
import type { NpcDecisionRequest } from '../shared/neighbourhood/types.js';

const historicalDirectory='output/society-7g/7g-c-unity-20261101T085502Z';
const fixture=JSON.parse(await readFile('tests/fixtures/phase-c-context.json','utf8'));
let historicalInstructions:string=fixture.historicalInstructions;
let cases:{number:number;recordedPreflightTokens:number;request:NpcDecisionRequest;schema:unknown}[]=fixture.cases;
let source='portable captured first/failed input fixture';
let evidenceSha256:string|null=null;
try{
  const bytes=await readFile(historicalDirectory+'/evidence.ndjson');evidenceSha256=createHash('sha256').update(bytes).digest('hex');
  const rows=bytes.toString().trim().split('\n').map(line=>JSON.parse(line));
  historicalInstructions=rows.find(r=>r.stage==='started').systemInstructions;
  cases=rows.filter(r=>r.stage==='model-started').map(r=>({number:r.number,request:r.request,schema:r.decisionSchema,recordedPreflightTokens:rows.find(x=>x.number===r.number && ['model-returned','model-failed'].includes(x.stage)).attempt.preflightTokens}));
  source='all ten original Phase C inputs';
}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
const size=(v:unknown)=>JSON.stringify(v).length;
const instructionStarts=[['core-and-conversation',0],['communication',historicalInstructions.indexOf(' Contact information')],['location',historicalInstructions.indexOf(' mapId')],['history',historicalInstructions.indexOf(' socialContext')],['employment',historicalInstructions.indexOf(' Employment:')]] as [string,number][];
if(instructionStarts.some(([,start])=>start<0))throw new Error('Historical instruction sections not recognised');
const measures=(request:NpcDecisionRequest,instructions:string,schema:unknown)=>({inputCharacters:size(request),instructionCharacters:instructions.length,schemaCharacters:size(schema),totalVisibleCharacters:size(request)+instructions.length+size(schema)});
const report={mode:'offline-no-api',source,evidenceSha256,tokenAttribution:'Exact historical total preflight tokens only; component character counts are measurements, not model tokens. No local tokenizer is claimed equivalent to Meta.',
  historicalInstructionSections:instructionStarts.map(([section,start],i)=>({section,characters:(instructionStarts[i+1]?.[1] ?? historicalInstructions.length)-start})),
  cases:cases.map(c=>{
    const prepared=prepareModelInput(c.request,'decision'),o=c.request.observation;
    const before=measures(c.request,historicalInstructions,c.schema),after={inputCharacters:size(prepared.input),instructionCharacters:prepared.instructions.length,schemaCharacters:size(prepared.schema),totalVisibleCharacters:size(prepared.input)+prepared.instructions.length+size(prepared.schema)};
    return {number:c.number,actor:c.request.actorId,recordedPreflightTokens:c.recordedPreflightTokens,before,after,visibleCharacterReduction:1-after.totalVisibleCharacters/before.totalVisibleCharacters,
      originalObservationSections:Object.entries(o).map(([section,value])=>({section,characters:size(value)})).sort((a,b)=>b.characters-a.characters),
      originalActorSections:Object.entries(o.actor).map(([section,value])=>({section,characters:size(value)})).sort((a,b)=>b.characters-a.characters),
      originalActionSchemaSections:(c.schema as {properties:{action:{anyOf:{properties:{type:{enum:string[]}}}[]}}}).properties.action.anyOf.map(branch=>({action:branch.properties.type.enum[0],characters:size(branch)})).sort((a,b)=>b.characters-a.characters),
      selection:prepared.audit,newExactInput:prepared.input,newExactInstructions:prepared.instructions,newExactSchema:prepared.schema};
  }),
  ceilingRecommendation:{defaultUnchanged:6000,proposedForSeparatelyApprovedPlan:8000,outputLimitUnchanged:2048,reservation6000:generationReservation(6000),reservation8000:generationReservation(8000),maximum48:generationReservation(8000)*48,exactNewTokenCounts:'unknown until a separately approved Meta preflight'},
};
await writeFile('docs/model-context-profile.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({mode:report.mode,source,cases:report.cases.map(c=>({number:c.number,actor:c.actor,recordedPreflight:c.recordedPreflightTokens,before:c.before,after:c.after,reduction:c.visibleCharacterReduction})),ceilingRecommendation:report.ceilingRecommendation},null,2));
