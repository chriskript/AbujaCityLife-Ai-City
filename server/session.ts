import { randomUUID, createHash } from 'node:crypto';
import { mkdir, open, readFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { npcIds, type NpcId, type NpcDecisionRequest } from '../shared/neighbourhood/types.js';
import { projectNeighbourhood, type NeighbourhoodFrame, type SessionCommand, type CommandReceipt, type Experiment } from '../shared/neighbourhood/presentation.js';
import type { ConversationInput, ConversationResult, ConversationTurn, GenerationMetrics } from '../shared/neighbourhood/conversation.js';
import { NeighbourhoodMockProvider } from '../shared/neighbourhood/mock-provider.js';
import { MockNeighbourhoodProvider, maximumGenerationUsd, validateConversation, type NeighbourhoodProvider } from './inference/neighbourhood-provider.js';

export class SessionError extends Error { constructor(readonly status: number, message: string) { super(message); } }
interface Receipt { hash: string; status: 'pending' | 'done' | 'failed'; value: unknown }
interface Checkpoint {
  version: 1; sessionId: string; sequence: number; world: string; paused: boolean; speed: 1 | 2 | 4;
  requests: number; recent: number[]; last: Partial<Record<NpcId, { wall: number; simulation: number }>>;
  receipts: Record<string, Receipt>; history: Record<NpcId, ConversationTurn[]>;
  metrics: (GenerationMetrics & { requestId: string; actorId: NpcId; recordedAt: number })[]; plan: { id: string; used: number; reservedUsd: number } | null;
}
export interface LivePlan { id: string; approved: true; expiresAt: string; maxGenerations: number; maxEstimatedUsd: number; allowAutonomy: boolean }
export function validateLivePlan(value: unknown): asserts value is LivePlan {
  const p = value as LivePlan;
  if (!p || p.approved !== true || !/^[\w-]{1,80}$/.test(p.id) || !Number.isFinite(Date.parse(p.expiresAt)) || Date.parse(p.expiresAt) <= Date.now() || !Number.isSafeInteger(p.maxGenerations) || p.maxGenerations < 1 || p.maxGenerations > 12 || !Number.isFinite(p.maxEstimatedUsd) || p.maxEstimatedUsd < maximumGenerationUsd || p.maxEstimatedUsd > .25 || typeof p.allowAutonomy !== 'boolean') throw new Error('A valid separately approved live evaluation plan is required');
}
export class NeighbourhoodServerSession {
  private world!: Neighbourhood;
  private data!: Checkpoint;
  private current!: NeighbourhoodFrame;
  private committedHistory: Record<NpcId, ConversationTurn[]> = { musa: [], amina: [], zainab: [] };
  private tail: Promise<unknown> = Promise.resolve();
  private busy = false; private failed = false; private closed = false; private cursor = 0; private epoch = 0;
  private proposals = new Map<string, { request: NpcDecisionRequest; decision: unknown; expires: number }>();
  private listeners = new Set<(frame: NeighbourhoodFrame) => void>();
  private provider: NeighbourhoodProvider;
  private constructor(private readonly options: { checkpoint: string; provider?: NeighbourhoodProvider; plan?: LivePlan; now?: () => number }) { this.provider = options.provider ?? new MockNeighbourhoodProvider(); }
  static async open(options: ConstructorParametersInternal): Promise<NeighbourhoodServerSession> {
    const session = new NeighbourhoodServerSession(options);
    if (session.provider.mode === 'live-meta') validateLivePlan(options.plan);
    await mkdir(dirname(options.checkpoint), { recursive: true });
    try {
      const data = JSON.parse(await readFile(options.checkpoint, 'utf8')) as Checkpoint;
      if (data.version !== 1 || typeof data.sessionId !== 'string' || !Number.isSafeInteger(data.sequence) || data.sequence < 0 || !Number.isSafeInteger(data.requests) || data.requests < 0 || !Array.isArray(data.recent) || !data.last || !data.history || !data.receipts || !Array.isArray(data.metrics) || typeof data.paused !== 'boolean' || ![1,2,4].includes(data.speed)) throw new Error('Invalid server checkpoint');
      if (data.requests > 48 || data.recent.length > 6 || data.recent.some(time => !Number.isFinite(time) || time < 0) || Object.keys(data.receipts).length > 512 || Object.values(data.receipts).some(receipt => !receipt || !/^[a-f0-9]{64}$/.test(receipt.hash) || !['pending','done','failed'].includes(receipt.status)) || Object.entries(data.last).some(([id, time]) => !npcIds.includes(id as NpcId) || !time || !Number.isFinite(time.wall) || !Number.isFinite(time.simulation) || time.simulation < 0) || data.metrics.length > 48 || (data.plan !== null && (!data.plan || !/^[\w-]{1,80}$/.test(data.plan.id) || !Number.isSafeInteger(data.plan.used) || data.plan.used < 0 || data.plan.used > 12 || !Number.isFinite(data.plan.reservedUsd) || data.plan.reservedUsd < 0 || data.plan.reservedUsd > .25))) throw new Error('Invalid server accounting checkpoint');
      for (const id of npcIds) if (!Array.isArray(data.history[id]) || data.history[id].length > 12) throw new Error('Invalid conversation checkpoint');
      session.world = Neighbourhood.restore(data.world); session.data = data;
      for (const receipt of Object.values(data.receipts)) if (receipt.status === 'pending') { receipt.status = 'failed'; receipt.value = 'Interrupted by restart; request will not be repeated'; }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      session.world = new Neighbourhood(`server-${randomUUID()}`);
      session.data = { version: 1, sessionId: randomUUID(), sequence: 0, world: '', paused: false, speed: 2, requests: 0, recent: [], last: {}, receipts: {}, history: { musa: [], amina: [], zainab: [] }, metrics: [], plan: null };
    }
    if (options.plan) {
      if (session.data.plan && session.data.plan.id !== options.plan.id) throw new Error('Different live plan requires reviewed session migration');
      session.data.plan ??= { id: options.plan.id, used: 0, reservedUsd: 0 };
    }
    if (session.provider.mode === 'live-meta') session.data.speed = 1;
    await session.commit(); return session;
  }
  private now(): number { return (this.options.now ?? Date.now)(); }
  get frame(): NeighbourhoodFrame { return structuredClone(this.current); }
  get mode(): 'mock' | 'live-meta' { return this.provider.mode; }
  history(id: NpcId): ConversationTurn[] { if (this.failed) throw new SessionError(503, 'Session unavailable'); return structuredClone(this.committedHistory[id]); }
  subscribe(listener: (frame: NeighbourhoodFrame) => void): () => void { this.listeners.add(listener); listener(this.frame); return () => this.listeners.delete(listener); }
  private transaction<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => { if (this.closed || this.failed) throw new SessionError(503, 'Session unavailable'); return work(); });
    this.tail = result.catch(() => {}); return result;
  }
  private async commit(): Promise<void> {
    this.data.sequence++; this.data.world = this.world.serialize();
    const temporary = `${this.options.checkpoint}.${randomUUID()}.pending`;
    try {
      const file = await open(temporary, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify(this.data)); await file.sync(); } finally { await file.close(); }
      await rename(temporary, this.options.checkpoint);
    } catch { this.failed = true; throw new SessionError(503, 'Checkpoint write failed; session stopped'); }
    const projection = projectNeighbourhood(this.world.snapshot);
    this.committedHistory = structuredClone(this.data.history);
    this.current = { version: 1, sessionId: this.data.sessionId, sequence: this.data.sequence, mode: this.provider.mode, paused: this.data.paused, speed: this.data.speed, conversationAvailable: true, decisionBudget: { used: this.data.requests, limit: 48 }, ...projection };
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
    if (Object.keys(this.data.receipts).length >= 512) throw new SessionError(429, 'Session interaction limit reached');
    this.data.receipts[id] = { hash, status: 'pending', value: null }; return null;
  }
  private requireWorld(id: string): void { if (id !== this.world.snapshot.id) throw new SessionError(409, 'World changed'); }
  private reserveRequest(id: NpcId): void {
    const now = this.now(); this.data.recent = this.data.recent.filter(time => time > now - 60_000);
    if (this.busy) throw new SessionError(409, 'A decision is already pending');
    if (this.data.requests >= 48 || this.data.recent.length >= 6 || now - (this.data.last[id]?.wall ?? -Infinity) < 3000) throw new SessionError(429, 'Decision limit or cooldown reached');
    if (this.mode === 'live-meta') {
      const plan = this.options.plan!; validateLivePlan(plan);
      const used = this.data.plan!;
      if (used.used >= plan.maxGenerations || used.reservedUsd + maximumGenerationUsd > plan.maxEstimatedUsd) throw new SessionError(429, 'Approved evaluation allowance exhausted');
      used.used++; used.reservedUsd += maximumGenerationUsd;
    }
    this.data.requests++; this.data.recent.push(now); this.data.last[id] = { wall: now, simulation: this.world.snapshot.time }; this.busy = true;
  }
  async command(command: SessionCommand): Promise<CommandReceipt> {
    return this.transaction(async () => {
      this.requireWorld(command.worldId); const old = this.receipt(command.id, command); if (old) return old.value as CommandReceipt;
      if (command.type === 'pause') { this.data.paused = command.paused; this.epoch++; }
      else if (command.type === 'speed') {
        if (this.mode === 'live-meta' && command.speed !== 1) throw new SessionError(400, 'Live evaluation uses normal time');
        this.data.speed = command.speed;
      } else if (command.type === 'road') {
        const accepted = this.world.setRoadBlocked(command.edgeId, command.blocked);
        const value = { accepted, reason: accepted ? 'accepted' : 'Road unchanged, invalid or currently occupied' };
        Object.assign(this.data.receipts[command.id]!, { status: 'done', value }); await this.commit(); return value;
      } else {
        this.world = new Neighbourhood(`server-${randomUUID()}`); this.proposals.clear(); this.epoch++;
        this.data.history = { musa: [], amina: [], zainab: [] }; this.data.paused = false;
        if (this.mode === 'mock') this.provider = mockExperiment(command.experiment);
        // Spending, request counters, wall cooldowns, and receipt history NEVER reset.
      }
      const value = { accepted: true, reason: 'accepted' }; Object.assign(this.data.receipts[command.id]!, { status: 'done', value }); await this.commit(); return value;
    });
  }
  async tick(seconds: number): Promise<void> {
    await this.transaction(async () => {
      for (const [id, proposal] of this.proposals) if (proposal.expires < this.now()) { this.world.abandonDecision(proposal.request.id); this.proposals.delete(id); }
      if (!this.data.paused) { this.world.advance(seconds * this.data.speed); await this.commit(); }
    });
  }
  async decide(actorId?: NpcId): Promise<void> {
    let request: NpcDecisionRequest | null = null; let origin: Neighbourhood; let epoch = 0;
    await this.transaction(async () => {
      if (this.data.paused || this.busy) return;
      if (!actorId && this.mode === 'live-meta' && !this.options.plan?.allowAutonomy) return;
      for (let i = 0; i < (actorId ? 1 : 3); i++) {
        const id = actorId ?? npcIds[(this.cursor++ % 3)]!;
        if (!actorId && this.world.snapshot.time - (this.data.last[id]?.simulation ?? -Infinity) < 20) continue;
        try { this.reserveRequest(id); } catch (error) { if (actorId) throw error; continue; }
        request = actorId ? this.world.requestInteractionDecision(id) : this.world.requestDecision(id);
        if (!request) { this.busy = false; this.data.requests--; this.data.recent.pop(); delete this.data.last[id]; if (this.mode === 'live-meta') { this.data.plan!.used--; this.data.plan!.reservedUsd -= maximumGenerationUsd; } continue; }
        origin = this.world; epoch = this.epoch; await this.commit(); return;
      }
    });
    if (!request) return;
    const pending = request as NpcDecisionRequest;
    try {
      const result = await this.provider.decide(pending);
      await this.transaction(async () => {
        if (origin! !== this.world || this.data.paused || epoch !== this.epoch) origin!.abandonDecision(pending.id);
        else this.world.applyDecision(pending.id, result.decision, { mode: result.mode, model: result.model });
        this.captureMetrics(pending.id, pending.actorId); await this.commit();
      });
    } catch {
      await this.transaction(async () => { if (origin! === this.world) this.world.abandonDecision(pending.id); this.captureMetrics(pending.id, pending.actorId); await this.commit(); });
    } finally { this.busy = false; }
  }
  private captureMetrics(requestId: string, actorId: NpcId): void { if (this.provider.metrics) this.data.metrics = [...this.data.metrics, { ...this.provider.metrics, requestId, actorId, recordedAt: this.now() }].slice(-48); }
  async converse(input: ConversationInput): Promise<ConversationResult> {
    let oldResult: ConversationResult | null = null; let revision = 0; let origin!: Neighbourhood; let epoch = 0;
    let context!: Parameters<NeighbourhoodProvider['converse']>[0];
    await this.transaction(async () => {
      this.requireWorld(input.worldId); const old = this.receipt(input.id, input); if (old) { oldResult = old.value as ConversationResult; return; }
      this.reserveRequest(input.actorId);
      for (const [id, proposal] of this.proposals) if (proposal.request.actorId === input.actorId) { this.world.abandonDecision(proposal.request.id); this.proposals.delete(id); }
      this.world.recordConversation(input.actorId, 'player', input.message);
      this.data.history[input.actorId].push({ speaker: 'player', text: input.message, mode: this.mode });
      this.data.history[input.actorId] = this.data.history[input.actorId].slice(-12);
      context = { observation: this.world.observe(input.actorId), message: input.message, history: structuredClone(this.data.history[input.actorId].slice(-6)) };
      revision = context.observation.actor.revision; origin = this.world; epoch = this.epoch; await this.commit();
    });
    if (oldResult) return oldResult;
    try {
      const response = await this.provider.converse(context); validateConversation(response, context);
      return await this.transaction(async () => {
        if (origin !== this.world || epoch !== this.epoch || this.world.observe(input.actorId).actor.revision !== revision) throw new SessionError(409, 'Character state changed during conversation');
        this.world.recordConversation(input.actorId, 'npc', response.reply);
        this.data.history[input.actorId].push({ speaker: 'npc', text: response.reply, mode: this.mode }); this.data.history[input.actorId] = this.data.history[input.actorId].slice(-12);
        let proposalId: string | null = null;
        if (response.proposedDecision && !this.data.paused) {
          const request = this.world.requestInteractionDecision(input.actorId);
          if (request) { proposalId = randomUUID(); this.proposals.set(proposalId, { request, decision: response.proposedDecision, expires: this.now() + 60_000 }); }
        }
        const value: ConversationResult = { mode: this.mode, reply: response.reply, proposalId };
        Object.assign(this.data.receipts[input.id]!, { status: 'done', value }); this.captureMetrics(input.id, input.actorId); await this.commit(); return value;
      });
    } catch (error) {
      await this.transaction(async () => { Object.assign(this.data.receipts[input.id]!, { status: 'failed', value: 'Inference unavailable; no action executed' }); this.captureMetrics(input.id, input.actorId); await this.commit(); });
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
  async close(): Promise<void> { await this.tail; this.closed = true; this.listeners.clear(); }
}
type ConstructorParametersInternal = { checkpoint: string; provider?: NeighbourhoodProvider; plan?: LivePlan; now?: () => number };
function mockExperiment(experiment: Experiment): NeighbourhoodProvider {
  return new MockNeighbourhoodProvider(new NeighbourhoodMockProvider({ trader: experiment === 'cooperate' || experiment === 'decline' ? 'cooperate' : experiment, driver: experiment === 'decline' ? 'decline' : 'accept' }));
}
