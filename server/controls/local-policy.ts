import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { replaceCheckpoint } from '../persistence/replace-checkpoint.js';
import { generationReservation, type InputTokenLimit } from '../inference/model-limits.js';
import type { NeighbourhoodProvider } from '../inference/neighbourhood-provider.js';
import type { GenerationMetrics } from '../../shared/neighbourhood/conversation.js';
import { inspectProbeBudget, type ProbeLimits } from './probe-budget.js';
const lagosDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'});

export interface LocalPolicy {
  migrationCheckpointHash?:string|null;
  version: 1; enabled: boolean; authorizedAt: string | null; expiresAt: string | null;
  dailyUsd: number; totalUsd: number; maximumRequests: number; maximumTokens: number;
  inputTokenLimit: InputTokenLimit; outputTokenLimit: 2048; concurrency: 1; requestsPerMinute: number;
  runRequests: number | null; runUsd: number | null; stoppedReason: string | null;
  onExhausted: 'pause' | 'continuity';
}
export const defaultLocalPolicy: LocalPolicy = { version: 1, enabled: false, authorizedAt: null, expiresAt: null,migrationCheckpointHash:null,
  dailyUsd: .25, totalUsd: 1, maximumRequests: 48, maximumTokens: 500000,
  inputTokenLimit: 8000, outputTokenLimit: 2048, concurrency: 1, requestsPerMinute: 6,
  runRequests: null, runUsd: null, stoppedReason: null, onExhausted: 'pause' };
export function legacyOperatingMigrationAuthorized(text:string,policy:LocalPolicy):boolean {
  try{const saved=JSON.parse(text),world=JSON.parse(saved.world);return saved.version===1&&!saved.operating&&!!saved.plan&&!saved.plan.profile&&/^server-[a-f0-9-]+$/.test(world.id)&&policy.migrationCheckpointHash===createHash('sha256').update(text).digest('hex');}catch{return false;}
}
export function validateLocalPolicy(p: LocalPolicy): void {
  if (!p || p.version !== 1 || typeof p.enabled !== 'boolean' ||
      p.migrationCheckpointHash!=null&&!/^[a-f0-9]{64}$/.test(p.migrationCheckpointHash) ||
      ![p.dailyUsd,p.totalUsd].every(n=>Number.isFinite(n)&&n>0&&n<=150) ||
      ![p.maximumRequests,p.maximumTokens].every(n=>Number.isSafeInteger(n)&&n>0) ||
      ![6000,8000].includes(p.inputTokenLimit) || p.outputTokenLimit!==2048 || p.concurrency!==1 ||
      !Number.isInteger(p.requestsPerMinute)||p.requestsPerMinute<1||p.requestsPerMinute>6 ||
      p.runRequests!==null&&(!Number.isSafeInteger(p.runRequests)||p.runRequests<1) ||
      p.runUsd!==null&&(!Number.isFinite(p.runUsd)||p.runUsd<=0||p.runUsd>150) ||
      p.authorizedAt!==null&&(typeof p.authorizedAt!=='string'||!Number.isFinite(Date.parse(p.authorizedAt))) ||
      p.expiresAt!==null&&(typeof p.expiresAt!=='string'||!Number.isFinite(Date.parse(p.expiresAt))) ||
      p.enabled&&!p.authorizedAt || p.stoppedReason!==null&&typeof p.stoppedReason!=='string' ||
      p.onExhausted!=='pause'&&p.onExhausted!=='continuity') throw new Error('Invalid local Muse policy; use muse:policy configure');
}
// Statuses that clear on their own: a rate ceiling waits, an in-flight request
// settles. Every other unavailable status is terminal until the owner acts.
const transientMuseStatuses=new Set(['Rate limit; waiting','Inference pending']);
export function terminalMuseUnavailable(status:{available:boolean;status:string}):boolean {
  return !status.available&&!transientMuseStatuses.has(status.status);
}
export async function durableJson(path: string, value: unknown, exclusive=false): Promise<void> {
  await mkdir(dirname(path),{recursive:true});
  const temp=exclusive?path:`${path}.${randomUUID()}.pending`;
  const file=await open(temp,'wx',0o600);
  try { await file.writeFile(JSON.stringify(value,null,2)+'\n'); await file.sync(); } finally { await file.close(); }
  if(!exclusive)await replaceCheckpoint(temp,path);
}
interface Usage { version:1; reservations:{at:number;run:string;microUsd:number;tokens:number}[] }
import type { MuseStatus } from '../../shared/neighbourhood/presentation.js';
// Independent application ceilings, in addition to (never instead of) Meta's ledger.
// A reservation is durable before provider entry and is never refunded or reset.
export class LocalMusePolicy {
  readonly run=randomUUID(); private active=false; private estimated=0;
  private view: MuseStatus = {enabled:false,available:false,status:'Policy not loaded',inFlight:false,requests:0,reservedUsd:0,remainingDailyUsd:0,remainingTotalUsd:0,remainingRequests:0,remainingTokens:0,estimatedUsd:0,inputTokenLimit:8000,outputTokenLimit:2048};
  constructor(readonly path:string,readonly usagePath:string,private readonly upstream?:{path:string;limits:ProbeLimits}) {}
  get status():MuseStatus {return {...this.view,inFlight:this.active,estimatedUsd:this.estimated};}
  async read():Promise<LocalPolicy>{const p=JSON.parse(await readFile(this.path,'utf8')) as LocalPolicy;if(p.onExhausted===undefined)p.onExhausted='pause';validateLocalPolicy(p);return p;}
  private async usage():Promise<Usage>{
    const u=JSON.parse(await readFile(this.usagePath,'utf8')) as Usage;
    if(u.version!==1||!Array.isArray(u.reservations)||u.reservations.some(r=>!Number.isFinite(r.at)||r.at<0||typeof r.run!=='string'||!Number.isSafeInteger(r.microUsd)||r.microUsd<=0||!Number.isSafeInteger(r.tokens)||r.tokens<=0))throw new Error('Invalid local usage ledger; preserve it for review');return u;
  }
  private assess(p:LocalPolicy,u:Usage):MuseStatus {
    const day=(at:number)=>lagosDay.format(at);
    const now=Date.now(),daily=u.reservations.filter(r=>day(r.at)===day(now)),run=u.reservations.filter(r=>r.run===this.run);
    const sum=(rows:Usage['reservations'])=>rows.reduce((n,r)=>n+r.microUsd,0),amount=Math.round(generationReservation(p.inputTokenLimit)*1e6);
    const total=sum(u.reservations),remainingDailyUsd=Math.max(0,Math.floor(p.dailyUsd*1e6)-sum(daily))/1e6,remainingTotalUsd=Math.max(0,Math.floor(p.totalUsd*1e6)-total)/1e6;
    const remainingTokens=Math.max(0,p.maximumTokens-u.reservations.reduce((n,r)=>n+r.tokens,0)),remainingRequests=Math.max(0,p.maximumRequests-u.reservations.length);
    const reason=!p.enabled?'Inference disabled':p.expiresAt&&Date.parse(p.expiresAt)<=now?'Authorization expired':
      Math.round(remainingDailyUsd*1e6)<amount||Math.round(remainingTotalUsd*1e6)<amount||remainingRequests<1||remainingTokens<p.inputTokenLimit+2048?'Application allowance exhausted':
      p.runRequests!==null&&run.length>=p.runRequests||p.runUsd!==null&&sum(run)+amount>Math.floor(p.runUsd*1e6)?'Per-run allowance exhausted':
      u.reservations.filter(r=>r.at>now-60000).length>=p.requestsPerMinute?'Rate limit; waiting':this.active?'Inference pending':'Ready';
    return {enabled:p.enabled,available:reason==='Ready',status:p.stoppedReason??reason,inFlight:this.active,requests:u.reservations.length,reservedUsd:total/1e6,remainingDailyUsd,remainingTotalUsd,remainingRequests,remainingTokens,estimatedUsd:this.estimated,inputTokenLimit:p.inputTokenLimit,outputTokenLimit:2048};
  }
  async refresh():Promise<MuseStatus>{try{
    const p=await this.read();this.view=this.assess(p,await this.usage());
    if(this.upstream){
      const remaining=await inspectProbeBudget(this.upstream.path,this.upstream.limits);
      this.view.upstreamRemainingDailyUsd=remaining.remainingDailyUsd;this.view.upstreamRemainingTotalUsd=remaining.remainingTotalUsd;
      if(Math.min(remaining.remainingDailyUsd,remaining.remainingTotalUsd)<generationReservation(p.inputTokenLimit)){
        this.view.available=false;this.view.status='Upstream Meta allowance exhausted; local authorization cannot increase it';
      }
    }
  }catch{this.view={...this.view,enabled:false,available:false,status:'Policy or spending ledger unavailable; inspect local files'};}return this.status;}
  async suspend(reason='Stopped by operator'):Promise<void>{
    const lock=await open(this.path+'.lock','wx',0o600);
    try{const p=await this.read();await durableJson(this.path,{...p,enabled:false,stoppedReason:reason});}finally{await lock.close();await unlink(this.path+'.lock');}
    await this.refresh();
  }
  wrap(muse:NeighbourhoodProvider, ceiling:InputTokenLimit=8000):NeighbourhoodProvider {
    const control=this;
    let metrics:GenerationMetrics|null=null;
    const invoke=async<T>(work:()=>Promise<T>):Promise<T>=>{
      metrics=null;let dispatched=false;
      const lock=await open(control.usagePath+'.lock','wx',0o600);
      try{
        const p=await control.read(),u=await control.usage();control.view=control.assess(p,u);
        if(p.inputTokenLimit!==ceiling)throw new Error('Token ceiling changed; restart backend before inference');
        if(!control.view.available)throw new Error('Local Muse policy prohibits inference');
        u.reservations.push({at:Date.now(),run:control.run,microUsd:Math.round(generationReservation(p.inputTokenLimit)*1e6),tokens:p.inputTokenLimit+2048});
        await durableJson(control.usagePath,u);control.active=true;
        dispatched=true;const result=await work();const current=await control.read();if(!current.enabled||current.authorizedAt!==p.authorizedAt||current.expiresAt&&Date.parse(current.expiresAt)<=Date.now())throw new Error('Authorization changed while inference was pending');control.estimated+=muse.metrics?.estimatedCostUsd??0;return result;
      }finally{if(dispatched)metrics=muse.metrics;control.active=false;await lock.close();await unlink(control.usagePath+'.lock');await control.refresh();}
    };
    return {mode:'live-meta',get metrics(){return metrics;},decide:r=>invoke(()=>muse.decide(r)),converse:c=>invoke(()=>muse.converse(c))};
  }
}
