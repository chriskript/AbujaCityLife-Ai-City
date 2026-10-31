import type { NeighbourhoodFrame, NeighbourhoodSession, SessionCommand, CommandReceipt } from '../../../shared/neighbourhood/presentation.js';
import type { ConversationInput, ConversationResult, ConversationTurn } from '../../../shared/neighbourhood/conversation.js';
import type { NpcId } from '../../../shared/neighbourhood/types.js';
import type { PhoneView,PhoneLease,PhoneControlInput,PhoneActionInput } from '../../../shared/neighbourhood/phone.js';

export type Connection = 'connecting' | 'ready' | 'unauthorized' | 'offline';
export class RemoteNeighbourhoodSession implements NeighbourhoodSession {
  private listeners = new Set<(frame: NeighbourhoodFrame) => void>();
  private connections = new Set<(state: Connection) => void>();
  private state: Connection = 'connecting'; private source: EventSource | null = null;
  private latest: NeighbourhoodFrame | null = null; private disposed = false; private visible = true;
  constructor() { void this.connect(); }
  onConnection(listener: (state: Connection) => void): () => void { this.connections.add(listener); listener(this.state); return () => this.connections.delete(listener); }
  private status(state: Connection): void { if (this.disposed) return; this.state = state; for (const listener of this.connections) listener(state); }
  private async request<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`/api/${path}`, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(30_000), ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-City-Lab': '1' }, body: JSON.stringify(body) }) });
    if (response.status === 401) this.status('unauthorized');
    const value = await response.json(); if (!response.ok) throw new Error(value.error ?? 'Backend unavailable'); return value as T;
  }
  async login(token: string): Promise<void> { await this.request('login', { token }); await this.connect(); }
  private publish(frame: NeighbourhoodFrame): void { this.latest = frame; for (const listener of this.listeners) listener(structuredClone(frame)); }
  private async connect(): Promise<void> {
    if (this.disposed || !this.visible) return; this.source?.close(); this.source = null;
    try {
      const frame = await this.request<NeighbourhoodFrame>('session');
      if (this.disposed || !this.visible) return;
      this.publish(frame); this.status('ready');
      this.source = new EventSource('/api/events');
      this.source.onmessage = event => { try { this.publish(JSON.parse(event.data)); this.status('ready'); } catch { this.status('offline'); } };
      this.source.onerror = () => { this.status('offline'); };
    } catch { if (this.state !== 'unauthorized') this.status('offline'); }
  }
  subscribe(listener: (frame: NeighbourhoodFrame) => void): () => void { this.listeners.add(listener); if (this.latest) listener(structuredClone(this.latest)); return () => this.listeners.delete(listener); }
  send(command: SessionCommand): Promise<CommandReceipt> { return this.request('commands', command); }
  phone(actorId:string):Promise<PhoneView>{return this.request(`phone?actorId=${encodeURIComponent(actorId)}`);}
  controlPhone(input:PhoneControlInput):Promise<PhoneLease|null>{return this.request('phone/control',input);}
  phoneAction(input:PhoneActionInput):Promise<CommandReceipt>{return this.request('phone/actions',input);}
  converse(input: ConversationInput): Promise<ConversationResult> { return this.request('conversations', input); }
  history(actorId: NpcId): Promise<ConversationTurn[]> { return this.request(`conversations?actorId=${actorId}`); }
  confirm(input: { id: string; worldId: string; proposalId: string }): Promise<CommandReceipt> { return this.request('proposals', input); }
  update(_realSeconds: number): void { /* Server clock owns all outcomes. */ }
  setVisible(visible: boolean): void { this.visible = visible; if (!visible) { this.source?.close(); this.source = null; } else void this.connect(); }
  dispose(): void { this.disposed = true; this.source?.close(); this.listeners.clear(); this.connections.clear(); }
}
