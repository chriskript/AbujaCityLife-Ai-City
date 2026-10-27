import type { Destination } from '../world/neighbourhood.js';
import type { Route } from '../navigation/routes.js';

export interface Decision {
  action: 'travel' | 'clarify' | 'unable';
  destinationId: string | null;
  routeId: string | null;
  explanation: string;
  playerMessage: string;
}

export interface Observation {
  worldRevision: number;
  agentNode: string;
  destinations: readonly Destination[];
  routeCandidates: Route[];
  blockedEdges: string[];
  previousOutcome: string | null;
  selectedDestinationId: string | null;
}

export interface DecisionRequest {
  requestId: string;
  scenarioId: string;
  goal: string;
  observation: Observation;
}

export interface InferenceResult {
  provider: 'mock' | 'meta';
  model: string;
  decision: unknown;
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number; reasoningTokens: number | null } | null;
  estimatedCostUsd: number;
}

export interface InferenceProvider { decide(request: DecisionRequest): Promise<InferenceResult> }

// Same small strict schema is used by the live contract probe.
export const decisionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['travel', 'clarify', 'unable'] },
    destinationId: { type: ['string', 'null'] },
    routeId: { type: ['string', 'null'] },
    explanation: { type: 'string' },
    playerMessage: { type: 'string' },
  },
  required: ['action', 'destinationId', 'routeId', 'explanation', 'playerMessage'],
} as const;

export function isDecision(value: unknown): value is Decision {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const object = value as Record<string, unknown>;
  const keys = Object.keys(decisionSchema.properties);
  return Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object, key))
    && ['travel', 'clarify', 'unable'].includes(object.action as string)
    && [object.destinationId, object.routeId].every(item => item === null || typeof item === 'string' && item.length <= 512)
    && [object.explanation, object.playerMessage].every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 600);
}
