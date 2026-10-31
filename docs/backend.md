# Controlled neighbourhood backend

[Milestone 7D](milestone-7d.md) integrates contact-based calls, delayed texts and remote transport discussions. Old town sessions receive `.pre-7d-backup` before adding communication state and capabilities; existing world assets, memories and spending/progression counters remain. All remote actions use the same authoritative validator and existing inference safeguards. This milestone was evaluated offline only.

The normal backend defaults to the [sixteen-resident 7B town](milestone-7b.md), with version-three recovery and a separate bounded offline routine allowance. Older checkpoints receive rollback copies before expansion. [Milestone 7C](milestone-7c.md) adds mock server progression without an observer, within a persisted 1,800 simulated-second allowance. Pause stops advancement; reset and restart preserve allowance usage. Live Meta mode still requires an observer and separate approval. Live/conversation wall-clock and spending controls below remain unchanged.

For resident-registry migration and autonomous encounters, see [Milestone 7A](milestone-7a.md). Autonomous mock routines use a separate persisted simulation-time rate window. The bounded standalone headless driver remains available with its own checkpoint; do not run it against the authoritative server checkpoint.

Milestone 5 adds a single authoritative Node service around the existing `Neighbourhood` core. The default browser receives public snapshots through SSE; it sends controls, messages and confirmations over HTTP. Rendering never applies inventory, task or memory changes. The original local taxi lab remains an explicitly mock regression experience; `/?authority=local` selects the previous local neighbourhood test adapter.

## Run locally in mock mode

Requires Node 22.12+ and installed dependencies (`npm ci`). From the project root:

```sh
npm run backend:init
npm run build
npm run backend
```

Open **http://127.0.0.1:8787/**. Copy the `token` field from ignored `runtime/demo-access.json` into the local sign-in field. The initializer refuses to overwrite existing access credentials and prints no token. Do not share the file or put its contents in URLs, command arguments, logs or Git. Mock mode does not load the Meta key or make provider HTTP calls.

For frontend development, keep the backend running and use `npm run dev` in another terminal. Vite at **http://127.0.0.1:5173/** proxies `/api` to port 8787. Sign in on that origin. Use port 8787 if 5173 is occupied; do not stop unrelated applications. `npm run preview` alone has no backend proxy: use the backend's built-file server for the full experience.

## HTTP boundary

| Endpoint | Purpose | Access |
| --- | --- | --- |
| `GET /api/health` | Minimal status and configured mode | Loopback |
| `POST /api/login` | Exchange local operator token for cookie | Five attempts/minute |
| `GET /api/session` | Last durably committed public frame | Operator cookie |
| `GET /api/events` | SSE stream of committed frames | Cookie; two streams maximum |
| `POST /api/commands` | Pause, speed, experiment reset, or validated road closure | Cookie, strict fields and world ID |
| `GET /api/conversations?actorId=zainab` | Last 12 conversation turns | Cookie |
| `POST /api/conversations` | `{id,worldId,actorId,message}`; message up to 500 characters | Cookie, generation limits |
| `POST /api/proposals` | `{id,worldId,proposalId}`; separately validate an action | Cookie; proposal expires after 60 seconds |

All POSTs require an exact permitted local Origin, `Content-Type: application/json`, and `X-City-Lab: 1`. Bodies are limited to 4 KiB. Authentication uses an HttpOnly, SameSite=Strict cookie scoped to `/api`, with a four-hour server-side lifetime. There is no CORS access. Host checks, bounded SSE buffering, 60 writes/minute, 180 reads/minute, stream reconnect limits and strict request fields reduce abuse. HTTP errors suppress provider exceptions. Static serving allows only the built index, JS/CSS assets and attribution. Checkpoints, ledgers, source files and `.env` have no HTTP routes.

An operator road command is `{id,worldId,type:"road",edgeId,blocked}`. The existing core rejects invalid or occupied edges and propagates observations only to affected inhabitants; it never gives every character immediate global road knowledge. This API supports controlled environmental evaluation without expanding the browser controls.

This is **one trusted local operator**, not public authentication or a multi-user service. The CLI binds only `127.0.0.1`. Cookie transport is plain HTTP solely for loopback; a public deployment would require TLS, Secure cookies, individual authorization, CSRF/origin review, operator-only writes, persistence/backups, and audited infrastructure limits. Do not expose this port or proxy live inference publicly.

## State, scheduling and persistence

`server/session.ts` serializes mutations around the original world. A checkpoint is flushed to a private temporary file and renamed before a frame is published. Inference runs outside that transaction, so deterministic movement continues while the provider is pending. Actor revisions and a pause/reset epoch reject stale replies and actions. Frames retain the existing version/session/sequence/world revision contract; the browser discards duplicate or older frames and freezes its view on disconnect.

The server advances in bounded quarter-second steps only while an authenticated SSE observer is connected. No observers means no clock advance or new autonomy. A started inference can finish after an observer disconnects, under the same budgets. Reconnection receives the committed snapshot. A pause invalidates pending inference results, including pause/resume before completion. Slow disk or event-loop stalls slow simulated time rather than causing a catch-up burst.

Ignored `runtime/neighbourhood-session.json` is a versioned envelope containing the validated world, memories/events, session sequence, controls, bounded transcripts, request counters, usage metrics and deduplication receipts. Restart restores these; incomplete conversations become failed receipts and are never automatically regenerated. Pending action confirmations do not survive restart. `runtime/neighbourhood-session.lock` prevents two CLI owners; after a crash, inspect the process and checkpoint before manually removing a stale lock. Missing/corrupt spending files are never recreated by live mode.

World reset creates a new world and clears its conversations, activities and memories. It preserves session generation counters, receipt history, wall-time throttles, approved evaluation consumption and the separate original spending ledger. The checkpoint is a rolling local recovery file, not a transactional database or audit archive. Do not delete checkpoints or ledgers to bypass limits. Back up ignored runtime files securely if they must survive machine loss.

The scheduler allows **one generation in flight globally**, no inference queue, and at most one pending action request per NPC. Requests while busy fail instead of accumulating. Decisions require meaningful core triggers, a 20-simulation-second autonomy cooldown, a three-wall-second character cooldown, six requests/minute and a lifetime limit of 48 per server session. Conversations share these limits. Duplicate client IDs return the recorded result, conflict, or previous failure without inference; 512 receipts is a hard interaction ceiling. No automatic inference retry or silent mock fallback exists.

## Decisions, conversation and Meta readiness

`server/inference/neighbourhood-provider.ts` supplies both mock and live implementations. Live mode fixes the model to `muse-spark-1.3`, uses `/v1/responses/input_tokens` and `/v1/responses`, strict JSON schema, low reasoning effort, `store:false`, a 2,048 output-token cap and a shared 20-second deadline. Tests substitute `fetch`; no milestone-5 evaluation has contacted Meta.

Only the selected character's existing observation and up to six recent turns are sent. Observations include their own identity, priorities, capabilities and bounded memories, known places/people, personally observed resources, and known tasks. They never contain another character's private state or unrestricted world data. Player utterances become uncertain **reports**, not world facts. Recorded NPC speech establishes that speech occurred; it does not establish that the statement is true.

Conversation output requires bounded dialogue, evidence IDs from the observation, uncertainty, and an optional strict NPC decision. Unsupported evidence is rejected. Prose grounding is instructed and evidence-checked, **not a proof of every factual sentence**; live evaluation must assess hallucination and identity fidelity. Consequential proposals are held separately and only the original action schema and semantic validator can execute them after confirmation. Saying “delivered” cannot transfer goods.

Milestone 6B adds [explicit service/product knowledge and structured recommendation claims](knowledge-grounding.md). New live dialogue schemas require `claims`; legacy four-field fixtures remain readable. Structured claims are checked against the NPC's established service knowledge and timestamped stock evidence. Empty/omitted claim coverage still cannot prove that all prose is supported. This revised schema has offline coverage and awaits separate live approval.

Mock conversation deliberately returns a **labelled fixture**, not keyword-matched natural dialogue. Live failure returns an error and no substituted response. Recorded replay is not implemented.

## Spending controls and separate live approval

Live inference reuses **`runtime/meta-probe-budget.json`**, preserving all earlier reservations and the existing lock/atomic-write accounting. No second spending history is created. It reserves the worst-case 6,000 input + 2,048 output tokens **before any provider request**, then checks exact preflight input is within the ceiling. At the configured Spark rates ($1.25/$4.25 per million input/output tokens), the reservation is **$0.016204** per generation. Full reservations remain after success, refusal, timeout or malformed output; actual token usage, model, latency and estimated cost are stored separately in the session checkpoint. Prices and account compatibility must be rechecked before approval; this is an application estimate, not an account-wide billing cap.

Daily/total limits continue using `META_PROBE_DAILY_USD` / `META_PROBE_TOTAL_USD` from local `.env` or process environment; defaults are $0.25/day and $1 total including old probe history. Daily rollover is Africa/Lagos. A failed reservation sends no HTTP requests. The global ledger lock covers the provider operation across processes. A missing/corrupt ledger, stale lock or exhausted allowance fails closed.

Live startup additionally requires an owner-approved `runtime/approved-live-plan.json`: `{id,approved:true,expiresAt,maxGenerations,maxEstimatedUsd,allowAutonomy}`. Maximums are 12 generations and $0.25; expiry must be future. Plan consumption is persisted before inference and survives reset/restart. A different plan ID fails until an explicitly reviewed migration. **No approved file was created by this milestone.** Presence of a key or a plan-shaped file is not user approval.

After separate approval only: `npm run backend -- --mode=live-meta`. This loads `MODEL_API_KEY` server-side. Never use it during ordinary development. Run `npm run meta:check` before an approved test and verify current official API/model/schema and prices.

### Proposed first live evaluation (not yet authorized)

1. One Spark 1.3 grounded question to Zainab about where she can obtain food, with autonomy disabled and the world paused. One generation, no retry; approve at most $0.025, with the $0.016204 reservation below that ceiling.
2. Check the returned model, evidence, uncertainty, dialogue, scoped request, latency, input/output usage and cost. Confirm no inventory or task mutation; any action stays unconfirmed. End the process after this request.
3. Only after reviewing that result, separately approve a small autonomous/cooperation evaluation covering refusal and an environmental change. The new nested decision/conversation schemas and response-model identity have mocked contract coverage; account acceptance still needs this controlled live verification.

## Checks

```sh
npm test
npm run typecheck
npm run build
npm run meta:check
```

Automated backend tests use temporary checkpoints and ledgers, HTTP bound to ephemeral loopback ports and mocked Meta responses. They cover snapshot consistency, auth/Origin/body guards, scoped requests, conversation/action separation, task/inventory regression, stale results, concurrency, deduplication, restart, failures, throttles and persistent budget exhaustion. Existing headless, taxi and presentation tests remain intact.
