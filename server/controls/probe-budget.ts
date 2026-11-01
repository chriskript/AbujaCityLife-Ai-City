import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';

interface Reservation { day: string; microUsd: number }
interface Ledger { version: 1; reservations: Reservation[] }

// An optional temporary allowance expires after the named Lagos calendar day.
// Expiry restores the original daily ceiling without erasing any reservations.
export function effectiveDailyProbeUsd(dailyUsd: number, until?: string, now = new Date()): number {
  usdToMicroUsd(dailyUsd);
  if (until === undefined) return dailyUsd;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until) || !Number.isFinite(Date.parse(until)) || new Date(until).toISOString().slice(0,10)!==until) throw new Error('Invalid daily allowance expiry');
  const day = new Intl.DateTimeFormat('en-CA', {timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  return day <= until ? dailyUsd : Math.min(dailyUsd, .25);
}

// Keep all lifetime reservations when the temporary cumulative allowance ends.
// If they exceed the restored cap, new calls fail closed pending review.
export function effectiveTotalProbeUsd(totalUsd:number, until?:string, now=new Date()):number {
  usdToMicroUsd(totalUsd);
  if(until===undefined)return totalUsd;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(until) || !Number.isFinite(Date.parse(until)) || new Date(until).toISOString().slice(0,10)!==until)throw new Error('Invalid total allowance expiry');
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  return day<=until?totalUsd:Math.min(totalUsd,1);
}

export function usdToMicroUsd(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0 || usd > 150) throw new Error('Invalid budget amount');
  return Math.ceil(usd * 1_000_000);
}

export async function initializeProbeBudget(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const file = await open(path, 'wx', 0o600);
  try { await file.writeFile(JSON.stringify({ version: 1, reservations: [] })); await file.sync(); }
  finally { await file.close(); }
}

// Explicit initialization only. Missing/corrupt ledgers and stale locks fail closed.
// Keep the lock for the whole probe so multiple CLI processes cannot overlap calls.
export async function withProbeBudget<T>(
  path: string,
  limits: { dailyUsd: number; totalUsd: number; dailyUsdUntil?: string; totalUsdUntil?:string },
  work: (reserve: (maximumUsd: number) => Promise<void>) => Promise<T>,
  now = new Date(),
): Promise<T> {
  const dailyLimit = usdToMicroUsd(effectiveDailyProbeUsd(limits.dailyUsd, limits.dailyUsdUntil, now));
  const totalLimit = usdToMicroUsd(effectiveTotalProbeUsd(limits.totalUsd, limits.totalUsdUntil, now));
  const lock = await open(`${path}.lock`, 'wx', 0o600);
  try {
    const ledger: Ledger = JSON.parse(await readFile(path, 'utf8'));
    if (ledger.version !== 1 || !Array.isArray(ledger.reservations) || ledger.reservations.some(item =>
      !item || typeof item.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.day) || !Number.isSafeInteger(item.microUsd) || item.microUsd <= 0)) throw new Error('Invalid budget ledger');
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    let reserved = false;
    return await work(async maximumUsd => {
      if (reserved) throw new Error('Only one inference allowed per probe');
      const amount = usdToMicroUsd(maximumUsd);
      if (amount <= 0) throw new Error('Reservation must be positive');
      const total = ledger.reservations.reduce((sum, item) => sum + item.microUsd, 0);
      const daily = ledger.reservations.filter(item => item.day === day).reduce((sum, item) => sum + item.microUsd, 0);
      if (total + amount > totalLimit || daily + amount > dailyLimit) throw new Error('Probe budget exhausted');
      ledger.reservations.push({ day, microUsd: amount });
      const temporaryPath = `${path}.pending`;
      const file = await open(temporaryPath, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify(ledger)); await file.sync(); }
      finally { await file.close(); }
      await rename(temporaryPath, path);
      reserved = true;
      // Never refund this probe reservation, including on timeout or process failure.
    });
  } finally {
    await lock.close();
    await unlink(`${path}.lock`);
  }
}
