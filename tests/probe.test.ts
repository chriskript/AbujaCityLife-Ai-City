import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initializeProbeBudget, withProbeBudget, effectiveDailyProbeUsd, effectiveTotalProbeUsd } from '../server/controls/probe-budget.js';

import { inferenceCost } from '../server/inference/model-pricing.js';

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
  it('expires the approved $5 cumulative allowance at Lagos midnight without resetting history',async()=>{
    const until='2026-11-04';
    expect(effectiveTotalProbeUsd(5,until,new Date('2026-11-04T22:59:59Z'))).toBe(5);
    expect(effectiveTotalProbeUsd(5,until,new Date('2026-11-04T23:00:00Z'))).toBe(1);
    expect(effectiveTotalProbeUsd(.5,until,new Date('2026-11-05T00:00:00Z'))).toBe(.5);
    expect(()=>effectiveTotalProbeUsd(5,'2026-02-31')).toThrow('expiry');
    const path=await budgetPath();await initializeProbeBudget(path);
    const temporary={dailyUsd:20,totalUsd:5,totalUsdUntil:until};
    await withProbeBudget(path,temporary,reserve=>reserve(1.1),new Date('2026-11-04T22:59:59Z'));
    const before=await readFile(path,'utf8');
    await expect(withProbeBudget(path,temporary,reserve=>reserve(.01),new Date('2026-11-04T23:00:00Z'))).rejects.toThrow('exhausted');
    expect(await readFile(path,'utf8')).toBe(before);
  });
  it('expires a temporary $20 daily allowance at Lagos midnight without changing the total limit', async () => {
    const until='2026-11-04';
    expect(effectiveDailyProbeUsd(20,until,new Date('2026-11-04T22:59:59Z'))).toBe(20);
    expect(effectiveDailyProbeUsd(20,until,new Date('2026-11-04T23:00:00Z'))).toBe(.25);
    expect(()=>effectiveDailyProbeUsd(20,'2026-02-31')).toThrow('expiry');
    const path=await budgetPath();await initializeProbeBudget(path);
    await withProbeBudget(path,{dailyUsd:20,totalUsd:1,dailyUsdUntil:until},reserve=>reserve(.8),new Date('2026-10-31T10:00:00Z'));
    await expect(withProbeBudget(path,{dailyUsd:20,totalUsd:1,dailyUsdUntil:until},reserve=>reserve(.3),new Date('2026-11-01T10:00:00Z'))).rejects.toThrow('exhausted');
    await expect(withProbeBudget(path,{dailyUsd:20,totalUsd:10,dailyUsdUntil:until},reserve=>reserve(.3),new Date('2026-11-05T00:00:00Z'))).rejects.toThrow('exhausted');
    expect(JSON.parse(await readFile(path,'utf8')).reservations).toHaveLength(1);
  });
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

describe('shared inference pricing', () => {
  it('preserves town reservation costs and permits zero usage', () => {
    expect(inferenceCost('muse-spark-1.3', 6000, 2048)).toBe(0.016204);
    expect(inferenceCost('muse-wonder-1.0', 1000000, 1000000)).toBe(24);
    expect(inferenceCost('muse-spark-1.3', 0, 0)).toBe(0);
  });
  it.each([-1, 1.5, NaN, Infinity])('rejects invalid token counts: %s', count => {
    expect(() => inferenceCost('muse-spark-1.3', count, 0)).toThrow('Invalid usage');
    expect(() => inferenceCost('muse-spark-1.3', 0, count)).toThrow('Invalid usage');
  });
});
