# Meta API setup and verification

The server-side integration has been exercised through bounded, separately approved Muse society evaluations, including the [200-generation November 3 run](nov3-sustained-muse-live-evaluation.md). Following an interrupted first browser test, the [fresh 64-generation HTTP/browser reliability evaluation](nov3-http-browser-reliability.md) completed normally with real decisions, pause/refresh, observer-free reasoning and 1,107 checkpoint replacements. Genuine Windows contention recovered safely; the bounded local integration is accepted, without claiming contention is eliminated or public hosting is ready. Browser gameplay and routine tests default to offline mode. No public inference endpoint is enabled.

The current approved hackathon allowances are **$50 daily / $100 cumulative through November 4, 2026**, reverting to the conservative $0.25/day and $1 cumulative defaults on November 5, Lagos time. Reservations and history are retained. These supersede the earlier dated allowance changes documented below; they do not authorise any particular run. Reviewed society runs use **8,000 input / 2,048 output tokens**, a **30-second shared deadline**, six generations/minute and one pending inference, with their own stricter generation/cost/time envelope. The original standalone probe and legacy defaults described below remain separate.

## Offline foundation check

Store `MODEL_API_KEY` in the ignored project-root `.env`, or supply it through the backend process environment. Never place credentials in browser configuration, source control, logs, or commands saved to shell history. See [`.env.example`](../.env.example) for configuration names and defaults.

```bash
npm run meta:check
```

This command checks that `.env` is ignored and untracked, loads local configuration without displaying values, checks the model and probe limits, and reports whether credentials are configured. It does not authenticate, contact Meta, create a budget ledger, or make inference calls. Existing process environment values take precedence over `.env`.

The generation probe does **not** automatically load `.env`. After explicit approval for paid inference, Node can load that file for the CLI using the command below.

## Live contract probe — approval required

Do not run generation without the project owner's explicit approval for paid inference. Availability of a key or `META_PROBE_ENABLED=true` alone is not approval.

Before an approved run, review the current [model prices](https://dev.meta.ai/docs/pricing-rate-limits), [structured-output contract](https://dev.meta.ai/docs/structured-output), and [token-counting endpoint](https://dev.meta.ai/docs/token-counting). Rates in [`meta-probe.ts`](../server/inference/meta-probe.ts) were checked October 27, 2026. Account-level model access and schema compatibility still require live verification.

Initialize the ledger **once**. This command makes no API calls and refuses to overwrite an existing ledger:

```bash
npm run probe:meta -- --init-budget
```

After approval, enable `META_PROBE_ENABLED=true` in local backend configuration and run:

```bash
node --env-file=.env --import=tsx scripts/probe-meta.ts
```

The CLI sends one token-counting request and at most one generation request to `https://api.meta.ai/v1`, with a shared 20-second deadline and no retries, hosted tools, or automatic fallback. It uses the Responses API so the same input can be counted before generation cost is reserved. Returned decisions undergo local schema and world validation; no taxi movement is executed by the probe.

Only `muse-spark-1.3` and `muse-wonder-1.0` Standard mode are allowed. Defaults are Spark 1.3, a **$0.25 daily probe limit**, a **$1 total probe limit**, a maximum 16,000 preflight input tokens, and a 2,048-token output cap including reasoning. Environment limit names are `META_PROBE_DAILY_USD` and `META_PROBE_TOTAL_USD`.

On October 31 the user authorised a temporary internal **$20/day** allowance through November 4, 2026. Local configuration pairs it with `META_PROBE_DAILY_USD_UNTIL=2026-11-04`; the shared ledger gate reverts to at most $0.25/day at November 5 Lagos midnight. Existing reservations, the separate $1 total limit, explicit live approval and all per-run ceilings remain. This changes no provider restriction or credential. The neighbourhood provider retains its stricter 6,000-input-token cap. See the [Phase B execution report](milestone-7g-phase-b-live-evaluation.md).

On November 1 the user separately authorised **$5 cumulative through November 4**, using `META_PROBE_TOTAL_USD_UNTIL=2026-11-04`. This supersedes the prior $1 cumulative setting during that period only. The same gate restores at most $1 at November 5 Lagos midnight without erasing reservations; if retained spending reservations exceed $1, new calls fail closed. Every live run still requires its own approval and ceiling. See the [Phase C execution report](milestone-7g-phase-c-live-evaluation.md).

The result reports provider identity, model, decision, validation, latency, token usage, and estimated cost. Raw exceptions are suppressed to protect credentials. A disabled probe prints a notice and makes no network calls:

```bash
npm run probe:meta
```

That last command is safe only while `META_PROBE_ENABLED` is unset or false in the process environment. Use `npm run meta:check` for an unconditional offline check regardless of configuration.

## Budget accounting

Every generation reserves maximum uncached-input and output cost durably **before dispatch**. The preflight count is used conservatively for a single generation with no hosted tools; final reported usage is separate accounting data. Reasoning tokens are already included in the output total and are not charged twice by the estimator.

Reservations are retained in full after success, timeout, or generation failure. The probe therefore stops conservatively rather than refunding uncertain charges. Actual estimated cost is reported separately. Daily accounting uses Africa/Lagos. Missing or corrupt ledgers, overlapping processes, stale locks, and budget exhaustion block inference. One lock covers the whole probe.

Persist `runtime/meta-probe-budget.json` across runs and deployments. Deleting or replacing it defeats spending history. A crash can leave a `.lock` or `.pending` file; investigate manually rather than clearing accounting automatically. The initial ledger must be created explicitly, so an unexpectedly missing ledger is never silently replaced by a live run.

The [backend](backend.md) reuses this same ledger, adding session limits, request deduplication and approved evaluation allowances. These controls do not cover other applications or keys using the same Meta account and depend on configured prices and reservation assumptions. The probe and local operator service are not suitable for public exposure. Live scenario evaluation has occurred; reliable public hosting remains separate, unapproved work. See [submission access requirements](submission-materials.md).

## Verification boundaries

- Unit tests inject fake HTTP responses and do not use credentials.
- Local configuration checks establish readiness, not authentication or model access.
- Real responses must establish schema compatibility, usage fields, pricing assumptions, and latency before live functionality is claimed.
- A successful contract probe alone does not establish live completion of scenarios A, B, and C.

See [simulation architecture](architecture.md) and [provenance](provenance.md) for the execution boundary and current development status.

The [context investigation and policy](model-context-management.md) documents the Phase C preflight bottleneck, scoped input selection and measured offline reductions. The [proposed longer evaluation](milestone-7g-phase-d-plan.md) requires separate approval for an 8,000-token ceiling; existing profiles retain 6,000.
