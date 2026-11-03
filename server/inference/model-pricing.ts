export const modelRates = {
  'muse-spark-1.3': { input: 1.25, output: 4.25 },
  'muse-wonder-1.0': { input: 4, output: 20 },
} as const;
export type InferenceModel = keyof typeof modelRates;

export function inferenceCost(model: InferenceModel, inputTokens: number, outputTokens: number): number {
  if (![inputTokens, outputTokens].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid usage');
  const rate = modelRates[model];
  // Uncached input rate is conservative; reasoning is already part of output.
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}

