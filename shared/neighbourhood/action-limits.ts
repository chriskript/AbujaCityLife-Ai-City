// Public world rules shared by the model contract and authoritative validation.
// These limits do not promise stock, proximity, or permission to execute an action.
export const quantityBounds = Object.freeze({ minimum: 1, maximum: 6 });
export const transportCapacity = quantityBounds.maximum;
export const selfCollectionCapacity = 2;
