import type { NpcDecision, NpcId, NpcObservation } from './types.js';

export interface ConversationInput { id: string; worldId: string; actorId: NpcId; message: string }
export interface ConversationDecision { reply: string; evidenceIds: string[]; uncertain: boolean; proposedDecision: NpcDecision | null }
export interface ConversationTurn { speaker: 'player' | 'npc'; text: string; mode: 'mock' | 'live-meta' }
export interface ConversationResult { mode: 'mock' | 'live-meta'; reply: string; proposalId: string | null }
export interface ConversationContext { observation: NpcObservation; message: string; history: ConversationTurn[] }
export interface GenerationMetrics { model: string; latencyMs: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }
