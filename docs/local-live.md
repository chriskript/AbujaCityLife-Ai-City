# Persistent local Muse operation

`npm run dev:live` builds and serves the existing Unity Gardens interface and the authoritative backend together. It uses the normal HTTP authentication, scheduler, resident observations, selective provider, semantic validators, deterministic mechanics and versioned checkpoint writer. No evaluation plan or session ID is required. Evaluation commands remain separate.

## First setup

Requires Node 22.12+ and a WebGL 2 browser. On Windows with PowerShell script restrictions use `npm.cmd` in place of `npm`.

```sh
npm ci
npm run backend:init
npm run meta:check
npm run muse:policy -- init
npm run muse:policy -- configure --daily-usd=.25 --total-usd=1 --requests=48 --tokens=500000 --input-tokens=8000 --rate=6 --concurrency=1
npm run muse:policy -- status
```

Run `backend:init` and policy `init` only once. They create files exclusively and refuse to overwrite existing files. Keep `MODEL_API_KEY` in the ignored root `.env` or process environment. `meta:check` checks configuration and Git exclusion offline; it does not verify the key with Meta. No key is placed in the frontend, URL, command arguments or startup output.

Existing installations must retain `runtime/meta-probe-budget.json` unchanged. **Only for a genuinely new installation with no previous spending history**, initialize the upstream ledger once:

```sh
npm run muse:policy -- init-meta-ledger
```

Never initialize a replacement for a missing historical ledger. Restore the original and investigate recovery artifacts. Local authorization never erases or replenishes either ledger.

Configure the limits you want, review `status`, then explicitly authorize:

```sh
npm run muse:policy -- authorize
npm run dev:live
```

If the existing canonical world carries a **legacy normal-backend live plan**, stop that backend and perform this one-time step **before** `authorize`:

```sh
npm run muse:policy -- authorize-migration
```

This authorizes the exact current `runtime/neighbourhood-session.json` by SHA-256 and reports its population, time and retained plan consumption. It does not migrate the world or enable inference yet; it disables inference until you run `authorize`. The next live startup makes a rollback copy and moves the original plan accounting into `legacyPlan` without changing request, economic or spending counters. A changed checkpoint needs fresh migration review. This command accepts no source path and cannot import dedicated society evaluation worlds. Once migrated, ordinary restarts need neither this command nor a new plan. Existing mock operating checkpoints without a plan migrate with their rollback copy automatically.

Authorization persists until disabled or reconfigured. To time-limit it, use `authorize --until=2026-11-04T23:00:00Z` with your intended future expiry. Configuration always disables inference and requires explicit authorization again. Optional per-process limits are `--run-requests=12 --run-usd=.25`; use `none` to remove either per-run limit. Lifetime request, token and spending counters survive all restarts and policy changes. Concurrency is explicitly limited to one and the maximum rate is six generations per minute, matching the existing API and scheduler safeguards. Input ceilings are the reviewed 6000 or 8000 tokens; output is capped at 2048. Changing the input ceiling requires backend restart.

**Initialization and migration do not authorize paid inference.** A previously authorized enabled policy permits autonomous inference as soon as the running society starts, even without observers. Pause is preserved across restarts. A new society starts running; keep the policy disabled if you only want to inspect it.

## Everyday operation

```sh
npm run dev:live
```

Open the URL printed by the server (default `http://127.0.0.1:8787/`, configurable with `PORT` in backend environment). Sign in with the token from `runtime/demo-access.json`; obtain it locally without sharing it. The access token is not the Muse API key. Browser refresh reconnects to the authoritative world; backend restart requires signing in again.

- **Pause / Resume** in the existing scene controls stops or starts authoritative advancement. Results from before a pause cannot execute after it, even if resumed before the response arrives.
- **Residents → Muse operation** shows inference availability, pending status, requests, reserved worst-case cost, remaining application dollars/requests/tokens, measured cost this process and stopped decisions. The Live Muse/Mock indicator remains explicit. The notice reports disabled, exhausted and failed inference. Remaining application budget does not promise upstream credit or key validity.
- **Activity → Inspect recorded events** shows resident proposals and validation outcomes. Muse provides public proposed actions; the authoritative world validates and executes them. Private inference context, credentials and hidden reasoning are never exposed.
- **Stop additional Muse inference** durably disables the policy. It does not refund an already dispatched request. Its late result cannot mutate the world. Existing deterministic movement, delivery and timers can continue until paused.
- To disable from a terminal at any time:

```sh
npm run muse:policy -- disable
```

Policy changes are observed while running and while paused. No setting silently substitutes mock reasoning. The only offline path in the full society provider executes an already accepted delivery through the existing deterministic mechanics.

To restart, use **Ctrl+C**, wait for shutdown, then `npm run dev:live`. Keep `runtime/neighbourhood-session.json`, its rollback copies and both spending ledgers. Normal shutdown releases only its own ownership lock. Restarts restore the same session, world, pause state, residents, memories, communications, work, inventories, economic state and world history. Persistent mode disallows the Reset control.

## Suspension and continuity

When Muse becomes terminally unavailable — allowance exhausted, authorization expired or revoked, upstream allowance exhausted, or a stopped policy — the society suspends automatically instead of advancing without minds:

- Default (`--on-exhausted=pause`): the society pauses with a persisted reason. The browser badge reads **Muse suspended**, the notice names the reason, and resume is refused until you re-authorize. Mid-travel residents, held wages, and escrowed deliveries resume untouched.
- Optional (`--on-exhausted=continuity`, requires explicit configure + re-authorize): the clock keeps running on deterministic continuity routines only. Continuity honours previously accepted deliveries and bounded self-maintenance (eating owned food, resting at valid places, stranded residents returning home); it never starts conversations, relationships, purchases, employment, negotiations, or social activity. Every continuity decision carries `continuity` provenance in the event record and the badge reads **Continuity routines** — never Live Muse.
- Transient states never suspend: rate-limit waits and in-flight requests keep the society running and recover on their own.
- Routine completions with nothing pending, calm needs, and no recent failure are handled by continuity without consuming a generation (at most two in a row per resident, then Muse is consulted). Suppression counts are recorded durably in the checkpoint and shown in the Muse status panel.

```sh
npm run muse:policy -- configure --on-exhausted=continuity
npm run muse:policy -- authorize
```

Re-authorizing with headroom clears the suspension on the next decision (continuity mode) or on resume (paused mode).

## Spending and failures

Local policy limits are **additional to** the original Meta ledger ceilings. The existing temporary $50 daily / $100 cumulative allowance and November 4, 2026 Lagos expiry are unchanged. After expiry the existing upstream mechanism restores its conservative ceilings without deleting historical reservations; if historical total already exceeds that cap, new inference remains blocked. Local authorization cannot override this.

Each dispatch reserves its entire input/output ceiling before provider entry. Reservations, including failures and unknown outcomes, are never refunded. Application tokens represent reserved ceilings, not measured consumption. Measured estimates shown in the UI cover successful known usage in the current process; durable reservations remain the conservative spending authority. Optional per-run limits intentionally renew on a new backend process; lifetime limits do not.

Network errors, invalid credentials, refusals and serious validation failures stop inference and pause the society. There are no automatic retries. A rate ceiling waits without sending requests; an exhausted allowance preserves the world and blocks additional inference. Backend tick/checkpoint failures retain the last committed snapshot and fail closed.

After a provider failure or crash during an in-flight request:

1. Inspect the status, Activity validation/errors and local ledgers. Never retry a previous request ID or edit counters.
2. Resolve credentials/network/budget issues. Pause the society and wait for pending inference to settle.
3. Use **Acknowledge stopped decisions** to abandon retained interrupted requests after review. This preserves the original interruption event and does not replay a result or re-enable spending.
4. Explicitly run `muse:policy -- authorize`, then Resume. Subsequent opportunities receive new request IDs and new reservations.

Offline startup diagnosis (no provider HTTP, checkpoint mutation, locks or build changes):

```sh
npm run build
npm run dev:live -- --check
npm run muse:policy -- status
npm run meta:check
```

Startup messages name the failing stage: credentials, browser access, local policy, upstream ledger, recovery files, frontend build, port or society ownership. `EADDRINUSE` means the configured port is busy: stop your own old backend cleanly or select another `PORT`; do not terminate unrelated processes. A checkpoint/profile error requires inspection of the saved envelope; an evaluation checkpoint is deliberately rejected.

Two launchers cannot own `runtime/neighbourhood-session.lock` concurrently. A crash deliberately leaves ownership and/or spending locks for operator review. **The application never deletes an existing lock to start.** Verify that its recorded PID is no longer active and inspect the checkpoint and any `.pending` transaction before manually recovering a stale lock. Preserve ambiguous pending spending records for reconciliation; do not delete them to regain allowance. A missing checkpoint with recovery artifacts is refused. Corrupt checkpoints are not replaced with fresh worlds.

On first live start, the canonical operating checkpoint (if present) is validated and migrated using the existing world upgrades; an exact flushed `.pre-local-muse-<uuid>.backup` is retained before its atomic replacement. A legacy live-plan record requires the exact owner migration authorization above; a dedicated society evaluation profile is always rejected. Historical evaluation worlds in `output/` are never searched, adopted, modified or resumed. If no operating checkpoint exists, a new sixteen-resident world is created once at that path. Before rollback, disable inference, stop the backend, retain a copy of the current envelope and restore a verified rollback copy atomically. Never roll back either spending ledger or approval/evidence files. Do not point mock mode at the live checkpoint.

## Offline development and evaluations

```sh
npm run build
npm run backend
# optional second terminal for frontend hot reload:
npm run dev
```

`backend` is explicit Mock mode, with no Meta calls, and uses `runtime/mock-neighbourhood-session.json` plus its own lock. It retains the existing bounded mock-development behavior. It serves the built UI on port 8787. Stop a live backend on that port or use separate development sessions; the normal Vite proxy targets 8787.

`backend:society`, `society:evaluate` and the legacy `backend -- --mode=live-meta` remain bounded evaluation paths requiring their separate approved plans. Use `dev:live` for ordinary local operation. The local policy neither replaces nor modifies evaluation approval records.

## Verification

```sh
npm run typecheck
npm run build
npm test -- --maxWorkers=1
npm exec vitest run tests/local-application.test.ts -- --maxWorkers=1
```

Integration fixtures use temporary directories and synthetic provider responses. They exercise all sixteen residents, observer-free scheduling, persistence, migration backups, authorization, budget limits, HTTP authentication and stop controls. No billable inference is necessary to run the tests. Provider access and actual Muse output still require an owner-authorized live run.

## Implementation map

| Area | Added or modified files |
| --- | --- |
| Local entry point and composition | `package.json`, `scripts/dev-live.ts`, `server/local-application.ts` |
| Owner commands and reservation controls | `scripts/muse-policy.ts`, `server/controls/local-policy.ts`, `server/controls/probe-budget.ts` |
| Persistent operating mode and HTTP controls | `server/session.ts`, `server/http.ts` |
| Existing interface and safe transport status | `client/src/neighbourhood.ts`, `shared/neighbourhood/presentation.ts` |
| Explicit mock development | `scripts/backend.ts` |
| Integration and owner-command verification | `tests/local-application.test.ts`, `tests/local-policy-cli.test.ts` |
| Documentation | `README.md`, `docs/backend.md`, `docs/local-live.md` |

Reused without replacing their engines or decision models: `server/progression.ts`, `server/inference/selective-provider.ts`, `server/inference/neighbourhood-provider.ts`, `server/persistence/replace-checkpoint.ts`, `shared/neighbourhood/world.ts`, `shared/neighbourhood/snapshot.ts`, and `client/src/simulation/remote-neighbourhood-session.ts`. Evaluation launchers and their approval paths remain separate.
