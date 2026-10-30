import { type NpcDecision } from './types.js';
import { quantityBounds } from './action-limits.js';

const text = (value: unknown, max = 120): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const exact = (object: Record<string, unknown>, keys: string[]): boolean => Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object, key));
const quantity = (value: unknown): boolean => Number.isSafeInteger(value) && Number(value) >= quantityBounds.minimum && Number(value) <= quantityBounds.maximum;
export const isResidentId = (value: unknown): value is string => typeof value === 'string' && /^[a-z][a-z0-9_-]{0,47}$/.test(value) && !['constructor', 'prototype', '__proto__', 'world', 'player'].includes(value);

export function isNpcDecision(value: unknown): value is NpcDecision {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const decision = value as Record<string, unknown>;
  if (!exact(decision, ['goalId', 'reason', 'action']) || !text(decision.goalId) || !text(decision.reason, 400)) return false;
  if (!decision.action || typeof decision.action !== 'object' || Array.isArray(decision.action)) return false;
  const action = decision.action as Record<string, unknown>;
  switch (action.type) {
    case 'travel': return exact(action, ['type', 'destination']) && text(action.destination);
    case 'wait': case 'work': return exact(action, ['type', 'seconds']) && Number.isFinite(action.seconds) && Number(action.seconds) >= 1 && Number(action.seconds) <= 120;
    case 'propose-transport': return exact(action, ['type', 'recipient', 'quantity']) && isResidentId(action.recipient) && quantity(action.quantity);
    case 'respond-transport': return text(action.taskId) && (exact(action, ['type', 'taskId', 'accept']) && typeof action.accept === 'boolean' || exact(action, ['type','taskId','accept','question']) && action.accept === 'clarify' && text(action.question, 160));
    case 'fulfil-transport': return exact(action, ['type', 'taskId']) && text(action.taskId);
    case 'collect-self': case 'stock-stall': case 'buy': return exact(action, ['type', 'quantity']) && quantity(action.quantity);
    case 'set-sales': return exact(action, ['type', 'open']) && typeof action.open === 'boolean';
    case 'share': return exact(action, ['type', 'recipient', 'memoryId', 'asBelief']) && isResidentId(action.recipient) && text(action.memoryId) && typeof action.asBelief === 'boolean';
    case 'encounter': return exact(action, ['type','recipient','purpose','message']) && isResidentId(action.recipient) && ['introduce','ask','request-help'].includes(String(action.purpose)) && text(action.message, 160);
    case 'respond-encounter': return exact(action, ['type','interactionId','response','message']) && text(action.interactionId) && ['accept','decline','defer','clarify'].includes(String(action.response)) && text(action.message, 160);
    default: return false;
  }
}

// Shared by autonomous decisions and conversation proposals in the Meta provider.
export const npcDecisionSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    goalId: { type: 'string' }, reason: { type: 'string' },
    action: { anyOf: [
      ['travel', { destination: { type: 'string' } }],
      ['wait', { seconds: { type: 'number' } }], ['work', { seconds: { type: 'number' } }],
      ['propose-transport', { recipient: { type: 'string', pattern: '^[a-z][a-z0-9_-]{0,47}$' }, quantity: { type: 'integer', ...quantityBounds } }],
      ['respond-transport', { taskId: { type: 'string' }, accept: { type: 'boolean' } }],
      ['respond-transport', { taskId: { type: 'string' }, accept: { type: 'string', enum: ['clarify'] }, question: { type: 'string', minLength: 1, maxLength: 160 } }],
      ['fulfil-transport', { taskId: { type: 'string' } }],
      ...['collect-self', 'stock-stall', 'buy'].map(type => [type, { quantity: { type: 'integer', ...quantityBounds } }]),
      ['set-sales', { open: { type: 'boolean' } }],
      ['share', { recipient: { type: 'string', pattern: '^[a-z][a-z0-9_-]{0,47}$' }, memoryId: { type: 'string' }, asBelief: { type: 'boolean' } }],
      ['encounter', { recipient: { type: 'string', pattern: '^[a-z][a-z0-9_-]{0,47}$' }, purpose: { type: 'string', enum: ['introduce','ask','request-help'] }, message: { type: 'string', minLength: 1, maxLength: 160 } }],
      ['respond-encounter', { interactionId: { type: 'string' }, response: { type: 'string', enum: ['accept','decline','defer','clarify'] }, message: { type: 'string', minLength: 1, maxLength: 160 } }],
    ].map(([type, properties]) => ({
      type: 'object', additionalProperties: false,
      properties: { type: { type: 'string', enum: [type] }, ...properties as Record<string, unknown> },
      required: ['type', ...Object.keys(properties as object)],
    })) },
  },
  required: ['goalId', 'reason', 'action'],
};
