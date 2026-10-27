# Meta API setup and verification

The current Meta integration is a **standalone server-side contract probe**, not live gameplay or a public inference endpoint. Routine tests and demonstrations use a scripted mock provider and make no Meta requests.

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

The result reports provider identity, model, decision, validation, latency, token usage, and estimated cost. Raw exceptions are suppressed to protect credentials. A disabled probe prints a notice and makes no network calls:

```bash
npm run probe:meta
```

That last command is safe only while `META_PROBE_ENABLED` is unset or false in the process environment. Use `npm run meta:check` for an unconditional offline check regardless of configuration.

## Budget accounting

Every generation reserves maximum uncached-input and output cost durably **before dispatch**. The preflight count is used conservatively for a single generation with no hosted tools; final reported usage is separate accounting data. Reasoning tokens are already included in the output total and are not charged twice by the estimator.

Reservations are retained in full after success, timeout, or generation failure. The probe therefore stops conservatively rather than refunding uncertain charges. Actual estimated cost is reported separately. Daily accounting uses Africa/Lagos. Missing or corrupt ledgers, overlapping processes, stale locks, and budget exhaustion block inference. One lock covers the whole probe.

Persist `runtime/meta-probe-budget.json` across runs and deployments. Deleting or replacing it defeats spending history. A crash can leave a `.lock` or `.pending` file; investigate manually rather than clearing accounting automatically. The initial ledger must be created explicitly, so an unexpectedly missing ledger is never silently replaced by a live run.

These controls cover this probe only, not other applications or keys using the same Meta account. They depend on the configured prices and reservation assumptions. The probe is not suitable for public exposure. A production HTTP service, application-wide rate limiting, request deduplication, caching, reconciliation, and full live scenario evaluation remain planned.

## Verification boundaries

- Unit tests inject fake HTTP responses and do not use credentials.
- Local configuration checks establish readiness, not authentication or model access.
- Real responses must establish schema compatibility, usage fields, pricing assumptions, and latency before live functionality is claimed.
- A successful contract probe alone does not establish live completion of scenarios A, B, and C.

See [simulation architecture](architecture.md) and [provenance](provenance.md) for the execution boundary and current development status.
