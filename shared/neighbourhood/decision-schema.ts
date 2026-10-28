import { npcIds, type NpcDecision } from './types.js';

const text = (value: unknown, max = 120): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const exact = (object: Record<string, unknown>, keys: string[]): boolean => Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object, key));
const quantity = (value: unknown): boolean => Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= 6;

export function isNpcDecision(value: unknown): value is NpcDecision {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const decision = value as Record<string, unknown>;
  if (!exact(decision, ['goalId', 'reason', 'action']) || !text(decision.goalId) || !text(decision.reason, 400)) return false;
  if (!decision.action || typeof decision.action !== 'object' || Array.isArray(decision.action)) return false;
  const action = decision.action as Record<string, unknown>;
  switch (action.type) {
    case 'travel': return exact(action, ['type', 'destination']) && text(action.destination);
    case 'wait': case 'work': return exact(action, ['type', 'seconds']) && Number.isFinite(action.seconds) && Number(action.seconds) >= 1 && Number(action.seconds) <= 120;
    case 'propose-transport': return exact(action, ['type', 'recipient', 'quantity']) && npcIds.includes(action.recipient as typeof npcIds[number]) && quantity(action.quantity);
    case 'respond-transport': return exact(action, ['type', 'taskId', 'accept']) && text(action.taskId) && typeof action.accept === 'boolean';
    case 'fulfil-transport': return exact(action, ['type', 'taskId']) && text(action.taskId);
    case 'collect-self': case 'stock-stall': case 'buy': return exact(action, ['type', 'quantity']) && quantity(action.quantity);
    case 'set-sales': return exact(action, ['type', 'open']) && typeof action.open === 'boolean';
    case 'share': return exact(action, ['type', 'recipient', 'memoryId', 'asBelief']) && npcIds.includes(action.recipient as typeof npcIds[number]) && text(action.memoryId) && typeof action.asBelief === 'boolean';
    default: return false;
  }
}

// Strict root object for a future Meta provider; no live client is connected here.
export const npcDecisionSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    goalId: { type: 'string' }, reason: { type: 'string' },
    action: { anyOf: [
      ['travel', { destination: { type: 'string' } }],
      ['wait', { seconds: { type: 'number' } }], ['work', { seconds: { type: 'number' } }],
      ['propose-transport', { recipient: { type: 'string', enum: npcIds }, quantity: { type: 'integer' } }],
      ['respond-transport', { taskId: { type: 'string' }, accept: { type: 'boolean' } }],
      ['fulfil-transport', { taskId: { type: 'string' } }],
      ...['collect-self', 'stock-stall', 'buy'].map(type => [type, { quantity: { type: 'integer' } }]),
      ['set-sales', { open: { type: 'boolean' } }],
      ['share', { recipient: { type: 'string', enum: npcIds }, memoryId: { type: 'string' }, asBelief: { type: 'boolean' } }],
    ].map(([type, properties]) => ({
      type: 'object', additionalProperties: false,
      properties: { type: { type: 'string', enum: [type] }, ...properties as Record<string, unknown> },
      required: ['type', ...Object.keys(properties as object)],
    })) },
  },
  required: ['goalId', 'reason', 'action'],
};
