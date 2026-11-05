import { pulseEventTypes, type NeighbourhoodFrame } from '../../../shared/neighbourhood/presentation.js';
import type { Connection } from './remote-neighbourhood-session.js';

export function societyStatus(frame: NeighbourhoodFrame | null, connection: Connection | 'local') {
  if (connection === 'connecting' || connection === 'reconnecting') return { label: 'Reconnecting', tone: 'waiting', detail: 'Restoring the town connection. Displayed values are the last received snapshot.' };
  if (connection !== 'ready' && connection !== 'local') return { label: 'AI Unavailable', tone: 'error', detail: `Connection: ${connection}. The displayed town snapshot is frozen.` };
  if (!frame) return { label: 'Reconnecting', tone: 'waiting', detail: 'Waiting for an authoritative town snapshot.' };
  const error = frame.suspendedReason || frame.inference?.error || (frame.continuityActive ? 'Muse is suspended; continuity mechanics only.' : null)
    || (!frame.inference?.pending && frame.stoppedDecisions?.length ? 'Interrupted Muse decisions require review before autonomous progression.' : null);
  const unavailable = frame.mode === 'live-meta' && frame.muse && !frame.muse.available && !frame.muse.inFlight && frame.muse.status !== 'Rate limit; waiting';
  if (error || unavailable) return { label: 'AI Unavailable', tone: 'error', detail: `${error || frame.muse?.status}${frame.paused ? ' Society paused.' : frame.continuityActive ? ' Only existing continuity mechanics are running.' : ' Autonomous AI progression unavailable.'}` };
  if (frame.inference?.pending) return { label: 'Residents Thinking', tone: 'waiting', detail: `A Muse request is in progress.${frame.paused ? ' Society paused; pending results cannot advance residents.' : ''}` };
  if (frame.paused) return { label: 'Society Paused', tone: 'paused', detail: frame.progression?.stopped ? 'Server advancement allowance reached.' : 'The simulation clock is paused.' };
  if (frame.mode === 'mock') return { label: 'Mock Society', tone: 'paused', detail: 'Test decisions only. Muse inference is not enabled.' };
  if (!frame.inference?.lastSuccess) return { label: 'AI Unavailable', tone: 'error', detail: 'Muse has not yet returned a successful inference. Availability is unverified.' };
  if (frame.muse?.status === 'Rate limit; waiting') return { label: 'AI Unavailable', tone: 'waiting', detail: 'Muse request rate limit reached; waiting for the existing allowance to recover.' };
  return { label: 'AI Society Live', tone: 'live', detail: 'Muse has returned a successful inference and the simulation is running.' };
}

export function townPulse(frame: NeighbourhoodFrame) {
  const { resources, actors } = frame.snapshot;
  const event = frame.pulseEvent === undefined ? [...frame.events].reverse().find(item => pulseEventTypes.has(item.type)) ?? null : frame.pulseEvent;
  return {
    market: `${resources.marketGoods} ${resources.marketGoods === 1 ? 'portion' : 'portions'}${resources.salesOpen ? ' available' : ' · sales paused'}`,
    supply: `${resources.supplierGoods} goods`, population: `${actors.length} residents`, event,
  };
}
