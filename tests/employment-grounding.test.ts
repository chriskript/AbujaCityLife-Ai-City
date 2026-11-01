import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createTown } from '../shared/neighbourhood/town.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { employmentDecisionSchema, employmentInstructions } from '../server/inference/employment-grounding.js';
import type { Action } from '../shared/neighbourhood/types.js';
import { initializeProbeBudget } from '../server/controls/probe-budget.js';
import { MetaNeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { prepareModelInput } from '../server/inference/model-context.js';

function act(world:Neighbourhood,id:string,action:Action){const request=world.requestInteractionDecision(id)!;return world.applyDecision(request.id,{goalId:request.observation.actor.goals[0]!.id,reason:'Offline grounding regression',action},{mode:'mock',model:'offline-employment'});}
const job=(world:Neighbourhood,id:string,businessId:string)=>world.observe(id).town!.work.find(work=>work.id===businessId)!;

describe('scoped employment knowledge and live proposal bounds',()=>{
  it('sends the same eligible-only schema in decision and conversation adapters using fake transport',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'employment-schema-'));
    try{
      const ledgerPath=join(dir,'ledger.json');await initializeProbeBudget(ledgerPath);
      const world=createTown('schema-adapter'),request=world.requestDecision('chris')!;
      const response={model:'muse-spark-1.3',status:'completed',usage:{input_tokens:1000,output_tokens:50},output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({goalId:'earn',reason:'Consider known opportunities first.',action:{type:'wait',seconds:1}})}]}]};
      const fetcher=vi.fn(async(url:unknown,_init?:RequestInit)=>new Response(JSON.stringify(String(url).endsWith('input_tokens')?{input_tokens:1000}:response)));
      const provider=new MetaNeighbourhoodProvider({apiKey:'fake-only',ledgerPath,dailyUsd:.25,totalUsd:1,fetcher:fetcher as typeof fetch});
      await provider.decide(request);
      const body=JSON.parse(String(fetcher.mock.calls[0]![1]!.body));
      expect(body.text.format.schema).toEqual(prepareModelInput(request,'decision').schema);
      expect(body.instructions).toContain('town.eligibleWorkIds');
      expect(JSON.parse(body.input)).toEqual(prepareModelInput(request,'decision').input);
      response.output[0]!.content[0]!.text=JSON.stringify({reply:'I can consider work I am qualified for.',evidenceIds:['chris'],uncertain:true,proposedDecision:null,claims:[]});
      await provider.converse({observation:request.observation,message:'What work could you do?',history:[]});
      const conversation=JSON.parse(String(fetcher.mock.calls[2]![1]!.body));
      expect(conversation.text.format.schema.properties.proposedDecision.anyOf[0]).toEqual(prepareModelInput({observation:request.observation,message:'What work could you do?',history:[]},'conversation').schema);
      expect(fetcher).toHaveBeenCalledTimes(4);
    }finally{await rm(dir,{recursive:true,force:true});}
  });
  it('explicitly distinguishes Chris knowing supply work from being qualified or eligible for it',()=>{
    const world=createTown('grounded-chris');
    expect(job(world,'chris','supply-desk')).toMatchObject({skill:'supply',matchesSkill:false,node:'centre',atWorkplace:true,funded:true,available:true,freshness:'current',canTakeNow:false,ineligibleReason:'missing-skill'});
    expect(world.observe('chris').town!.eligibleWorkIds).not.toContain('supply-desk');
    expect(employmentDecisionSchema(world.observe('chris')).properties.action.anyOf.some(branch=>branch.properties.type.enum[0]==='take-work')).toBe(false);
    expect(employmentInstructions).toContain('courier experience');
    const before=world.snapshot;
    expect(act(world,'chris',{type:'take-work',businessId:'supply-desk'})).toMatchObject({accepted:false,reason:'missing-skill'});
    expect(world.snapshot.npcs.chris!.inventory).toEqual(before.npcs.chris!.inventory);
    expect(world.snapshot.town).toEqual(before.town);
  });
  it('restricts live take-work IDs to current eligible jobs without changing the global schema or world validator',()=>{
    const world=createTown('grounded-halima'),observation=world.observe('halima');
    expect(observation.town!.eligibleWorkIds).toContain('supply-desk');
    const branch=employmentDecisionSchema(observation).properties.action.anyOf.find(branch=>branch.properties.type.enum[0]==='take-work')!;
    expect((branch.properties as Record<string,unknown>).businessId).toEqual({type:'string',enum:observation.town!.eligibleWorkIds});
    expect(act(world,'halima',{type:'take-work',businessId:'supply-desk'}).accepted).toBe(true);
    expect(world.observe('halima').town!.eligibleWorkIds).toEqual([]);
  });
  it('does not expose unknown jobs or remote funding balances and keeps historic funding separate from current availability',()=>{
    const world=createTown('funding-scope');
    expect(world.observe('musa').town!.work.some(work=>work.id==='supply-desk')).toBe(false);
    expect(act(world,'chris',{type:'travel',destination:'market'}).accepted).toBe(true);world.advance(20);
    const before=job(world,'chris','supply-desk');
    expect(before).toMatchObject({funded:true,freshness:'historical',atWorkplace:false,canTakeNow:false});
    const state=world.snapshot,business=state.town!.businesses['supply-desk']!;
    state.npcs.halima!.inventory.coins!+=business.coins;business.coins=0;
    const changed=Neighbourhood.restore(JSON.stringify(state));
    expect(job(changed,'chris','supply-desk')).toEqual(before);
    expect(job(changed,'halima','supply-desk')).toMatchObject({funded:false,available:false,canTakeNow:false});
    expect(JSON.stringify(before)).not.toContain('coins');
  });
  it('does not confuse funded with available when production inputs are exhausted',()=>{
    const state=createTown('inputs-exhausted').snapshot;
    state.town!.initialInputs=0;state.town!.rawInputs=0;
    const world=Neighbourhood.restore(JSON.stringify(state));
    expect(job(world,'halima','supply-desk')).toMatchObject({funded:true,available:false,canTakeNow:false,ineligibleReason:'work-unavailable'});
    expect(act(world,'halima',{type:'take-work',businessId:'supply-desk'})).toMatchObject({accepted:false,reason:'work-unavailable'});
  });
  it('reads older knowledge with unknown funding and suppresses outdated workplace evidence after a move',()=>{
    const world=createTown('legacy-work-knowledge');act(world,'chris',{type:'travel',destination:'market'});world.advance(20);
    const state=world.snapshot,known=state.npcs.chris!.knowledge.businesses!['supply-desk']!;
    delete known.funded;
    const old=Neighbourhood.restore(JSON.stringify(state));
    expect(job(old,'chris','supply-desk')).toMatchObject({funded:null,freshness:'historical',canTakeNow:false});
    known.siteNode='stand';
    const moved=Neighbourhood.restore(JSON.stringify(state));
    expect(job(moved,'chris','supply-desk')).toMatchObject({funded:null,available:null,observedAt:null,freshness:'unknown',canTakeNow:false});
    const saved=moved.serialize();
    expect(Neighbourhood.restore(saved).snapshot.npcs).toEqual(moved.snapshot.npcs);
  });
});
