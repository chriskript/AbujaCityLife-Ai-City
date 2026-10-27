import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeProbeBudget, withProbeBudget } from '../server/controls/probe-budget.js';
import { inferenceCost, probeMeta } from '../server/inference/meta-probe.js';
import { TaxiAgent } from '../shared/agent/taxi-agent.js';
import { MockProvider } from '../server/inference/mock-provider.js';

const temporaryDirectories: string[] = [];
async function budgetPath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ai-city-budget-test-'));
  temporaryDirectories.push(directory);
  return join(directory, 'ledger.json');
}
afterEach(async () => {
  // Paths are returned directly by mkdtemp under the OS temp directory.
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('persistent probe spending gate', () => {
  const limits = { dailyUsd: 0.25, totalUsd: 1 };
  it('retains reservations across invocations and failures', async () => {
    const path = await budgetPath(); await initializeProbeBudget(path);
    await expect(withProbeBudget(path, limits, async reserve => { await reserve(0.2); throw new Error('timeout'); })).rejects.toThrow('timeout');
    await expect(withProbeBudget(path, limits, reserve => reserve(0.1))).rejects.toThrow('exhausted');
    expect(JSON.parse(await readFile(path, 'utf8')).reservations).toHaveLength(1);
  });
  it('enforces the total limit across daily rollover', async () => {
    const path = await budgetPath(); await initializeProbeBudget(path);
    const small = { dailyUsd: 0.1, totalUsd: 0.15 };
    await withProbeBudget(path, small, reserve => reserve(0.1), new Date('2026-10-27T10:00:00Z'));
    await expect(withProbeBudget(path, small, reserve => reserve(0.1), new Date('2026-10-28T10:00:00Z'))).rejects.toThrow('exhausted');
  });
  it('uses Lagos midnight for daily limits', async () => {
    const path = await budgetPath(); await initializeProbeBudget(path);
    await withProbeBudget(path, limits, reserve => reserve(0.2), new Date('2026-10-27T22:59:00Z'));
    await withProbeBudget(path, limits, reserve => reserve(0.2), new Date('2026-10-27T23:01:00Z'));
    const ledger = JSON.parse(await readFile(path, 'utf8'));
    expect(ledger.reservations.map((item: { day: string }) => item.day)).toEqual(['2026-10-27', '2026-10-28']);
  });
  it('rejects missing and corrupt ledgers and invalid limits', async () => {
    const path = await budgetPath();
    await expect(withProbeBudget(path, limits, reserve => reserve(0.1))).rejects.toThrow();
    await writeFile(path, '{}');
    await expect(withProbeBudget(path, limits, reserve => reserve(0.1))).rejects.toThrow('Invalid budget ledger');
    await expect(withProbeBudget(path, { dailyUsd: NaN, totalUsd: 1 }, reserve => reserve(0.1))).rejects.toThrow('Invalid budget');
  });
  it('does not overwrite an existing ledger during initialization', async () => {
    const path = await budgetPath(); await initializeProbeBudget(path);
    await expect(initializeProbeBudget(path)).rejects.toThrow();
  });
  it('blocks overlapping probe processes and releases the lock afterward', async () => {
    const path = await budgetPath(); await initializeProbeBudget(path);
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const first = withProbeBudget(path, limits, async reserve => {
      await reserve(0.01); entered(); await new Promise<void>(resolve => { release = resolve; });
    });
    await started;
    await expect(withProbeBudget(path, limits, reserve => reserve(0.01))).rejects.toThrow();
    release(); await first;
    await withProbeBudget(path, limits, reserve => reserve(0.01));
  });
});

describe('Meta contract probe with fake transport only', () => {
  const agent = new TaxiAgent(new MockProvider());
  const request = { requestId: 'test', scenarioId: 'A', goal: 'Take me to a lake view.', observation: agent.observe() };
  const decision = { action: 'travel', destinationId: 'lake-overlook', routeId: request.observation.routeCandidates[0]!.id, explanation: 'Public lake view.', playerMessage: 'Heading there.' };
  const completed = {
    status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(decision) }] }],
    usage: { input_tokens: 100, output_tokens: 50, output_tokens_details: { reasoning_tokens: 20 } },
  };

  it('reserves maximum cost before generation and reports reasoning without double-counting', async () => {
    const order: string[] = [];
    const fetcher = vi.fn<typeof fetch>(async (url, init) => {
      expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer fake-test-key');
      if (String(url).endsWith('/input_tokens')) { order.push('count'); return Response.json({ input_tokens: 100 }); }
      order.push('generate');
      const body = JSON.parse(init!.body as string);
      expect(body.max_output_tokens).toBe(2048); expect(body.tools).toBeUndefined();
      expect(body.text.format.strict).toBe(true);
      return Response.json(completed);
    });
    const output = await probeMeta(request, {
      apiKey: 'fake-test-key', model: 'muse-spark-1.3', fetcher,
      reserve: async usd => { order.push('reserve'); expect(usd).toBe(inferenceCost('muse-spark-1.3', 100, 2048)); },
    });
    expect(order).toEqual(['count', 'reserve', 'generate']);
    expect(output.usage?.reasoningTokens).toBe(20);
    expect(output.estimatedCostUsd).toBe(inferenceCost('muse-spark-1.3', 100, 50));
  });
  it('never generates if the budget rejects reservation', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ input_tokens: 100 }));
    await expect(probeMeta(request, { apiKey: 'fake', model: 'muse-spark-1.3', fetcher, reserve: async () => { throw new Error('exhausted'); } })).rejects.toThrow('exhausted');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([
    { input_tokens: -1 }, { input_tokens: 16_001 }, { input_tokens: '100' }, {},
  ])('rejects invalid preflight counts: %j', async count => {
    const reserve = vi.fn(async () => {});
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(count));
    await expect(probeMeta(request, { apiKey: 'fake', model: 'muse-spark-1.3', fetcher, reserve })).rejects.toThrow();
    expect(reserve).not.toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([
    { status: 'incomplete', output: [] },
    { ...completed, output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal' }] }] },
    { ...completed, output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '{}' }] }] },
    { ...completed, usage: { input_tokens: 101, output_tokens: 50 } },
  ])('rejects incomplete, refused, invalid, or over-budget responses', async response => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ input_tokens: 100 })).mockResolvedValueOnce(Response.json(response));
    await expect(probeMeta(request, { apiKey: 'fake', model: 'muse-spark-1.3', fetcher, reserve: async () => {} })).rejects.toThrow();
  });
  it('does not retry HTTP failures', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('sensitive raw error', { status: 429 }));
    await expect(probeMeta(request, { apiKey: 'fake', model: 'muse-spark-1.3', fetcher, reserve: async () => {} })).rejects.toThrow('Meta HTTP 429');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
