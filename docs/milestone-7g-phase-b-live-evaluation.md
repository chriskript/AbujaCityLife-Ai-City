# Milestone 7G Phase B: approved Unity Gardens evaluation

Evaluated **October 31, 2026**, after explicit approval in the working session to increase the internal daily allowance and run the prepared experiment that day. **The run stopped at invocation two on an invalid employment proposal. The independent social-interaction success criterion was not met.** It was not retried or resumed.

## Allowance change and execution approval

Inspection confirmed that `META_PROBE_DAILY_USD=0.25` was an application ledger limit, not a provider restriction. The ignored local `.env` now sets **$20/day**, with `META_PROBE_DAILY_USD_UNTIL=2026-11-04`. The common reservation gate applies the allowance through November 4 inclusive and restores a maximum **$0.25/day at November 5, 00:00 Africa/Lagos**. Existing reservations remain intact. The backend, contract probe and society evaluation all pass that expiry into the same gate; offline readiness reports its effective value.

The separate **$1 cumulative allowance remains unchanged**. It is not a provider account balance. The user's approximately $149.75 credit balance and expected post-hackathon expiry were not independently reverified, and were not substituted for application limits. No billing, team, key or provider-imposed restriction was changed. Only the two daily-budget settings changed in `.env`; credential equality was verified without printing the key. The evaluation-specific CLI guard now admits a $20 daily allowance while retaining its prior cumulative-setting guard and the independent per-run ceiling.

The earlier proposal to wait until November 1 was superseded by explicit October 31 approval and successful headroom checks. The new one-shot approval was `runtime/approved-7g-phase-b-plan.json`, with run ID **`7g-b-unity-20261031T101827Z`**, `notBefore: 2026-10-31T10:18:27.129Z` and expiry thirty minutes later. Its exclusive claim remains consumed. Approval did not permit retries, a replacement run or expansion of this run's bounds.

Before dispatch, the existing ledger held $0.097224 in same-day reservations and $0.139510 overall. The full twelve-call reservation ceiling of **$0.194448** fit both the revised daily allowance and the unchanged $1 cumulative allowance. [Official pricing](https://dev.meta.ai/docs/pricing-rate-limits) was rechecked immediately before execution: Spark 1.3 Standard remains $1.25/million uncached input tokens and $4.25/million output tokens. No pricing calculation or token ceiling changed.

## Configuration and selected residents

The normal sixteen-resident `town-v1` seed ran in isolated state, with Unity Gardens' history grants, biographies, original homes/locations, businesses, economy and communication rules. The all-offline baseline began from identical serialized state. Neither branch wrote to operating town checkpoints.

Selected residents were **Amina** (stock and assistance decisions), **Musa** (independent transport responses), **Chris** (newer courier/apprentice, introductions and local work), and **Halima** (supply coordination and optional social/economic choices). Selection made them eligible; it did not prescribe actions or guarantee calls. Amina and Chris received Muse invocations before the stop. Musa and Halima received none.

Model: `muse-spark-1.3` Standard, low reasoning effort, strict structured output, `store:false`, no hosted tools, no retries. Limits remained **12 generations, $0.25 incremental, 180 simulated seconds, five wall minutes, 6,000 preflight input tokens and 2,048 output tokens per invocation**, with the existing 20-second provider deadline and 24,000-character input guard. Routine actions remained offline. No scene disruption, task, introduction or message was injected to encourage cooperation.

## Exact Muse decisions and authoritative outcomes

### Invocation 1: Amina, simulated time 0.5 seconds

Opportunity: `known-stock-shortage`. Her observation supplied her own stock-management background, current goals/resources/capabilities, legitimate knowledge and contacts, starting origins/character/concerns, and scoped connections. It did not contain other residents' private biographies, needs, homes or inboxes.

Exact structured output:

```json
{
  "action": {"destination": "centre", "type": "travel"},
  "goalId": "restock",
  "reason": "Stall is low on stock, going to supply desk to collect goods myself."
}
```

Authoritative validation **accepted** this choice (`event-84`, request `society-7g-initial:decision-2`). Amina began the existing 40-metre market-to-centre route. At the stop she had travelled two metres along it; her logical node remained `market`. She had not reached the desk, collected supplies, restocked or earned money. This is a valid strategic self-collection choice followed by partial deterministic travel, not a completed restocking outcome.

On the identical input, the offline policy would have texted Musa to discuss paid supply delivery. The model's alternative was allowed. The run did not force it to contact him.

### Invocation 2: Chris, simulated time 1 second

Opportunity: `optional-encounter`, because unknown people were legitimately nearby. This classification made reasoning available; it did not require an introduction. Chris's own background described his recent arrival and repair/courier experience. His supplied skills were **general, repair and transport**. His known work list contained **repair-workshop** and **community-errands**, both with unknown current availability. It contained no supply-production vacancy.

Exact structured output:

```json
{
  "action": {"businessId": "supply-desk", "type": "take-work"},
  "goalId": "earn",
  "reason": "At centre desk with funded opening, taking supply work for income."
}
```

Authoritative validation **rejected** this proposal with **`missing-skill`** (`event-92`, request `society-7g-initial:decision-4`). Chris does not have the `supply` skill. His observation also did not establish a known, funded supply-desk opening. Being present at the centre and having courier experience does not establish production eligibility or vacancy availability.

The rejection created no work booking, wage reservation, job commitment, inventory change or payment. Chris remained idle. The coordinator immediately stopped the experiment, persisted both branches paused and retained the failed proposal. It neither substituted the offline action nor requested another model answer. The offline policy on the same input would have travelled to the known repair workplace to inspect its openings.

## Interaction and persistent consequences

Two distinct residents received genuine scoped Muse requests; only Amina's proposal passed authoritative validation. **There was no model-originated communication, independent Muse recipient response, new personal introduction, accepted transport task or completed model-mediated interaction.** No friendship, business partnership or agreement can be claimed.

At the stop:

- All sixteen resident records remained present. Live and baseline simulation time were both **1 second**.
- Amina was two metres into her accepted route; she had not completed it.
- Routine offline policy left Musa waiting until second 60.25 and had Zainab one metre into travel to the market. Those are not Muse decisions.
- Resident money, goods, personal food, rewards, phone contacts and successful-job relationships were unchanged from the initial state.
- Tasks remained empty; no work or transport commitment was added.
- Supplier goods remained **8**, market goods **1**, sales open; no stock, production, consumption or financial development occurred.
- Normal proximity notices added event-backed memories/recognition evidence for nearby residents, plus Musa's observed waiting activity. A sight notice did not disclose identities, exchange numbers, establish trust or create friendship. The authored history was not rewritten.
- Both isolated checkpoints are paused. The original operating checkpoints remained byte-for-byte unchanged.

The persisted accounting records **2 paid invocations and 2 routine offline decisions**. The report's `reasoningActors` records only Amina because it counts accepted model proposals; the two actual provider invocations are retained separately in `decisions` and the raw evidence.

## Usage, latency and accounting

| Invocation | Actor | Preflight tokens | Actual input tokens | Output tokens | Provider latency | Estimated token cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Amina | 4,945 | 4,802 | 463 | 6,344 ms | $0.00797025 |
| 2 | Chris | 5,216 | 5,073 | 432 | 5,227 ms | $0.00817725 |
| Total | | 10,161 | **9,875** | **895** | **11,571 ms** summed | **$0.01614750** |

Total coordinator wall time was **13,242 ms**. Actual input counts were below their respective preflight counts and both were below the 6,000-token cap. Two preflights and two generation requests completed; no HTTP request or consequential action was automatically retried. These successful responses verify configured-key/model access during this run, without implying access or credit availability indefinitely.

The original ledger added exactly **two nonrefundable $0.016204 reservations**, totalling **$0.032408**. A rejected world action does not refund its model invocation. Same-day reservations now total **$0.129632** and lifetime reservations **$0.171918**. Remaining application headroom is **$19.870368/day** and **$0.828082 cumulative**, before any other future spending.

Token costs above are calculated from measured usage at the conservative uncached rates; they are not independently reconciled provider billing or an updated credit-balance reading. Known token cost, worst-case reservations and credit balance remain distinct. No usage is unknown for these two invocations.

## Equivalent offline comparison

For identical requests, Amina's offline counterpart selected a text to Musa and Chris's selected travel to repair work. In the separate all-offline branch at second 1, Amina's message was **queued**, due for delivery at second 5.5; Musa had not received or answered it. Chris had just started travel to the repair shop. Both branches had unchanged money/resources and no transport tasks at the matched stop.

These differences show valid strategy divergence for Amina and unsupported employment selection for Chris. They do not establish superior offline or Muse social performance: the safety stop ended the sample before recipient responses or economic completion could occur. The baseline's queued message is neither an accepted commitment nor a completed social outcome.

## Did Unity Gardens history influence decisions?

The operator review is retained separately in `context-review.json`; raw model outputs and authoritative events remain unchanged.

| Actor | Explicit public explanation | Supported history assessment |
| --- | --- | --- |
| Amina | Refers to low stock and self-collection. | No explicit historical reference. Her biography is compatible with the choice, but current goals and observed stock already explain it. Context supplied does not prove context use. |
| Chris | Claims a funded opening and seeks income. | No explicit historical reference. The funded-opening assertion is unsupported by his observation. A possible confusion between courier work, visiting a supply desk and supply production is **operator interpretation**, not the model's stated motivation. His occupation already mentioned supply courier work before this history enhancement. |

No private model chain of thought was requested or inspected. No live history ablation was run. **Improved reasoning, meaningful social influence and a causal benefit from history remain unestablished.** The failure should not be attributed to the new biography without further evidence.

## Evidence and integrity

Ignored evidence directory: `output/society-7g/7g-b-unity-20261031T101827Z/`. It contains the exact system instructions, scoped requests, structured outputs/public explanations, provider attempt metadata, validation events, before/after state changes, matched baseline, usage and persistent accounting.

Primary files: `evidence.ndjson`, `initial-world.json`, `session.json`, `offline-session.json`, `report.json`, `report.md`, `context-review.json`, `integrity-audit.json`, `readiness-before.json`, and protected-file fingerprints. The original approval, consumed claim and before-run ledger record remain under ignored `runtime/`. No API key or private model reasoning is recorded in these artifacts.

Integrity checks passed: operating backend/headless checkpoints, the post-allowance `.env`, and the previous six-generation approval file matched their before-run hashes. The earlier allowance-change audit separately verified that credentials and unrelated `.env` settings did not change. Ledger growth was exactly the two recorded reservations. Both evaluation checkpoints validate; no ledger lock or pending checkpoint file remains. No commit, push or deployment occurred.

## Offline verification

Before the live run, all **32 focused tests** for ledger accounting/expiry, Phase B safeguards and offline credential inspection passed. Both TypeScript projects and the production build passed; Vite retained its existing large shared-renderer chunk warning. Offline readiness verified full twelve-call headroom without spending or changing the ledger.

After the run, the exact rejected Chris proposal was added as an offline regression fixture. It confirms that the proposal remains `missing-skill` and cannot change his skills, work, inventory, money, stock or tasks. Expiry tests cover the inclusive November 4 Lagos boundary, invalid dates, preservation of the total allowance, and rejection above the reverted daily limit independently of the cumulative limit.

The initial parallel full-suite run passed 314 tests and hit wall-clock timeouts in two existing long simulation tests. A complete serial rerun (`npm test -- --maxWorkers=1`) passed **317 tests in all 18 files**, including the new recorded-proposal case, with **no timeout changes**. `git diff --check` passed. No test performs an additional live Muse generation.

## Recommended larger session, requiring separate approval

Do not relaunch this consumed plan or spend its unused ten calls. First address employment grounding **offline**: make it explicit that `take-work.businessId` must come from the actor's legitimately known posted work, with matching skill, physical location and established funded availability. Preserve the authoritative `missing-skill` rejection and add this exact live proposal as a regression fixture. Do not give Chris a supply skill, invent a vacancy or weaken validation to make the proposal succeed.

After that verification, recommend **one new 36-generation session**, maximum **$0.60**, **600 simulated seconds** and **20 wall minutes**, with all sixteen residents eligible for Muse at meaningful social/economic choices. Keep movement, personal care, inventory and accepted-task execution offline. Prioritise genuinely delivered invitations and commitment responses ahead of repeated optional initiations, so limited inference can examine independent responses. Do not require conversations, cooperation, recipient quotas or successful deliveries.

At the unchanged per-invocation reservation, 36 generations need **$0.583344**, fitting the current **$0.828082** cumulative headroom without raising the separate $1 allowance. Existing runtime plan guards intentionally do not yet allow this larger run; it needs a new reviewed bounded plan and offline safeguard checks before approval or implementation. The $20 daily allowance alone does not authorise it.

Evaluate valid-action rate, how many residents independently initiate and respond, refusals/clarifications, changes after received information, accepted versus completed commitments, ordinary economic consequences, and explicit references to legitimately scoped history. Retain the exact-input and matched-time offline comparisons. Stop for the same validation, provider, accounting and persistence failures. Report absent interaction as an outcome rather than adding fabricated scenarios or spending more calls until cooperation appears.

This is a recommendation for a more informative autonomous sample, not a promise of emergent society or a reason to consume expiring credits.
