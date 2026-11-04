import { ordinaryRejection } from '../shared/neighbourhood/decision-recovery.js';
import { randomUUID, createHash } from 'node:crypto';
import { PhoneControl,projectPhone,type PhoneControlInput,type PhoneActionInput,type PhoneLease,type PhoneView } from '../shared/neighbourhood/phone.js';
import type { MapId } from '../shared/world/town-layout.js';
import { mkdir, open, readFile } from 'node:fs/promises';
import { replaceCheckpoint } from './persistence/replace-checkpoint.js';
import { dirname } from 'node:path';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { chrisResident } from '../shared/neighbourhood/initial-state.js';
import { createTown } from '../shared/neighbourhood/town.js';
import { offlineTownLimits, prototypePopulation, townResidents } from '../shared/neighbourhood/population.js';
import { type NpcId, type NpcDecisionRequest } from '../shared/neighbourhood/types.js';
import { projectNeighbourhood, type NeighbourhoodFrame, type SessionCommand, type CommandReceipt, type Experiment } from '../shared/neighbourhood/presentation.js';
import type { ConversationInput, ConversationResult, ConversationTurn, GenerationMetrics } from '../shared/neighbourhood/conversation.js';
import { NeighbourhoodMockProvider } from '../shared/neighbourhood/mock-provider.js';
import { MockNeighbourhoodProvider, maximumGenerationUsd, validateConversation, type NeighbourhoodProvider } from './inference/neighbourhood-provider.js';
import { generationReservation } from './inference/model-limits.js';
import { legacyOperatingMigrationAuthorized, type LocalMusePolicy } from './controls/local-policy.js';

export class SessionError extends Error { constructor(readonly status: number, message: string) { super(message); } }
interface Receipt { hash: string; status: 'pending' | 'done' | 'failed'; value: unknown }
interface Checkpoint {
  operating?: true;
  legacyPlan?: NonNullable<Checkpoint['plan']>;
  interruptedDecisions?:Record<NpcId,{request:NpcDecisionRequest;reason:string;recordedAt:number}>;
  version: 1; sessionId: string; sequence: number; world: string; paused: boolean; speed: 1 | 2 | 4;
  requests: number; recent: number[]; last: Partial<Record<NpcId, { wall: number; simulation: number; worldId?: string }>>;
  receipts: Record<string, Receipt>; history: Record<NpcId, ConversationTurn[]>;
  metrics: (GenerationMetrics & { requestId: string; actorId: NpcId; recordedAt: number })[]; plan: { id: string; used: number; reservedUsd: number;profile?:'7g-d-society';inputTokenLimit?:8000;inferenceTimeoutMs?:20000|30000 } | null;
  routineRecent?: number[];
  routineRequests?: number;
  progression?: { used: number; limit: number; cursor: number };
}
export interface LivePlan { id: string; approved: true; expiresAt: string; maxGenerations: number; maxEstimatedUsd: number; allowAutonomy: boolean; phase?:string; residents?:string[]; notBefore?:string; inputTokenLimit?:6000|8000; inferenceTimeoutMs?:20000|30000 }
export function validateLivePlan(value: unknown): asserts value is LivePlan {
  const p = value as LivePlan;
  const invalid=()=>new Error('A valid separately approved live evaluation plan is required');
  if(!p||typeof p!=='object')throw invalid();
  const society=p?.phase==='7g-d-society',longer=p?.phase==='7g-d-context',expanded=society||longer||p?.phase==='7g-c-unity';
  const maximumCalls=society?200:longer?48:expanded?36:12,maximumUsd=society?5:longer?.90:expanded?.60:.25;
  if(p.approved!==true||typeof p.id!=='string'||!/^[\w-]{1,80}$/.test(p.id)||typeof p.expiresAt!=='string'||!Number.isFinite(Date.parse(p.expiresAt))||Date.parse(p.expiresAt)<=Date.now()||!Number.isSafeInteger(p.maxGenerations)||p.maxGenerations<1||p.maxGenerations>maximumCalls||!Number.isFinite(p.maxEstimatedUsd)||p.maxEstimatedUsd<maximumGenerationUsd||p.maxEstimatedUsd>maximumUsd||typeof p.allowAutonomy!=='boolean')throw invalid();
  if(p.inferenceTimeoutMs!==undefined&&(!society||![20000,30000].includes(p.inferenceTimeoutMs)))throw invalid();
  if(p.inputTokenLimit!==undefined&&p.inputTokenLimit!==(longer||society?8000:6000))throw invalid();
  if(expanded){
    if(!society&&(p.maxGenerations!==maximumCalls||p.maxEstimatedUsd!==maximumUsd))throw invalid();
    if((longer||society)&&p.inputTokenLimit!==8000)throw invalid();
    if(!p.allowAutonomy||JSON.stringify(p.residents)!==JSON.stringify(townResidents(16).map(n=>n.id))||typeof p.notBefore!=='string'||!Number.isFinite(Date.parse(p.notBefore))||Date.parse(p.notBefore)>Date.now())throw invalid();
    if(society&&Math.round(generationReservation(8000)*1_000_000)*p.maxGenerations>Math.floor(p.maxEstimatedUsd*1_000_000))throw invalid();
  }
}
export class NeighbourhoodServerSession {
  private world!: Neighbourhood;
  private data!: Checkpoint;
  private current!: NeighbourhoodFrame;
  private committedHistory: Record<NpcId, ConversationTurn[]> = {};
  private tail: Promise<unknown> = Promise.resolve();
  private busy = false; private failed = false; private closed = false; private cursor = 0; private epoch = 0;
  private proposals = new Map<string, { request: NpcDecisionRequest; decision: unknown; expires: number }>();
  private listeners = new Set<(frame: NeighbourhoodFrame) => void>();
  private provider: NeighbourhoodProvider;
  private readonly phoneControl=new PhoneControl(()=>this.now());
  private constructor(private readonly options: ConstructorParametersInternal) { this.provider = options.provider ?? new MockNeighbourhoodProvider(); }
  static async open(options: ConstructorParametersInternal): Promise<NeighbourhoodServerSession> {
    const session = new NeighbourhoodServerSession(options);
    if (options.operating) {
      if(options.plan || session.provider.mode!=='live-meta' || !session.provider.sourceFor || !session.provider.routineDecisions)throw new Error('Local operation requires the selective Muse provider and no evaluation plan');
      await options.operating.refresh();
    } else if (session.provider.mode === 'live-meta' || options.plan) validateLivePlan(options.plan);
    if(options.plan?.phase==='7g-d-society'&&session.provider.mode!=='live-meta')throw new Error('Muse society requires live reasoning; offline downgrade refused');
    if(options.plan?.phase==='7g-d-society'&&(!session.provider.sourceFor||session.provider.routineDecisions!==true))throw new Error('Muse society requires its explicit reasoning/mechanics boundary');
    await mkdir(dirname(options.checkpoint), { recursive: true });
    let loaded=false;
    try {
      const savedText=await readFile(options.checkpoint,'utf8');
      loaded=true;
      const data = JSON.parse(savedText) as Checkpoint;
      if (data.version !== 1 || typeof data.sessionId !== 'string' || !Number.isSafeInteger(data.sequence) || data.sequence < 0 || !Number.isSafeInteger(data.requests) || data.requests < 0 || !Array.isArray(data.recent) || !data.last || !data.history || !data.receipts || !Array.isArray(data.metrics) || typeof data.paused !== 'boolean' || ![1,2,4].includes(data.speed)) throw new Error('Invalid server checkpoint');
      if(data.operating && !options.operating)throw new Error('Persistent live society requires dev:live; mock mode cannot own it');
      if(data.legacyPlan&&(!data.operating||!options.operating||data.legacyPlan.profile||!/^[\w-]{1,80}$/.test(data.legacyPlan.id)||!Number.isSafeInteger(data.legacyPlan.used)||data.legacyPlan.used<0||data.legacyPlan.used>12||data.legacyPlan.used>data.requests||!Number.isFinite(data.legacyPlan.reservedUsd)||data.legacyPlan.reservedUsd<0||data.legacyPlan.reservedUsd>.25))throw new Error('Invalid retained legacy plan accounting');
      if(options.operating && data.plan){
        // Only an owner-reviewed exact copy of the canonical legacy server world
        // may migrate. Dedicated society evaluation worlds remain isolated.
        if(!legacyOperatingMigrationAuthorized(savedText,await options.operating.read()))throw new Error('Evaluation checkpoints cannot become the operating society without exact legacy operating migration authorization');
      }
      session.world = Neighbourhood.restore(data.world);
      const npcIds = session.world.residentIds;
      if(data.plan?.profile==='7g-d-society'&&(options.plan?.phase!=='7g-d-society'||session.provider.mode!=='live-meta'))throw new Error('Muse society checkpoint cannot resume under an offline or different profile');
      if(options.plan?.phase==='7g-d-society'&&(!session.world.snapshot.socialVisits||data.plan?.profile!=='7g-d-society'))throw new Error('Different live profile requires a new isolated session');
      if(data.interruptedDecisions!==undefined){
        if(!data.interruptedDecisions||typeof data.interruptedDecisions!=='object'||Array.isArray(data.interruptedDecisions)||Object.keys(data.interruptedDecisions).length>npcIds.length)throw new Error('Invalid pending inference checkpoint');
        for(const [id,item] of Object.entries(data.interruptedDecisions)){
          const r=item?.request;
          if(!npcIds.includes(id)||!r||r.actorId!==id||r.worldId!==session.world.id||typeof r.id!=='string'||!r.observation||r.observation.actor?.id!==id||!Array.isArray(r.triggers)||r.triggers.length>8||r.triggers.some(t=>typeof t!=='string')||JSON.stringify(r).length>100_000||typeof item.reason!=='string'||item.reason.length>160||!Number.isFinite(item.recordedAt)||item.recordedAt<0)throw new Error('Invalid pending inference checkpoint');
        }
      }
      if (data.routineRecent !== undefined && (!Array.isArray(data.routineRecent) || data.routineRecent.length > (session.world.hasTownEconomy ? offlineTownLimits.perMinute : 6) || data.routineRecent.some(time => !Number.isFinite(time) || time < 0 || time > session.world.time))) throw new Error('Invalid routine accounting checkpoint');
      if (data.routineRequests!==undefined && (!Number.isSafeInteger(data.routineRequests) || data.routineRequests<0 || !options.operating && data.routineRequests>offlineTownLimits.maximumDecisions)) throw new Error('Invalid routine allowance');
      if (data.requests > session.maximumRequests || data.recent.length > 6 || data.recent.some(time => !Number.isFinite(time) || time < 0) || !options.operating && Object.keys(data.receipts).length > 512 || Object.values(data.receipts).some(receipt => !receipt || !/^[a-f0-9]{64}$/.test(receipt.hash) || !['pending','done','failed'].includes(receipt.status)) || Object.entries(data.last).some(([id, time]) => !npcIds.includes(id as NpcId) || !time || !Number.isFinite(time.wall) || !Number.isFinite(time.simulation) || time.simulation < 0) || data.metrics.length > (options.operating?200:session.maximumRequests) || (data.plan !== null && (!data.plan || !/^[\w-]{1,80}$/.test(data.plan.id) || !Number.isSafeInteger(data.plan.used) || data.plan.used < 0 || data.plan.used > (options.plan?.phase==='7g-d-society'?200:options.plan?.phase==='7g-d-context'?48:options.plan?.phase==='7g-c-unity'?36:12) || !Number.isFinite(data.plan.reservedUsd) || data.plan.reservedUsd < 0 || data.plan.reservedUsd > (options.plan?.phase==='7g-d-society'?5:options.plan?.phase==='7g-d-context'?.90:options.plan?.phase==='7g-c-unity'?.60:.25)))) throw new Error('Invalid server accounting checkpoint');
      for (const id of npcIds) if (!Array.isArray(data.history[id]) || data.history[id].length > 12) throw new Error('Invalid conversation checkpoint');
      if (JSON.parse(data.world).version === 1) {
        // Keep an exclusive rollback copy before upgrading an existing operator world.
        try { const backup = await open(options.checkpoint + '.v1-backup', 'wx', 0o600); try { await backup.writeFile(JSON.stringify(data)); await backup.sync(); } finally { await backup.close(); } }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
        session.world.addResident(chrisResident());
        data.history.chris = [];
      }
      session.data = data;
      if(options.operating&&data.plan){
        if(data.legacyPlan)throw new Error('Legacy plan history already exists; reviewed recovery required');
        data.legacyPlan=structuredClone(data.plan);data.plan=null;
      }
      if (options.townPopulation!==false && !options.initialWorld) {
        const residents=townResidents(options.townPopulation ?? prototypePopulation);
        if (!session.world.hasTownEconomy || residents.some(npc=>!session.world.hasResident(npc.id))) {
          try { const backup=await open(options.checkpoint+'.pre-7b-backup','wx',0o600); try { await backup.writeFile(savedText); await backup.sync(); } finally { await backup.close(); } }
          catch(error) { if ((error as NodeJS.ErrnoException).code!=='EEXIST') throw error; }
          session.world.enableTown(residents);
          for (const id of session.world.residentIds) data.history[id] ??= [];
        }
      }
      for (const receipt of Object.values(data.receipts)) if (receipt.status === 'pending') { receipt.status = 'failed'; receipt.value = 'Interrupted by restart; request will not be repeated'; }
    } catch (error) {
      if (loaded || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      session.world = options.initialWorld ? Neighbourhood.restore(options.initialWorld) : options.townPopulation===false ? new Neighbourhood(`server-${randomUUID()}`) : createTown(`server-${randomUUID()}`,options.townPopulation ?? prototypePopulation,{map:options.townMap ?? 'town-v1'});
      session.data = { version: 1, sessionId: randomUUID(), sequence: 0, world: '', paused: false, speed: 2, requests: 0, recent: [], last: {}, receipts: {}, history: Object.fromEntries(session.world.residentIds.map(id => [id, []])), metrics: [], plan: null };
    }
    if (options.operating) {
      if (!session.data.operating) {
        try {
          const prior=await readFile(options.checkpoint,'utf8');
          Neighbourhood.restore(JSON.parse(prior).world);
          const backupPath=options.checkpoint+'.pre-local-muse-'+randomUUID()+'.backup';
          const backup=await open(backupPath,'wx',0o600);
          try {await backup.writeFile(prior);await backup.sync();}finally{await backup.close();}
          if(await readFile(backupPath,'utf8')!==prior)throw new Error('Operating migration rollback verification failed');
        } catch(error) {if(loaded||(error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
        session.world.enableSocialVisits();session.data.operating=true;
      }
      if(JSON.stringify(session.world.residentIds)!==JSON.stringify(townResidents(16).map(n=>n.id)) || !session.world.snapshot.socialVisits)throw new Error('Persistent Muse operation requires all sixteen residents and social continuity');
      Neighbourhood.restore(session.world.serialize()); // Verify the migrated snapshot before atomic commit.
      if(Object.keys(session.data.interruptedDecisions??{}).length)session.data.paused=true;
    }
    if (options.plan) {
      if (session.data.plan && session.data.plan.id !== options.plan.id) throw new Error('Different live plan requires reviewed session migration');
      if(session.data.plan&&(session.data.plan.profile==='7g-d-society')!==(options.plan.phase==='7g-d-society'))throw new Error('Different live profile requires a new isolated session');
      if(session.data.plan?.profile==='7g-d-society'&&(session.data.plan.inferenceTimeoutMs ?? 20000)!==(options.plan.inferenceTimeoutMs ?? 20000))throw new Error('Different inference deadline requires a new isolated session');
      if(session.data.plan?.profile==='7g-d-society'&&session.data.plan.inputTokenLimit!==8000)throw new Error('Mismatched persisted token reservation profile');
      session.data.plan ??= { id: options.plan.id, used: 0, reservedUsd: 0,...(options.plan.phase==='7g-d-society'?{profile:'7g-d-society' as const,inputTokenLimit:8000 as const,inferenceTimeoutMs:options.plan.inferenceTimeoutMs ?? 20000}:{}) };
      if(options.plan.phase==='7g-d-society'&&(!session.world.snapshot.socialVisits||JSON.stringify(session.world.residentIds)!==JSON.stringify(options.plan.residents)))throw new Error('Muse society requires the normal sixteen-resident social town');
    }
    if(session.world.hasTownEconomy && options.townMap!=='legacy-v1' && session.world.mapId!=='town-v1') {
      try {const prior=await readFile(options.checkpoint,'utf8'),backup=await open(options.checkpoint+'.pre-7e-backup','wx',0o600);try{await backup.writeFile(prior);await backup.sync();}finally{await backup.close();}}
      catch(error){if(!['ENOENT','EEXIST'].includes((error as NodeJS.ErrnoException).code ?? ''))throw error;}
      session.world.upgradeTownMap();
    }
    if(session.world.hasTownEconomy && !session.world.snapshot.communication) {
      // Retain the original durable world before adding contacts and new capabilities.
      try {
        const prior=await readFile(options.checkpoint,'utf8');
        const backup=await open(options.checkpoint+'.pre-7d-backup','wx',0o600);
        try {await backup.writeFile(prior);await backup.sync();}finally{await backup.close();}
      } catch(error){if(!['ENOENT','EEXIST'].includes((error as NodeJS.ErrnoException).code ?? ''))throw error;}
      session.world.enableCommunications();
    }
    if (session.data.progression === undefined) session.data.progression = { used: 0, limit: 1800, cursor: 0 };
    const progression = session.data.progression;
    if (!progression || !Number.isFinite(progression.used) || progression.used < 0 || progression.used > progression.limit || progression.limit !== 1800 || !Number.isSafeInteger(progression.cursor) || progression.cursor < 0) throw new Error('Invalid progression checkpoint');
    session.cursor = progression.cursor;
    if (session.boundedTown && (progression.used >= progression.limit || session.world.hasTownEconomy && (session.data.routineRequests ?? 0) >= offlineTownLimits.maximumDecisions)) session.data.paused = true;
    if (session.provider.mode === 'live-meta') session.data.speed = 1;
    await session.commit(); return session;
  }
  private now(): number { return (this.options.now ?? Date.now)(); }
  private async suspendInference(reason?:string):Promise<void>{
    try{await this.options.operating!.suspend(reason);}catch{this.failed=true;throw new SessionError(503,'Inference suspension could not be saved; session stopped for review');}
  }
  private get reservationUsd():number{return generationReservation(this.options.plan?.inputTokenLimit ?? 6000);}
  private get maximumRequests():number{if(this.options.operating)return Number.MAX_SAFE_INTEGER;return this.options.plan?.phase==='7g-d-society'?200:48;}
  get interruptions(){return Object.entries(this.data.interruptedDecisions ?? {}).map(([actorId,item])=>({actorId,requestId:item.request.id,reason:item.reason,recordedAt:item.recordedAt}));}
  get frame(): NeighbourhoodFrame { return structuredClone(this.current); }
  hasResident(id: string): boolean { return this.world.hasResident(id); }
  get mode(): 'mock' | 'live-meta' { return this.provider.mode; }
  // Local operation and explicitly approved society experiments run autonomously
  // without observers. Legacy live demonstrations retain their observer gate.
  get advancesWithoutObserver():boolean {return !!this.options.operating||this.mode==='mock'||this.options.plan?.phase==='7g-d-society'&&this.options.plan.allowAutonomy;}
  get paused(): boolean { return this.data.paused; }
  invalidatePending():void {this.epoch++;}
  async refreshOperations():Promise<void>{
    if(!this.options.operating)return;
    await this.transaction(async()=>{
      const status=await this.options.operating!.refresh();
      if(JSON.stringify(status)!==JSON.stringify(this.current.muse))await this.commit();
    });
  }
  private get boundedTown():boolean { return !this.options.operating && (this.mode==='mock' || this.provider.routineDecisions===true); }
  get operational():boolean{return !this.failed && !this.closed;}
  history(id: NpcId): ConversationTurn[] { if (this.failed) throw new SessionError(503, 'Session unavailable'); if (!this.hasResident(id)) throw new SessionError(400, 'Unknown resident'); return structuredClone(this.committedHistory[id] ?? []); }
  subscribe(listener: (frame: NeighbourhoodFrame) => void): () => void { this.listeners.add(listener); listener(this.frame); return () => this.listeners.delete(listener); }
  private transaction<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => { if (this.closed || this.failed) throw new SessionError(503, 'Session unavailable'); return work(); });
    this.tail = result.catch(() => {}); return result;
  }
  private async commit(): Promise<void> {
    this.data.sequence++; this.data.world = this.world.serialize();
    if (this.data.progression) this.data.progression.cursor = this.cursor;
    const temporary = `${this.options.checkpoint}.${randomUUID()}.pending`;
    let stage='create';
    try {
      const file = await open(temporary, 'wx', 0o600);
      try { stage='write';await file.writeFile(JSON.stringify(this.data));stage='sync'; await file.sync(); } finally { await file.close(); }
      stage='replace';
      await replaceCheckpoint(temporary, this.options.checkpoint);
    } catch(error) { this.failed = true;const code=(error as NodeJS.ErrnoException).code;throw new SessionError(503, `Checkpoint write failed${code?` (${code}, ${stage})`:''}; session stopped`); }
    const projection = projectNeighbourhood(this.world.snapshot);
    this.committedHistory = structuredClone(this.data.history);
    this.current = { version: 2, sessionId: this.data.sessionId, sequence: this.data.sequence, mode: this.provider.mode, paused: this.data.paused, speed: this.data.speed, conversationAvailable: true, decisionBudget: this.mode==='mock' && this.world.hasTownEconomy ? {used:this.data.routineRequests ?? 0,limit:offlineTownLimits.maximumDecisions} : { used: this.data.requests, limit: this.maximumRequests }, ...projection };
    if (this.boundedTown) this.current.progression = { used: this.data.progression!.used, limit: this.data.progression!.limit, stopped: this.data.progression!.used >= this.data.progression!.limit };
    if(this.options.operating){this.current.muse=this.options.operating.status;this.current.stoppedDecisions=this.interruptions;}
    for (const listener of this.listeners) listener(this.frame);
  }
  private receipt(id: string, payload: unknown): Receipt | null {
    if (!/^[\w:-]{1,120}$/.test(id)) throw new SessionError(400, 'Invalid request identifier');
    const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const old = this.data.receipts[id];
    if (old) {
      if (old.hash !== hash) throw new SessionError(409, 'Request identifier collision');
      if (old.status !== 'done') throw new SessionError(409, 'Request pending or failed; it will not be retried');
      return old;
    }
    // Fail closed instead of evicting deduplication evidence from this controlled session.
    if (!this.options.operating && Object.keys(this.data.receipts).length >= 512) throw new SessionError(429, 'Session interaction limit reached');
    this.data.receipts[id] = { hash, status: 'pending', value: null }; return null;
  }
  private requireWorld(id: string): void { if (id !== this.world.id) throw new SessionError(409, 'World changed'); }
  phone(actorId:string):PhoneView {if(this.failed || this.closed)throw new SessionError(503,'Session unavailable');try{return projectPhone(this.world,actorId,this.data.paused,this.phoneControl.status(this.world.id));}catch{throw new SessionError(400,'Phone unavailable for this resident');}}
  async controlPhone(input:PhoneControlInput):Promise<PhoneLease|null> {
    return this.transaction(async()=>{
      this.requireWorld(input.worldId);let lease:PhoneLease|null;
      try{lease=this.phoneControl.change(this.world,input);}catch(error){throw new SessionError(409,(error as Error).message);}
      if(input.operation==='acquire')for(const [id,proposal]of this.proposals)if(proposal.request.actorId===input.actorId){this.world.abandonDecision(proposal.request.id);this.proposals.delete(id);}
      if(input.operation!=='renew')await this.commit();return lease;
    });
  }
  async phoneAction(input:PhoneActionInput):Promise<CommandReceipt> {
    return this.transaction(async()=>{
      this.requireWorld(input.worldId);if(Object.hasOwn(this.data.receipts,input.id)){const old=this.receipt(input.id,input);if(old)return old.value as CommandReceipt;}
      if(!this.phoneControl.owns(this.world.id,input.actorId,input.leaseId))throw new SessionError(409,'Phone control expired or belongs to another observer');
      this.receipt(input.id,input);
      const outcome=this.data.paused?{accepted:false,reason:'The town is paused'}:this.world.applyPhoneAction(input.actorId,input.action);
      const value={accepted:outcome.accepted,reason:outcome.reason};Object.assign(this.data.receipts[input.id]!,{status:'done',value});await this.commit();return value;
    });
  }
  private async reserveRequest(id: NpcId, routine = false): Promise<void> {
    const now = this.now(); this.data.recent = this.data.recent.filter(time => time > now - 60_000);
    // Only deterministic autonomous mock mechanics use simulation-time scheduling.
    // Conversations and EVERY live request retain the original wall-clock safeguards.
    routine = routine && (this.boundedTown || !!this.options.operating);
    const simulation = this.world.time;
    const townRoutine=routine && this.world.hasTownEconomy;
    this.data.routineRecent = (this.data.routineRecent ?? []).filter(time => time > simulation - 60);
    if (this.busy) throw new SessionError(409, 'A decision is already pending');
    if ((townRoutine ? !this.options.operating && (this.data.routineRequests ?? 0)>=offlineTownLimits.maximumDecisions : this.data.requests >= this.maximumRequests) || (routine ? this.data.routineRecent.length >= (townRoutine ? offlineTownLimits.perMinute : 6) : this.data.recent.length >= 6 || now - (this.data.last[id]?.wall ?? -Infinity) < 3000)) throw new SessionError(429, 'Decision limit or cooldown reached');
    if (this.mode === 'live-meta' && !routine) {
      if(this.options.operating){const status=await this.options.operating.refresh();if(!status.available)throw new SessionError(429,status.status);}else{
      const plan = this.options.plan!; validateLivePlan(plan);
      const used = this.data.plan!;
      if (used.used >= plan.maxGenerations || used.reservedUsd + this.reservationUsd > plan.maxEstimatedUsd) throw new SessionError(429, 'Approved evaluation allowance exhausted');
      used.used++; used.reservedUsd = plan.phase==='7g-d-society'?(Math.round(used.reservedUsd*1_000_000)+Math.round(this.reservationUsd*1_000_000))/1_000_000:used.reservedUsd+this.reservationUsd;
      }
    }
    if (townRoutine) this.data.routineRequests=(this.data.routineRequests ?? 0)+1; else this.data.requests++;
    if (routine) this.data.routineRecent.push(simulation); else this.data.recent.push(now);
    this.data.last[id] = { wall: now, simulation, worldId: this.world.id }; this.busy = true;
  }
  async command(command: SessionCommand): Promise<CommandReceipt> {
    return this.transaction(async () => {
      this.requireWorld(command.worldId); const old = this.receipt(command.id, command); if (old) return old.value as CommandReceipt;
      if(command.type==='inference-stop') {
        if(!this.options.operating)throw new SessionError(400,'Local operating policy unavailable');
        await this.suspendInference();this.epoch++;
      } else if(command.type==='review-inference') {
        if(!this.options.operating || !this.data.paused || this.busy)throw new SessionError(409,'Pause and wait for inference to settle before review');
        for(const item of Object.values(this.data.interruptedDecisions??{}))this.world.abandonDecision(item.request.id);
        this.data.interruptedDecisions={};this.epoch++;
      } else if (command.type === 'pause') {
        if(!command.paused&&this.options.operating&&this.interruptions.length)throw new SessionError(409,'Review and acknowledge interrupted Muse decisions before resuming');
        if (!command.paused && this.boundedTown && (this.data.progression!.used >= this.data.progression!.limit || this.world.hasTownEconomy && (this.data.routineRequests ?? 0) >= offlineTownLimits.maximumDecisions)) throw new SessionError(429, 'Controlled advancement or decision allowance exhausted; reset and restart do not replenish it');
        this.data.paused = command.paused; this.epoch++;
      }
      else if (command.type === 'speed') {
        if (this.mode === 'live-meta' && command.speed !== 1) throw new SessionError(400, 'Live evaluation uses normal time');
        this.data.speed = command.speed;
      } else if (command.type === 'road') {
        const accepted = this.world.setRoadBlocked(command.edgeId, command.blocked);
        const value = { accepted, reason: accepted ? 'accepted' : 'Road unchanged, invalid or currently occupied' };
        Object.assign(this.data.receipts[command.id]!, { status: 'done', value }); await this.commit(); return value;
      } else {
        if(this.interruptions.length)throw new SessionError(409,'Pending Muse decisions require manual review before any reset');
        if(this.options.operating)throw new SessionError(409,'Persistent society cannot be reset; preserve its checkpoint');
        if(this.options.plan?.phase==='7g-d-society')throw new SessionError(409,'Muse society resets require a fresh isolated approved session');
        this.world = this.options.townPopulation===false || this.options.initialWorld && !this.world.hasTownEconomy ? new Neighbourhood(`server-${randomUUID()}`) : createTown(`server-${randomUUID()}`,this.options.townPopulation || prototypePopulation,{map:this.options.townMap ?? 'town-v1'}); this.proposals.clear(); this.epoch++;
        this.data.routineRecent = [];
        this.data.history = Object.fromEntries(this.world.residentIds.map(id => [id, []])); this.data.paused = this.boundedTown && (this.data.progression!.used >= this.data.progression!.limit || this.world.hasTownEconomy && (this.data.routineRequests ?? 0) >= offlineTownLimits.maximumDecisions);
        if (this.mode === 'mock') this.provider = mockExperiment(command.experiment);
        // Spending, request counters, wall cooldowns, and receipt history NEVER reset.
      }
      const value = { accepted: true, reason: 'accepted' }; Object.assign(this.data.receipts[command.id]!, { status: 'done', value }); await this.commit(); return value;
    });
  }
  async tick(seconds: number): Promise<void> {
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60) throw new SessionError(400, 'Clock step must be between zero and sixty real seconds');
    await this.transaction(async () => {
      await this.options.operating?.refresh();
      for (const [id, proposal] of this.proposals) if (proposal.expires < this.now()) { this.world.abandonDecision(proposal.request.id); this.proposals.delete(id); }
      if (this.boundedTown && this.world.hasTownEconomy && (this.data.routineRequests ?? 0) >= offlineTownLimits.maximumDecisions && !this.data.paused) { this.data.paused = true; await this.commit(); }
      if (!this.data.paused) {
        const progression = this.data.progression!;
        const advance = this.boundedTown ? Math.min(seconds * this.data.speed, progression.limit - progression.used) : seconds * this.data.speed;
        for (let remaining = advance; remaining > 0.000001;) { const step=Math.min(60,remaining); this.world.advance(step); remaining-=step; }
        if (this.boundedTown) { progression.used += advance; if (progression.used >= progression.limit) this.data.paused = true; }
        await this.commit();
      }
    });
  }
  async decide(actorId?: NpcId, triggerOnly = false): Promise<void> {
    let request: NpcDecisionRequest | null = null; let origin: Neighbourhood; let epoch = 0;let controlGeneration=0,expectedMuse=false;
    await this.transaction(async () => {
      if (this.data.paused || this.busy) return;
      if (!actorId && this.mode === 'live-meta' && !this.options.operating && !this.options.plan?.allowAutonomy) return;
      const npcIds = this.world.residentIds;
      if(actorId && this.provider.sourceFor)throw new SessionError(400,'Selective reasoning uses autonomous opportunities, not forced resident decisions');
      if (actorId && !this.hasResident(actorId)) throw new SessionError(400, 'Unknown resident');
      const candidates=actorId?[actorId]:npcIds.map((_,i)=>npcIds[(this.cursor+i)%npcIds.length]!);
      if(!actorId && this.provider.priorityFor){
        const priorities=new Map(candidates.map(id=>[id,this.provider.priorityFor!(this.world.observe(id),this.world.decisionTriggers(id))]));
        candidates.sort((a,b)=>priorities.get(b)!-priorities.get(a)!);
      }
      for (const id of candidates) {
        if(!actorId)this.cursor++;
        if(this.phoneControl.controlled(this.world.id,id))continue;
        if(this.data.interruptedDecisions?.[id])continue;
        const previousLast = this.data.last[id];
        if (!actorId && (previousLast?.worldId === undefined || previousLast.worldId === this.world.id) && this.world.time - (previousLast?.simulation ?? -Infinity) < 20) continue;
        const source=this.provider.sourceFor?.(this.world.observe(id),this.world.decisionTriggers(id)) ?? this.mode;
        const routine=!actorId && source==='mock';
        try { await this.reserveRequest(id, routine); } catch (error) { if (actorId) throw error; continue; }
        request = actorId && !triggerOnly ? this.world.requestInteractionDecision(id) : this.world.requestDecision(id);
        if (!request) { this.busy = false; if (routine && this.world.hasTownEconomy) this.data.routineRequests!--; else this.data.requests--; if (routine) this.data.routineRecent!.pop(); else this.data.recent.pop(); if (previousLast) this.data.last[id] = previousLast; else delete this.data.last[id]; if (this.mode === 'live-meta' && !routine && !this.options.operating) { this.data.plan!.used--; this.data.plan!.reservedUsd -= this.reservationUsd; } continue; }
        expectedMuse=source==='live-meta';
        if(expectedMuse&&this.options.operating){this.data.interruptedDecisions??={};this.data.interruptedDecisions[id]={request:structuredClone(request),reason:'Inference pending at checkpoint; interrupted results are never replayed.',recordedAt:this.now()};}
        origin = this.world; epoch = this.epoch;controlGeneration=this.phoneControl.generation(id); await this.commit(); return;
      }
    });
    if (!request) return;
    const pending = request as NpcDecisionRequest;
    try {
      const result = await this.provider.decide(pending);
      if(expectedMuse&&result.mode!=='meta')throw new Error('Muse decision expected; offline substitution refused');
      await this.transaction(async () => {
        if(this.options.operating){await this.options.operating.refresh();delete this.data.interruptedDecisions?.[pending.actorId];}
        if (origin! !== this.world || this.data.paused || epoch !== this.epoch || controlGeneration!==this.phoneControl.generation(pending.actorId) || expectedMuse && this.options.operating && !this.options.operating.status.enabled) origin!.abandonDecision(pending.id);
        else {
          const outcome=this.world.applyDecision(pending.id, result.decision, { mode: result.mode, model: result.model });
          if(expectedMuse&&this.options.operating&&!outcome.accepted&&!ordinaryRejection(outcome.reason)) {
            await this.suspendInference('Muse proposal failed validation; inspect recorded events before reauthorizing');this.data.paused=true;this.epoch++;
          }
        }
        this.captureMetrics(pending.id, pending.actorId); await this.commit();
      });
    } catch (error) {
      if(this.failed)throw error;
      await this.transaction(async () => {
        if (origin! === this.world){
          if(expectedMuse&&(this.options.operating||this.options.plan?.phase==='7g-d-society')){
            if(this.options.operating){await this.suspendInference('Muse inference failed; inspect stopped decisions and credentials/ledger before reauthorizing');this.data.paused=true;this.epoch++;}
            this.data.interruptedDecisions ??={};
            this.data.interruptedDecisions[pending.actorId]={request:structuredClone(pending),reason:'Muse inference interrupted; pending decision retained without retry.',recordedAt:this.now()};
            this.world.interruptDecision(pending.id);
          }else this.world.abandonDecision(pending.id);
        }
        this.captureMetrics(pending.id, pending.actorId); await this.commit();
      });
    } finally { this.busy = false; }
  }
  private captureMetrics(requestId: string, actorId: NpcId): void { if (this.provider.metrics) this.data.metrics = [...this.data.metrics, { ...this.provider.metrics, requestId, actorId, recordedAt: this.now() }].slice(-(this.options.operating?200:this.maximumRequests)); }
  async converse(input: ConversationInput): Promise<ConversationResult> {
    let oldResult: ConversationResult | null = null; let revision = 0; let origin!: Neighbourhood; let epoch = 0;
    let context!: Parameters<NeighbourhoodProvider['converse']>[0];
    await this.transaction(async () => {
      if(this.options.operating&&this.data.paused)throw new SessionError(409,'Resume the society before requesting Muse conversation');
      this.requireWorld(input.worldId); if (!this.hasResident(input.actorId)) throw new SessionError(400, 'Unknown resident');if(this.phoneControl.controlled(this.world.id,input.actorId))throw new SessionError(409,'Release phone control before requesting another inference'); const old = this.receipt(input.id, input); if (old) { oldResult = old.value as ConversationResult; return; }
      await this.reserveRequest(input.actorId);
      for (const [id, proposal] of this.proposals) if (proposal.request.actorId === input.actorId) { this.world.abandonDecision(proposal.request.id); this.proposals.delete(id); }
      this.world.recordConversation(input.actorId, 'player', input.message);
      this.data.history[input.actorId]!.push({ speaker: 'player', text: input.message, mode: this.mode });
      this.data.history[input.actorId]! = this.data.history[input.actorId]!.slice(-12);
      context = { observation: this.world.observe(input.actorId, input.message), message: input.message, history: structuredClone(this.data.history[input.actorId]!.slice(-6)) };
      revision = context.observation.actor.revision; origin = this.world; epoch = this.epoch; await this.commit();
    });
    if (oldResult) return oldResult;
    try {
      const response = await this.provider.converse(context); validateConversation(response, context);
      await this.options.operating?.refresh();
      return await this.transaction(async () => {
        if (origin !== this.world || this.options.operating && (this.data.paused || !this.options.operating.status.enabled) || epoch !== this.epoch || this.world.observe(input.actorId).actor.revision !== revision) throw new SessionError(409, 'Character state changed during conversation');
        this.world.recordConversation(input.actorId, 'npc', response.reply);
        this.data.history[input.actorId]!.push({ speaker: 'npc', text: response.reply, mode: this.mode }); this.data.history[input.actorId]! = this.data.history[input.actorId]!.slice(-12);
        let proposalId: string | null = null;
        if (response.proposedDecision && !this.data.paused) {
          const request = this.world.requestInteractionDecision(input.actorId);
          if (request) { proposalId = randomUUID(); this.proposals.set(proposalId, { request, decision: response.proposedDecision, expires: this.now() + 60_000 }); }
        }
        const value: ConversationResult = { mode: this.mode, reply: response.reply, proposalId };
        Object.assign(this.data.receipts[input.id]!, { status: 'done', value }); this.captureMetrics(input.id, input.actorId); await this.commit(); return value;
      });
    } catch (error) {
      if(this.failed)throw error;
      await this.transaction(async () => { if(this.options.operating){await this.suspendInference('Muse conversation failed; inspect credentials and spending ledgers before reauthorizing');this.data.paused=true;this.epoch++;} Object.assign(this.data.receipts[input.id]!, { status: 'failed', value: 'Inference unavailable; no action executed' }); this.captureMetrics(input.id, input.actorId); await this.commit(); });
      throw error instanceof SessionError ? error : new SessionError(502, 'Inference unavailable; no mock substitution or retry');
    } finally { this.busy = false; }
  }
  async confirm(input: { id: string; worldId: string; proposalId: string }): Promise<CommandReceipt> {
    return this.transaction(async () => {
      this.requireWorld(input.worldId); const old = this.receipt(input.id, input); if (old) return old.value as CommandReceipt;
      const proposal = this.proposals.get(input.proposalId); this.proposals.delete(input.proposalId);
      if (!proposal || proposal.expires < this.now() || this.data.paused) throw new SessionError(409, 'Proposal expired, unavailable or paused');
      const outcome = this.world.applyDecision(proposal.request.id, proposal.decision, { mode: this.mode === 'mock' ? 'mock' : 'meta', model: this.mode === 'mock' ? 'mock-fixture' : 'muse-spark-1.3' });
      const value = { accepted: outcome.accepted, reason: outcome.reason }; Object.assign(this.data.receipts[input.id]!, { status: 'done', value }); await this.commit(); return value;
    });
  }
  async close(): Promise<void> { this.epoch++;this.closed=true;await this.tail; this.listeners.clear(); }
}
type ConstructorParametersInternal = { operating?: LocalMusePolicy; checkpoint: string; provider?: NeighbourhoodProvider; plan?: LivePlan; now?: () => number; initialWorld?: string; townPopulation?: false | 8 | 16;townMap?:MapId };
function mockExperiment(experiment: Experiment): NeighbourhoodProvider {
  return new MockNeighbourhoodProvider(new NeighbourhoodMockProvider({ trader: experiment === 'cooperate' || experiment === 'decline' ? 'cooperate' : experiment, driver: experiment === 'decline' ? 'decline' : 'accept' }));
}
