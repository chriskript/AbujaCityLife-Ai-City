# Submission rehearsal: bounded offline town

Verified October 31, 2026, following Milestone 7E. This is an operating/recovery rehearsal of the integrated town, not another population or communication subsystem. No live Meta calls, operating-save changes, spending-ledger changes, commits, pushes or deployment were made.

## Repeatable command

```sh
npm run rehearse:town
```

The command creates a fresh UUID directory under ignored `output/rehearsal/`. It uses the normal mock server session and quarter-second `ServerProgression` driver without an HTTP observer, accelerated in wall time. It does not load credentials or `.env`, open operating checkpoints, enable live mode, or increase limits. It runs at most 3,601 pulses against the existing 1,800-second allowance. Assertions fail the command with a nonzero exit code.

It reads committed presentation frames concurrently, validates durable snapshots every simulated minute, and pauses/restarts at seconds 600 and 1,200. Recovery checks compare gameplay state, session identity, accounting, receipts, history and metrics; only expected restoration triggers may differ. It acquires a phone lease before restart, checks that recovery clears it, rejects the old token, preserves pause, then resumes normally. At exhaustion it verifies that restart, resume and reset cannot replenish time or decision consumption.

Artifacts include `report.json`, `completed-world.json` and `session.json`. The completed-world file retains the ended town for inspection. The final session checkpoint reflects the reset-protection check: a fresh, paused world with its allowance already spent. Do not mistake it for the completed town, restore it over an operating save, or use rehearsal files to refill operating allowances.

## Recorded result

The successful run used `output/rehearsal/2aa63127-30e8-457d-84b4-3835172b989d/`:

| Check | Result |
| --- | --- |
| Bounded advancement | 1,800 simulated seconds, 3,600 server pulses |
| Residents acting / eating / doing paid work | 16 / 16 / 14 |
| Autonomous decisions / rejected proposals | 868 / 0 |
| Communication initiated | 21 exchanges, including two calls |
| Delivery outcomes | Six completed and paid; three offers declined |
| Face-to-face discussion outcomes | Ten accepted; one deferred |
| Economy | 48 supplies produced, 49 meals consumed |
| Restart at second 600 | Ten residents travelling, one working; gameplay/accounting preserved |
| Restart at second 1,200 | Ten residents travelling, two working; gameplay/accounting preserved |
| Phone leases after restart | Cleared; old tokens rejected |
| Exhaustion after restart/reset | Preserved; automatic pause and resume rejection |
| Remaining temporary checkpoint files | Zero |

The run made 4,203 concurrent committed-frame reads and took 108.6 wall seconds while other verification work ran. Mean complete server pulse was 28.96 ms; p95 was 73.90 ms. A pulse includes advancement and any scheduled decision with its durable writes, unlike 7E's narrower committed-step measurement. Completed checkpoint size was 406,213 bytes. These are local measurements, not comparative performance claims or real-time throughput guarantees.

## Checkpoint failure investigation and correction

The direct-file stress experiment reproduced `EPERM` at atomic checkpoint replacement. A separate minimal file probe reproduced `rename` denial while a reader was active and succeeded after the reader stopped. This establishes a Windows reader/replacement contention failure mode; it does not identify the process responsible for the earlier 7E failure.

The server and standalone world saver now share `replaceCheckpoint`. After a temporary file has been written, flushed and closed, Windows `EPERM`, `EACCES` and `EBUSY` replacement errors get at most four additional rename attempts, after 10, 25, 50 and 100 ms. Other failures and non-Windows failures propagate immediately. The helper never deletes the previous checkpoint, rewrites simulation state, reruns an action, or retries inference. It retries only the same atomic replacement. A real held-reader probe completed after its reader closed; unit tests verify transient success, identical paths, the five-attempt ceiling and immediate propagation of other errors.

A continuously aggressive direct-file reader can outlast this 185-ms waiting allowance and still stop the session. That stress run failed closed as required; it is not reported as an endurance pass. Normal browser reads use the committed in-memory frame rather than repeatedly opening the checkpoint. External backup/scanning processes can still cause persistent denial. Preserve the last checkpoint and inspect the reported code/phase before restart; do not bypass persistence or keep retrying gameplay commands.

The commit diagnostic now records its create/write/sync/replace phase. A provider-result commit failure previously could be obscured by a subsequent `Session unavailable` error. Decision and conversation handlers now preserve the original persistence failure and stop without a second transaction or a newer public frame. Two integration tests verify that failure path and exactly one provider call. Existing health/SSE fail-closed behaviour remains.

## Browser rehearsal

Installed desktop Chrome exercised the production build on a separate ignored mock-server checkpoint. At 1280×720 and 390×844 viewports, all sixteen roster entries remained available, phone Chats/Calls/Contacts opened, inspection left phone control empty, and the mobile page had no horizontal overflow. Paused refresh preserved the world ID and simulation time. No application page errors occurred; the existing initial unauthenticated 401 and password-field form notice remain.

Navigating to `about:blank` disconnected the event-stream observer at second 300.5. Read-only HTTP polling confirmed second 341 before reopening the app: **40.5 simulated seconds advanced without the browser observer**. HTTP reads do not create an SSE subscription or drive the clock.

Three-second running-scene samples measured 181 animation frames each: mean 16.61 ms / p95 16.80 ms on desktop, and mean 16.60 ms / p95 16.90 ms at the mobile viewport. Both measurements were on the same desktop hardware. Physical-mobile GPU, thermal and network behaviour remain unmeasured. Screenshots inspected: ignored `output/playwright/rehearsal-running-desktop.png`, `rehearsal-running-mobile.png`, and `rehearsal-phone-mobile.png`.

## Validation and submission boundary

**287 tests pass across fifteen files**, including five new replacement/diagnostic regressions. Both TypeScript projects and the production build pass. The existing shared-renderer chunk-size warning remains; no UI assets or rendering dependencies changed in this rehearsal.

The prototype demonstrates bounded independent lives, communication, meaningful paid deliveries, privacy, save/recovery and a persistent road intervention. It does not establish thirty-day endurance, unlimited history, sustainable long-run resource replenishment, physical-mobile performance, or live Meta decision quality for the expanded schemas. Keep those claims out of the submission.

The next practical task is preparing the submission walkthrough and evidence from the validated offline prototype. Any new live evaluation or deployment needs separate approval. Longer unattended runs need a reviewed resource/history/allowance policy rather than an arbitrary increase to the current limits.
