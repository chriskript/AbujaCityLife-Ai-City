import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTown } from '../shared/neighbourhood/town.js';
import { isNpcDecision, npcDecisionSchema } from '../shared/neighbourhood/decision-schema.js';
import { NeighbourhoodServerSession, type LivePlan } from '../server/session.js';
import { SelectiveNeighbourhoodProvider, reasoningOpportunity } from '../server/inference/selective-provider.js';
import { MetaNeighbourhoodProvider, MockNeighbourhoodProvider, maximumGenerationUsd, type NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { initializeProbeBudget } from '../server/controls/probe-budget.js';
import { runSocietyProbe } from '../server/evaluation/society-probe.js';
import type { NpcDecisionRequest } from '../shared/neighbourhood/types.js';
import { prepareModelInput } from '../server/inference/model-context.js';

const directories:string[]=[],sessions:NeighbourhoodServerSession[]=[];
afterEach(async()=>{for(const s of sessions.splice(0))await s.close();for(const d of directories.splice(0))await rm(d,{recursive:true,force:true});});
async function directory(){const d=await mkdtemp(join(tmpdir(),'town-7g-'));directories.push(d);return d;}
const plan=():LivePlan=>({id:'offline-test-only',approved:true,expiresAt:new Date(Date.now()+3600000).toISOString(),maxGenerations:6,maxEstimatedUsd:.10,allowAutonomy:true});
function fakeMuse():NeighbourhoodProvider{
 const offline=new MockNeighbourhoodProvider();return {mode:'live-meta',metrics:null,decide:vi.fn(async request=>({...await offline.decide(request),mode:'meta' as const,model:'offline-contract-only'})),converse:vi.fn()};
}
describe('selective society reasoning readiness (offline only)',()=>{
 it.each(['wait','work'] as const)('aligns %s duration schema with execution boundaries',type=>{
  const branch=npcDecisionSchema.properties.action.anyOf.find(b=>b.properties.type.enum[0]===type)!;
  expect(branch.properties).toMatchObject({seconds:{minimum:1,maximum:120}});
  for(const seconds of [0,1,120,121,NaN,Infinity])expect(isNpcDecision({goalId:'earn',reason:'Boundary',action:{type,seconds}})).toBe(Number.isFinite(seconds)&&seconds>=1&&seconds<=120);
 });
 it('routes by scoped circumstances and configurable registry membership, without altering the request',async()=>{
  const world=createTown('routing'),request=world.requestDecision('amina')!,muse=fakeMuse();
  const selected=new SelectiveNeighbourhoodProvider(['amina','chris'],muse),before=structuredClone(request);
  expect(selected.sourceFor(request.observation,request.triggers)).toBe('live-meta');
  await selected.decide(request);expect(muse.decide).toHaveBeenCalledOnce();expect(request).toEqual(before);
  const other=new SelectiveNeighbourhoodProvider(['grace'],fakeMuse());expect(other.sourceFor(request.observation,request.triggers)).toBe('mock');
  expect(reasoningOpportunity(request.observation,['restored'])).toBeNull();
  expect(reasoningOpportunity({...request.observation,permittedActions:[]},request.triggers)).toBeNull();
  expect(reasoningOpportunity(world.observe('musa'),['road-change'])).toBe('discovered-road-change');
 });
 it('does not silently replace a failed or invalid Muse proposal with an offline action',async()=>{
  const world=createTown('no-fallback'),request=world.requestDecision('amina')!,offline=new MockNeighbourhoodProvider(),muse=fakeMuse();
  const fallback=vi.spyOn(offline,'decide');vi.mocked(muse.decide).mockRejectedValue(new Error('Meta refused'));
  const selected=new SelectiveNeighbourhoodProvider(['amina'],muse,offline);
  const before=world.serialize();await expect(selected.decide(request)).rejects.toThrow('Meta refused');expect(world.serialize()).toBe(before);expect(fallback).not.toHaveBeenCalled();
  vi.mocked(muse.decide).mockResolvedValue({mode:'meta',model:'fake',decision:{goalId:'restock',reason:'Invalid boundary',action:{type:'propose-transport',recipient:'musa',quantity:8}}});
  const result=await selected.decide(request);expect(world.applyDecision(request.id,result.decision,result).reason).toBe('invalid-schema');expect(fallback).not.toHaveBeenCalled();expect(world.snapshot.tasks).toEqual({});
 });
 it('finishes carrying and stocking already collected supplies without another Muse call',async()=>{
  const world=createTown('stock-continuation');
  const apply=(action:unknown)=>{const request=world.requestInteractionDecision('amina')!;expect(world.applyDecision(request.id,{goalId:request.observation.actor.goals[0]!.id,reason:'Offline setup',action},{mode:'mock',model:'fixture'}).accepted).toBe(true);};
  apply({type:'travel',destination:'centre'});world.advance(20);apply({type:'collect-self',quantity:2});
  const muse=fakeMuse(),provider=new SelectiveNeighbourhoodProvider(['amina'],muse);
  let request=world.requestInteractionDecision('amina')!;expect(provider.sourceFor(request.observation,request.triggers)).toBe('mock');
  let result=await provider.decide(request);expect(result.decision).toMatchObject({action:{type:'travel',destination:'market'}});expect(world.applyDecision(request.id,result.decision,result).accepted).toBe(true);world.advance(20);
  request=world.requestInteractionDecision('amina')!;result=await provider.decide(request);expect(result.decision).toMatchObject({action:{type:'stock-stall',quantity:2}});expect(world.applyDecision(request.id,result.decision,result).accepted).toBe(true);
  expect(muse.decide).not.toHaveBeenCalled();expect(world.snapshot.npcs.amina!.inventory.goods).toBe(0);expect(world.snapshot.resources.marketGoods).toBe(3);
 });
 it('charges only selected reasoning to the live plan, persists routine accounting, and does not infer on recovery',async()=>{
  const checkpoint=join(await directory(),'session.json'),muse=fakeMuse(),provider=new SelectiveNeighbourhoodProvider(['amina','musa'],muse);let wall=Date.now();
  const options={checkpoint,provider,plan:plan(),now:()=>wall+=1000};const session=await NeighbourhoodServerSession.open(options);sessions.push(session);
  await session.decide();expect(muse.decide).not.toHaveBeenCalled();
  let saved=JSON.parse(await readFile(checkpoint,'utf8'));expect(saved.routineRequests).toBe(1);expect(saved.requests).toBe(0);expect(saved.plan.used).toBe(0);
  await session.decide();saved=JSON.parse(await readFile(checkpoint,'utf8'));expect(muse.decide).toHaveBeenCalledOnce();expect(saved.requests).toBe(1);expect(saved.plan.used).toBe(1);expect(saved.plan.reservedUsd).toBe(maximumGenerationUsd);
  await expect(session.decide('amina')).rejects.toThrow('autonomous opportunities');
  await session.close();const restored=await NeighbourhoodServerSession.open(options);sessions.push(restored);expect(muse.decide).toHaveBeenCalledOnce();
  const recovered=JSON.parse(await readFile(checkpoint,'utf8'));expect(recovered.requests).toBe(saved.requests);expect(recovered.routineRequests).toBe(saved.routineRequests);expect(recovered.plan).toEqual(saved.plan);
 });
 it('sends only the actual scoped request to mocked Meta transport and retains invalid output evidence without retry',async()=>{
  const dir=await directory(),ledgerPath=join(dir,'ledger.json');await initializeProbeBudget(ledgerPath);
  const world=createTown('transport-contract'),request=world.requestDecision('amina')!,invalid={goalId:'restock',reason:'Boundary mistake',action:{type:'propose-transport',recipient:'musa',quantity:8}};
  const fetcher=vi.fn(async(url:unknown,init?:RequestInit)=>{
   const body=JSON.parse(String(init?.body));expect(JSON.parse(body.input)).toEqual(prepareModelInput(request,'decision').input);expect(body).not.toHaveProperty('npcs');
   return new Response(JSON.stringify(String(url).endsWith('input_tokens')?{input_tokens:5000}:{model:'muse-spark-1.3',status:'completed',usage:{input_tokens:5000,output_tokens:100},output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(invalid)}]}]}),{status:200});
  });
  const provider=new MetaNeighbourhoodProvider({apiKey:'offline-test-key',ledgerPath,dailyUsd:.25,totalUsd:1,fetcher:fetcher as typeof fetch});
  const before=world.serialize();await expect(provider.decide(request)).rejects.toThrow('Invalid Meta decision');expect(world.serialize()).toBe(before);expect(fetcher).toHaveBeenCalledTimes(2);expect(provider.attempt?.proposal).toEqual(invalid);expect(provider.metrics?.inputTokens).toBe(5000);
  expect(JSON.parse(await readFile(ledgerPath,'utf8')).reservations).toHaveLength(1);
 });
 it('blocks an oversized exact preflight after reservation without a generation request',async()=>{
  const ledgerPath=join(await directory(),'ledger.json');await initializeProbeBudget(ledgerPath);const fetcher=vi.fn(async()=>new Response(JSON.stringify({input_tokens:6001}),{status:200}));
  const provider=new MetaNeighbourhoodProvider({apiKey:'fake',ledgerPath,dailyUsd:.25,totalUsd:1,fetcher:fetcher as typeof fetch});await expect(provider.decide(createTown('large').requestDecision('amina')!)).rejects.toThrow('Input token limit');expect(fetcher).toHaveBeenCalledOnce();expect(provider.attempt?.preflightTokens).toBe(6001);expect(provider.metrics).toBeNull();
 });
 it('records separate synthetic initiator/recipient decisions, validated delivery, exact-input counterfactuals and a matched baseline',async()=>{
  const dir=await directory();let wall=Date.now();const result=await runSocietyProbe({directory:dir,provider:fakeMuse(),selectedResidents:['amina','musa'],plan:plan(),kind:'offline-contract-rehearsal',paceMs:0,now:()=>wall+=1000});
  const rows=(await readFile(join(dir,'evidence.ndjson'),'utf8')).trim().split('\n').map(line=>JSON.parse(line));
  const starts=rows.filter(r=>r.stage==='model-started');expect(new Set(starts.map(r=>r.request.actorId))).toEqual(new Set(['amina','musa']));expect(starts.every(r=>r.offlineCounterfactual.mode==='mock')).toBe(true);
  expect(result.calls).toBeLessThanOrEqual(6);expect(result.maximumReservedUsd).toBeLessThan(.10);expect(result.town.tasks.some(t=>t.status==='delivered'&&t.rewardPaid)).toBe(true);expect(result.town.time).toBe(result.offlineBaseline.time);expect(result.accounting.routineRequests).toBeGreaterThan(0);
  expect(rows.some(r=>r.stage==='world-committed'&&r.frame.events.some((e:{type:string;data:{accepted?:boolean}})=>e.type==='action-validated'&&e.data.accepted))).toBe(true);
  await expect(runSocietyProbe({directory:dir,provider:fakeMuse(),selectedResidents:['amina','musa'],plan:plan(),kind:'offline-contract-rehearsal',paceMs:0})).rejects.toMatchObject({code:'EEXIST'});
 },30000);
 it('stops after one provider failure and never fabricates a proposal or a successful cooperation',async()=>{
  const muse=fakeMuse();vi.mocked(muse.decide).mockRejectedValue(new Error('Rejected by provider'));
  const result=await runSocietyProbe({directory:await directory(),provider:muse,selectedResidents:['amina','musa'],plan:plan(),kind:'offline-contract-rehearsal',paceMs:0});
  expect(muse.decide).toHaveBeenCalledOnce();expect(result.providerFailed).toBe(true);expect(result.town.tasks).toEqual([]);expect(result.town.time).toBeLessThan(2);
 });
});
