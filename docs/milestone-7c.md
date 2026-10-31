# Milestone 7C: bounded unattended progression and road closure

Follow-up: [Milestone 7D](milestone-7d.md) adds bounded contact-based calls and texts to this same town. References below to phones/messaging as future work describe the 7C development checkpoint.

Implemented offline on October 31, 2026. The existing sixteen-resident town now advances through its authoritative server without an authenticated browser or event-stream observer. The same world, policies, executor, ledger, observations and checkpoint remain in use. No live Meta calls, commits, pushes, deployment or repository rename occurred.

## Clock and recovery

`server/progression.ts` serializes a fixed quarter-second real-time pulse: advance the existing clock, then await one scheduled decision. Concurrent pulses share the pending operation. Slow inference or disk writes slow the simulation rather than accumulating overdue work. Graceful shutdown drains the clock before closing the session. There is no elapsed-wall-time catch-up on restart.

The server persists a **1,800 simulated-second advancement allowance** and round-robin resident cursor alongside the world. At two-times speed, this is approximately fifteen wall-clock minutes if processing keeps up. Paused time consumes nothing. Consumption is actual simulated advancement, independent of selected speed. The final step clips to the remaining allowance and pauses. Resume, restart and reset cannot replenish it. Exhaustion of the existing 2,048 offline routine-decision allowance also pauses the town; resetting cannot bypass it. Conversations/live accounting remains separate and unchanged.

Older server checkpoints receive the metadata without replacing the world or resetting inference accounting. They start with zero consumption of the newly introduced time allowance. Existing checkpoint locking, atomic replacement and fail-closed validation remain. Invalid time/limit/cursor accounting refuses startup. Persistence failure stops the clock without retrying, logs an operator message and leaves the last published durable frame visible. Review the underlying failure before restarting from a valid checkpoint.

Build and start the normal backend using the existing `npm run build` and `npm run backend` commands. Closing a browser or expiring an observer login no longer stops **mock** progression; stopping the backend process does. Pause before leaving to freeze the town. Neighbourhood experiments shows consumed server allowance. An exhausted checkpoint remains inspectable and paused; no browser control refills its limits. Longer runs require a separately reviewed operating policy.

Live Meta mode retains observer gating, approved-plan checks, token/spending/request ceilings, expiry, cooldowns and single-generation concurrency. The unattended mock clock cannot enable live inference. The independent CLI runner retains its previous per-invocation bounds and separate checkpoint; it must not concurrently own the server checkpoint.

## Integrated intervention

The existing **centre–market road** can be closed/reopened in Neighbourhood experiments without resetting the town. The browser sends the existing authenticated, deduplicated road command. An invalid, unchanged or currently occupied road is rejected without gameplay mutation; the existing notice shows rejection. The local browser adapter calls the same authoritative method.

Closure changes the existing graph and records an event. Residents discover it near an endpoint or when travel encounters it. Distant residents do not receive omniscient route knowledge. Existing observation triggers, individual offline priorities and the planner determine later behavior. Universal reactions, conversation, cooperation and relationship changes are not forced.

The renderer reuses its existing barrier geometry at the closed supply road. The original taxi lab retains its closure visualization. Public history now includes scoped road observations with the road identifier. Operator closure status is separate from NPC knowledge. Cargo, wages, delivery escrow, stock and memories continue through existing validated mechanics and recovery.

## Evidence

In paired normal sixteen-person offline runs, the first autonomous Amina–Musa delivery completed at **66 seconds with the road open** and **71.75 seconds with it closed**. At second 68, the open-road task was delivered and paid; the closed-road task retained cargo and its two-credit payment escrow. Saving/loading the delayed town preserved road state, residents, task and payment. Only transient restore triggers differed, as designed. The courier completed the detour afterward; validated completion released payment once. Other residents continued work, and reopening did not erase the completed task or consequences.

Musa initially lacked closure knowledge at the stand. Amina at the market knew locally; distant Ibrahim did not. These are deterministic offline outcomes, not live-model evidence or a guarantee that every intervention reduces aggregate output. Different meal timing can alter aggregate consumption. Rules change available opportunities; residents' decisions produce the subsequent history.

**243 tests pass across twelve files**, including eleven new progression/intervention cases: no-observer activity, no unattended live requests, serialization, pause/resume, cursor recovery, migration, time clipping, exhausted budgets, reset/restart protection, invalid steps/metadata, persistence failure, local controls and delivery recovery while payment is held. Both TypeScript configurations and production build pass. The existing shared-renderer chunk warning remains (approximately 565 kB minified / 144 kB gzip).

Installed Chrome exercised the production build against an isolated offline backend:

- All sixteen residents remained available through the roster and Three.js scene.
- An occupied closure was rejected. An unoccupied closure succeeded, with status/history and the reused barrier. Reopening worked through the UI.
- Navigating to `about:blank` disconnected the observer at 52.5 seconds. Before returning, a snapshot read showed **115.5 seconds**, six units produced, three meals consumed and one completed delivery: **63 simulated seconds advanced without a browser observer**.
- Pausing and refreshing preserved time/state. Desktop 1280×720 and mobile 390×844 screenshots were inspected. Mobile has no horizontal overflow; the existing desktop resident panel scrolls to reach expanded experiment details.
- The original taxi detour (scenario C) completed at the overlook with no page errors after the shared barrier rendering change. All existing taxi regression tests pass.
- No new browser application errors were observed. The expected initial unauthenticated session 401 and existing password-input form notice remain.

Ignored screenshots: `output/playwright/milestone7c-road-desktop.png`, `milestone7c-road-mobile.png` and `milestone7c-taxi-detour.png`. Tests use temporary checkpoints, mock providers and loopback HTTP. The operating checkpoint, credentials, approved plans and Meta ledger were not changed during verification.

## Limits and next step

This is bounded operation while the backend process runs, not an OS service or a thirty-day stability result. Frequent checkpoint I/O remains (clock updates plus decisions); slow storage reduces throughput. Existing event/task/memory retention bounds, finite inputs and funded work limits remain. Population safety ceiling is still 32; no residents were added. The small graph and single supplier/market chain remain.

The browser exposes one intervention. Emergencies, utility outages, phones, messaging, governance and prescribed social outcomes were not added. Marker crowding and physical-phone performance remain prior limitations. Server and standalone headless drivers use different clock/decision ordering; exact histories are compared only under identical driving schedules.

For the remaining hackathon window, prioritize an end-to-end demonstration/recovery rehearsal and operating polish. Longer horizons need an explicit allowance policy, durable history archival, replenishment/demand rules and measured storage/CPU behavior before increasing limits. Any live reasoning evaluation remains separately approved and tightly bounded.
