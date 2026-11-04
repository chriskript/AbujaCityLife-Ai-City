import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createTown } from '../shared/neighbourhood/town.js';
import type { NpcDecisionRequest } from '../shared/neighbourhood/types.js';
import { prepareModelInput, assertVisibleMemoryReference, ContextCapacityError } from '../server/inference/model-context.js';
import { MetaNeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { initializeProbeBudget } from '../server/controls/probe-budget.js';
import { generationReservation } from '../server/inference/model-limits.js';
import { HeadlessTownRunner } from '../shared/neighbourhood/headless-runner.js';

const fixture=JSON.parse(await readFile(new URL('./fixtures/phase-c-context.json',import.meta.url),'utf8')) as {cases:{number:number;recordedPreflightTokens:number;request:NpcDecisionRequest;schema:unknown}[]};
const failed=()=>structuredClone(fixture.cases.find(c=>c.number===10)!);
describe('bounded model context without lost authority or private knowledge',()=>{
  it('keeps all sixteen residents usable across twenty offline minutes without mutating saves or losing live constraints',async()=>{
    const runner=new HeadlessTownRunner(createTown('context-soak')),actors=new Set<string>();
    for(let minute=0;minute<20;minute++){
      await runner.advance(60);
      const before=runner.world.serialize();
      for(const actorId of runner.world.residentIds){
        const observation=runner.world.observe(actorId);
        if(!observation.permittedActions.length)continue;
        const prepared=prepareModelInput({id:`soak-${minute}-${actorId}`,worldId:'context-soak',actorRevision:observation.actor.revision,worldRevision:runner.world.snapshot.revision,actorId,observation,triggers:runner.world.decisionTriggers(actorId)},'decision');
        expect(prepared.input.observation.actionConstraints).toEqual(observation.actionConstraints);
        expect(prepared.input.observation.actor.inventory).toEqual(observation.actor.inventory);
        expect(prepared.input.observation.town!.eligibleWorkIds).toEqual(observation.town!.eligibleWorkIds);
        expect(prepared.input.observation.socialContext!.background!.id).toBe(`history:unity-v1:self:${actorId}`);
        expect(JSON.stringify(prepared.input).length).toBeLessThanOrEqual(24000);actors.add(actorId);
      }
      expect(runner.world.serialize()).toBe(before);
    }
    expect(actors.size).toBe(16);
    expect(Object.values(runner.world.snapshot.tasks).some(t=>t.status==='delivered')).toBe(true);
    expect(runner.world.snapshot.events.some(e=>e.type==='paid-work-completed')).toBe(true);
  },30_000);
  it('reduces the exact 6045-token Phase C request while preserving its delivered reply, constraints and authoritative state',()=>{
    const historical=failed(),original=structuredClone(historical.request),prepared=prepareModelInput(historical.request,'decision');
    expect(historical.recordedPreflightTokens).toBe(6045);
    expect(JSON.stringify(prepared.input).length).toBeLessThan(JSON.stringify(original).length*.76); // v5 contract: +goalsOmitted/intentions envelope (~52 chars)
    expect(historical.request).toEqual(original);
    expect(prepared.observation.communication).toEqual(original.observation.communication);
    expect(prepared.observation.communication!.threads[0]!.reply).toContain('pickup, drop-off and quantity');
    expect(prepared.input.observation.actionConstraints).toEqual(original.observation.actionConstraints);
    expect(prepared.input.observation.permittedActions).toEqual(original.observation.permittedActions);
    expect(prepared.input.observation.actor.needs).toEqual(original.observation.actor.needs);
    expect(prepared.input.observation.actor.goals).toEqual(original.observation.actor.goals);
    expect(prepared.input.observation.actor.inventory).toEqual(original.observation.actor.inventory);
    expect(prepared.input.observation.socialContext!.background).toEqual(original.observation.socialContext!.background);
    for(const p of original.observation.placeKnowledge)for(const evidence of [p.stock.evidenceId,p.salesOpen.evidenceId])if(evidence)expect(prepared.audit.memories.included).toContain(evidence);
  });
  it('deduplicates place/cached facts without hiding complete, partial, historical or unknown service knowledge',()=>{
    const request=failed().request;
    const original=request.observation.placeKnowledge.find(p=>p.placeId==='centre')!;
    original.facts!.complete=false;original.facts!.services=[];
    const prepared=prepareModelInput(request,'decision');
    const place=prepared.input.observation.places.find(p=>p.id==='centre')!;
    expect(place.facts).toEqual(original.facts);expect(place.factEvidenceId).toBe(original.factEvidenceId);
    expect(prepared.input.observation.places.map(p=>p.id)).toEqual(request.observation.places.map(p=>p.id));
    expect(prepared.input.observation.actor).not.toHaveProperty('knowledge');
    expect(prepared.instructions).toContain('Missing stock/salesOpen fields mean unknown');
    expect(prepared.instructions).toContain('historical observations are not current');
  });
  it('supplies the current simulated day and clock time without imposing a schedule',()=>{
    const request=failed().request;request.observation.time=2*86400+18*3600+45*60;
    const prepared=prepareModelInput(request,'decision');
    expect(prepared.input.observation.time).toBe(2*86400+18*3600+45*60);
    expect(prepared.input.observation.simClock).toBe('Day 3 · Wednesday · 6:45 PM');
    expect(prepared.instructions).toContain('simClock states the current simulated day, weekday and 12-hour clock time');
    expect(prepared.instructions).toContain('No universal schedule is imposed');
  });
  it('retains conflicting reports, promises, verified outcomes and active tasks regardless of recency',()=>{
    const request=failed().request,o=request.observation;
    o.actor.memories=[
      {id:'older-report',eventId:'e1',kind:'reported',source:'zainab',subject:'market',detail:'The market is closed.',time:0,certainty:'uncertain'},
      {id:'conflicting-report',eventId:'e2',kind:'reported',source:'musa',subject:'market',detail:'The market is open.',time:1,certainty:'uncertain'},
      {id:'promise',eventId:'e3',kind:'commitment',source:'world',subject:'job',detail:'Accepted work.',time:2,certainty:'certain'},
      {id:'outcome',eventId:'e4',kind:'outcome',source:'world',subject:'old-task',detail:'A delivery was verified.',time:3,certainty:'certain'},
      ...Array.from({length:20},(_,n)=>({id:'routine-'+n,eventId:'r'+n,kind:'observed' as const,source:'world',subject:'wait',detail:'wait for 60 seconds',time:10+n,certainty:'certain' as const})),
    ];
    o.tasks=[{id:'task-active',requester:'amina',recipient:'musa',quantity:4,pickup:'centre',destination:'market',status:'accepted',expiresAt:1}];
    const prepared=prepareModelInput(request,'decision');
    for(const id of ['older-report','conflicting-report','promise','outcome'])expect(prepared.audit.memories.mandatory).toContain(id);
    expect(prepared.observation.actor.memories.find(m=>m.id==='older-report')).toMatchObject({kind:'reported',source:'zainab',certainty:'uncertain'});
    expect(prepared.observation.tasks).toEqual(o.tasks);
    expect(prepared.audit.memories.omitted.length).toBeGreaterThan(0);
  });
  it('cannot leak another biography or an undelivered/in-flight reply, and preserves actor-specific grants',()=>{
    const world=createTown('context-privacy');
    const request=world.requestInteractionDecision('amina')!;
    world.applyDecision(request.id,{goalId:'restock',reason:'Offline invitation',action:{type:'communicate',recipient:'musa',channel:'text',purpose:'request-help',message:'Could we discuss work?',memoryId:null}},{mode:'mock',model:'offline-context'});
    const before=world.serialize();
    const recipient=world.observe('musa');
    const input=prepareModelInput({observation:recipient,message:'What do you know?',history:[]},'conversation').input;
    expect(input.observation.communication!.threads).toEqual([]);
    expect(input.observation.socialContext!.background!.id).toBe('history:unity-v1:self:musa');
    expect(JSON.stringify(input)).not.toContain('Experience managing stall stock');
    expect(world.serialize()).toBe(before);
    const restricted=failed().request;restricted.observation.socialContext!.publicFacts=[];
    expect(prepareModelInput(restricted,'decision').input.observation.socialContext!.publicFacts).toEqual([]);
  });
  it('never prunes the current accepted discussion, concrete job or task commitments, even when archives grow',()=>{
    const request=failed().request,o=request.observation;
    const active=o.communication!.threads[0]!;
    o.communication!.threads=[active,...Array.from({length:6},(_,i)=>({...active,id:'archive-'+i,status:'expired' as const,response:null,expiresAt:0}))];
    const prepared=prepareModelInput(request,'decision');
    expect(prepared.audit.threads.mandatory).toContain(active.id);
    expect(prepared.observation.communication!.threads.find(t=>t.id===active.id)).toEqual(active);
    expect(prepared.audit.threads.omitted.length).toBeGreaterThan(0);
  });
  it('removes only unavailable action-schema branches and keeps all permitted alternatives and quantity/cargo rules',()=>{
    const request=failed().request,prepared=prepareModelInput(request,'decision');
    for(const branch of prepared.schema.properties.action.anyOf)expect(request.observation.permittedActions).toContain(branch.properties.type.enum[0]);
    expect(prepared.schema.properties.action.anyOf.some(b=>b.properties.type.enum[0]==='propose-transport')).toBe(true);
    expect(prepared.input.observation.actionConstraints).toEqual(request.observation.actionConstraints);
    expect(prepared.input.observation.town!.eligibleWorkIds).toEqual(request.observation.town!.eligibleWorkIds);
  });
  it('rejects unseen memory references and preserves speech-only interpretations',()=>{
    const request=failed().request,prepared=prepareModelInput(request,'decision');
    const omitted=prepared.audit.memories.omitted[0]!;expect(omitted).toBeTruthy();
    expect(()=>assertVisibleMemoryReference({goalId:'restock',reason:'Share',action:{type:'share',recipient:'musa',memoryId:omitted,asBelief:false}},prepared.observation)).toThrow('outside');
    const speech=request.observation.actor.memories[0]!;request.observation.memoryEvidence.find(e=>e.id===speech.id)!.interpretation='speech-only';
    const encoded=prepareModelInput(request,'decision').input.observation.memories.find(m=>m.id===speech.id)!;
    expect(encoded.interpretation).toBe('speech-only');
  });
  it('fails closed instead of dropping oversized mandatory reports, without network calls or state changes',async()=>{
    const world=createTown('critical-context-overflow');
    for(let i=0;i<24;i++)world.recordConversation('amina','player','critical-'+i+' '+ 'x'.repeat(960));
    const request=world.requestInteractionDecision('amina')!,before=world.serialize();
    expect(()=>prepareModelInput(request,'decision')).toThrow(ContextCapacityError);
    const fetcher=vi.fn<typeof fetch>();
    const provider=new MetaNeighbourhoodProvider({apiKey:'fake',ledgerPath:'unused-no-read.json',dailyUsd:.25,totalUsd:1,fetcher});
    await expect(provider.decide(request)).rejects.toThrow('Required scoped context');
    expect(fetcher).not.toHaveBeenCalled();expect(world.serialize()).toBe(before);expect(provider.metrics).toBeNull();
  });
  it('reuses the identical projected body for one preflight and one generation and reserves 8000 tokens before either',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'model-context-budget-'));
    try{
      const ledgerPath=join(dir,'ledger.json');await initializeProbeBudget(ledgerPath);
      const bodies:any[]=[];
      const fetcher=vi.fn(async(url:unknown,init?:RequestInit)=>{
        expect(JSON.parse(await readFile(ledgerPath,'utf8')).reservations[0].microUsd).toBe(18704);
        const body=JSON.parse(String(init?.body));bodies.push(body);
        return new Response(JSON.stringify(String(url).endsWith('input_tokens')?{input_tokens:7500}:{model:'muse-spark-1.3',status:'completed',usage:{input_tokens:7400,output_tokens:80},output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({goalId:'restock',reason:'Consider options',action:{type:'wait',seconds:20}})}]}]}));
      });
      const provider=new MetaNeighbourhoodProvider({apiKey:'fake',ledgerPath,dailyUsd:20,totalUsd:5,inputTokenLimit:8000,fetcher:fetcher as typeof fetch});
      await provider.decide(failed().request);
      expect(fetcher).toHaveBeenCalledTimes(2);expect(bodies[0].input).toBe(bodies[1].input);expect(bodies[0].instructions).toBe(bodies[1].instructions);
      expect(bodies[0].text).toEqual(bodies[1].text);expect(generationReservation(8000)).toBe(.018704);
    }finally{await rm(dir,{recursive:true,force:true});}
  });
  it('has no automatic token-ceiling escalation or retry on the new preflight limit',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'model-context-ceiling-'));
    try{
      const ledgerPath=join(dir,'ledger.json');await initializeProbeBudget(ledgerPath);
      const fetcher=vi.fn(async()=>new Response(JSON.stringify({input_tokens:8001})));
      const provider=new MetaNeighbourhoodProvider({apiKey:'fake',ledgerPath,dailyUsd:20,totalUsd:5,inputTokenLimit:8000,fetcher:fetcher as typeof fetch});
      await expect(provider.decide(failed().request)).rejects.toThrow('Input token limit');expect(fetcher).toHaveBeenCalledTimes(1);
      expect(JSON.parse(await readFile(ledgerPath,'utf8')).reservations).toHaveLength(1);
    }finally{await rm(dir,{recursive:true,force:true});}
  });
});
