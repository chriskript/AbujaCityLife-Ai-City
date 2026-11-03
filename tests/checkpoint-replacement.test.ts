import { afterEach, describe, expect, it, vi } from 'vitest';
import { rename } from 'node:fs/promises';
import { replaceCheckpoint } from '../server/persistence/replace-checkpoint.js';
import {channel} from 'node:diagnostics_channel';

vi.mock('node:fs/promises', async importOriginal => ({ ...await importOriginal<typeof import('node:fs/promises')>(), rename: vi.fn() }));
const replacement = vi.mocked(rename);
afterEach(() => { vi.resetAllMocks(); });
const failure = (code: string) => Object.assign(new Error(code), { code });
describe('atomic checkpoint replacement', () => {
  it('reports contention and a successful replacement without changing retry semantics or exposing contents',async()=>{
    const records:any[]=[],c=channel('citylab.checkpoint.replace'),listener=(r:unknown)=>{records.push(r);};c.subscribe(listener);
    try{
      replacement.mockRejectedValueOnce(failure('EPERM')).mockResolvedValueOnce();
      await replaceCheckpoint('flushed.pending','saved.json','win32');
      expect(records).toEqual([expect.objectContaining({source:'flushed.pending',target:'saved.json',outcome:'contention',code:'EPERM',attempt:1}),expect.objectContaining({outcome:'replaced',attempt:2})]);
      expect(records.every(r=>Object.keys(r).every(k=>['source','target','outcome','code','attempt','elapsedMs'].includes(k)))).toBe(true);
    }finally{c.unsubscribe(listener);}
  });
  it('retries a transient Windows denial using the same source and destination', async () => {
    replacement.mockRejectedValueOnce(failure('EPERM')).mockRejectedValueOnce(failure('EBUSY')).mockResolvedValueOnce();
    await replaceCheckpoint('already-flushed.pending', 'last-good.json', 'win32');
    expect(replacement.mock.calls).toEqual(Array.from({ length: 3 }, () => ['already-flushed.pending', 'last-good.json']));
  });
  it('bounds persistent Windows denial and preserves its error for fail-closed handling', async () => {
    const error = failure('EACCES'); replacement.mockRejectedValue(error);
    await expect(replaceCheckpoint('pending', 'saved', 'win32')).rejects.toBe(error);
    expect(replacement).toHaveBeenCalledTimes(8);
  });
  it('tolerates contention longer than the old 185ms window without rewriting or replaying an action',async()=>{
    replacement.mockRejectedValueOnce(failure('EPERM')).mockRejectedValueOnce(failure('EPERM')).mockRejectedValueOnce(failure('EBUSY')).mockRejectedValueOnce(failure('EPERM')).mockRejectedValueOnce(failure('EPERM')).mockResolvedValueOnce();
    await replaceCheckpoint('same-flushed.pending','same-last-good.json','win32');
    expect(replacement.mock.calls).toEqual(Array.from({length:6},()=>['same-flushed.pending','same-last-good.json']));
  });
  it('does not retry disk/permission failures outside the transient Windows cases', async () => {
    for (const [platform, code] of [['linux', 'EPERM'], ['win32', 'ENOSPC'], ['win32', 'EIO']] as const) {
      replacement.mockReset().mockRejectedValue(failure(code));
      await expect(replaceCheckpoint('pending', 'saved', platform)).rejects.toMatchObject({ code });
      expect(replacement).toHaveBeenCalledTimes(1);
    }
  });
});
