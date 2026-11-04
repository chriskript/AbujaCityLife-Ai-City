// Public world rules shared by the model contract and authoritative validation.
// These limits do not promise stock, proximity, or permission to execute an action.
export const quantityBounds = Object.freeze({ minimum: 1, maximum: 6 });
export const transportCapacity = quantityBounds.maximum;
export const selfCollectionCapacity = 2;
export const goalBounds = Object.freeze({ records: 12, description: 240, motivation: 240, priorityMinimum: 1, priorityMaximum: 12 });
export const intentionBounds = Object.freeze({ pending: 3, records: 8, note: 160, leadMinimumSeconds: 120, leadMaximumSeconds: 604800, expirySeconds: 21600 });
