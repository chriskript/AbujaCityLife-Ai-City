# Meta API setup and verification

The server-side integration has been exercised through bounded, separately approved Muse society evaluations, including the [200-generation November 3 run](nov3-sustained-muse-live-evaluation.md). Following an interrupted first browser test, the [fresh 64-generation HTTP/browser reliability evaluation](nov3-http-browser-reliability.md) completed normally with real decisions, pause/refresh, observer-free reasoning and 1,107 checkpoint replacements. Genuine Windows contention recovered safely; the bounded local integration is accepted, without claiming contention is eliminated or public hosting is ready. Browser gameplay and routine tests default to offline mode. No public inference endpoint is enabled.

The current approved hackathon allowances are **$50 daily / $100 cumulative through November 4, 2026**, reverting to the conservative $0.25/day and $1 cumulative defaults on November 5, Lagos time. Reservations and history are retained. These supersede the earlier dated allowance changes documented below; they do not authorise any particular run. Reviewed society runs use **8,000 input / 2,048 output tokens**, a **30-second shared deadline**, six generations/minute and one pending inference, with their own stricter generation/cost/time envelope. The original standalone taxi probe is retired; the shared budget settings remain supported.

## Offline foundation check

Store `MODEL_API_KEY` in the ignored project-root `.env`, or supply it through the backend process environment. Never place credentials in browser configuration, source control, logs, or commands saved to shell history. See [`.env.example`](../.env.example) for configuration names and defaults.

```bash
npm run meta:check
```

This command checks that `.env` is ignored and untracked, loads local configuration without displaying values, checks the model and probe limits, and reports whether credentials are configured. It does not authenticate, contact Meta, create a budget ledger, or make inference calls. Existing process environment values take precedence over `.env`.

## Retired standalone taxi probe

The standalone taxi contract probe and its CLI commands have been removed. For current town setup and separately approved live evaluations, use the [backend guide](backend.md). Shared model prices and cost calculations live in `server/inference/model-pricing.ts`; no prices or spending limits changed during removal.

The existing `META_PROBE_*` budget settings and `runtime/meta-probe-budget.json` remain in use by the town. Retain that ledger and its full reservation history. Ledger initialization remains an explicit operator action through the existing spending-control API; removing Taxi Lab does not initialize or replace runtime files.

## Budget accounting

Every generation reserves maximum uncached-input and output cost durably **before dispatch**. The town provider reserves its configured worst-case generation cost; final reported usage is separate accounting data. Reasoning tokens are already included in the output total and are not charged twice by the estimator.

Reservations are retained in full after success, timeout, or generation failure. The provider therefore stops conservatively rather than refunding uncertain charges. Actual estimated cost is reported separately. Daily accounting uses Africa/Lagos. Missing or corrupt ledgers, overlapping processes, stale locks, and budget exhaustion block inference. One ledger lock protects each budget transaction.

Persist `runtime/meta-probe-budget.json` across runs and deployments. Deleting or replacing it defeats spending history. A crash can leave a `.lock` or `.pending` file; investigate manually rather than clearing accounting automatically. The initial ledger must be created explicitly, so an unexpectedly missing ledger is never silently replaced by a live run.

The [backend](backend.md) reuses this same ledger, adding session limits, request deduplication and approved evaluation allowances. These controls do not cover other applications or keys using the same Meta account and depend on configured prices and reservation assumptions. The local operator service is not suitable for public exposure. Live scenario evaluation has occurred; reliable public hosting remains separate, unapproved work. See [submission access requirements](submission-materials.md).

## Verification boundaries

- Unit tests inject fake HTTP responses and do not use credentials.
- Local configuration checks establish readiness, not authentication or model access.
- Real responses must establish schema compatibility, usage fields, pricing assumptions, and latency before live functionality is claimed.
- Historical taxi probe results do not establish current town behaviour.

See [simulation architecture](architecture.md) and [provenance](provenance.md) for the execution boundary and current development status.

The [context investigation and policy](model-context-management.md) documents the Phase C preflight bottleneck, scoped input selection and measured offline reductions. The [proposed longer evaluation](milestone-7g-phase-d-plan.md) requires separate approval for an 8,000-token ceiling; existing profiles retain 6,000.
