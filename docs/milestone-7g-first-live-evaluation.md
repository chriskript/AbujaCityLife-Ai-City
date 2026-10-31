# Milestone 7G: first approved live town evaluation

Evaluated October 31, 2026 after explicit approval of a six-generation, $0.10 one-shot run. **Six genuine Muse proposals passed authoritative validation and changed the world. The independent two-resident Muse criterion was not met.** Amina chose self-restocking throughout; Musa received no Muse call. No outcome or dialogue was substituted to manufacture cooperation.

## Configuration and evidence

Run ID: `7g-b-20261031T083448`. Model: `muse-spark-1.3` Standard, low reasoning effort, strict structured output, `store:false`, no tools, no retries. Each generation retained the existing 6,000-input / 2,048-output-token bounds, exact preflight and 20-second deadline. All six completed, passed the provider schema guard and were accepted by the world executor. The run ended paused at its **180 simulated-second bound**, after 252.805 wall seconds. Seventy-one routine decisions kept the wider town active.

Ignored evidence is retained under `output/society-7g/7g-b-20261031T083448/`: `initial-world.json`, flushed `evidence.ndjson`, `session.json`, `offline-session.json` and `report.json`. The evidence contains exact scoped requests, before/after world snapshots, raw structured outputs, public explanations, validation events, usage and identical-input offline choices. It contains no API credential or private model reasoning. `runtime/society-7g-7g-b-20261031T083448.claim` remains consumed; recovery cannot dispatch the run again. The expiring approval and before-run ledger/integrity record remain ignored runtime evidence.

Both branches began with the normal sixteen-resident `town-v1` seed. Amina and Musa were eligible for meaningful Muse opportunities; the others and routine mechanics used the existing offline policy. The model received the actual deciding resident's observation, not the operator world snapshots retained separately as evidence. No home, private need, memory, contact or inbox of another resident was injected. No player instruction asked Amina to contact Musa or collect stock.

## Exact structured decisions

Every decision had `goalId: "restock"`. The action and public `reason` fields below complete the exact structured decisions; full original JSON is retained in the evidence.

| Call / simulated time | Action | Public reason | Validation |
| --- | --- | --- | --- |
| 1 / 0.5 s | `{"destination":"centre","type":"travel"}` | Stock is low so I am going to the supply desk to restock. | Accepted |
| 2 / 20.5 s | `{"quantity":2,"type":"collect-self"}` | At supply desk with low stock so collecting supplies to restock stall. | Accepted |
| 3 / 40.5 s | `{"destination":"market","type":"travel"}` | Carrying full supplies at desk, heading to stall to restock. | Accepted |
| 4 / 60.5 s | `{"quantity":2,"type":"stock-stall"}` | At market stall with 2 goods in hand and empty stall, restocking to serve customers. | Accepted |
| 5 / 80.5 s | `{"destination":"centre","type":"travel"}` | Stall is empty and I carry nothing, so going to centre to collect supplies. | Accepted |
| 6 / 100.5 s | `{"quantity":2,"type":"collect-self"}` | Stall is empty and desk shows supplies, so collecting stock to restock. | Accepted |

These are choices of actions, not movement-frame or inventory-arithmetic generations. Nonetheless, calls three and four were routine continuation opportunities that the selector should have left to deterministic execution.

## Validated consequences and limits

At call two, supplier stock moved **8 → 6** and Amina's carried stock **0 → 2**, respecting her two-unit capacity. After physical return travel, call four moved her carried stock **2 → 0** and market stock **0 → 2**. Zainab bought a portion at second 60.75 and Grace at second 63.5, each paying two demo credits through the normal economic system. Their purchases were independent **offline-policy** responses, not Muse decisions. This is genuine cross-resident economic consequence, but not two-resident Muse reasoning.

Call six moved supplier stock **8 → 6** and Amina's carried stock **0 → 2** again. By second 180, the live town had produced six supplies and consumed four meals; supplier stock was six and market stock one. Amina held two supplies and 28 credits; Musa retained ten credits. No transport task or model-originated commitment was created. In particular, no new verified delivery relationship or negotiated arrangement can be claimed.

The six-generation cap then prevented Amina's next selected reasoning opportunity. Because the original selector treated even carrying stock back as another shortage decision, she remained at the depot holding the second batch at the end. This is an evaluation/routing limitation, not a failed physical transport execution or a stock loss.

Final snapshot validation passed; no pending checkpoint files or ledger lock remained. The operating server checkpoint, operating headless checkpoint and `.env` matched their before-run hashes. Only the explicitly approved spending ledger reservations, isolated evaluation state and approval/claim evidence changed. No credential was modified; no commit, push or deployment occurred.

## Comparison with the offline policy

For identical scoped inputs, the offline policy would have requested Musa's help in calls one, two, five and six. It agreed with the model's return/stock actions in calls three and four. Thus Muse selected a different legitimate strategy; it did not simply reproduce all six offline proposals.

The separate all-offline branch used the identical initial serialized world, speed and 720 clock/decision pulses. By second 180 it had completed one four-unit paid delivery, with a second offer pending. It also produced six supplies and consumed four meals; supplier stock was eight and market stock two. The live branch completed no courier delivery and retained two goods with Amina. These aggregate outcomes do not establish that the model strategy was better. They also reflect the routing/call-cap limitation described above; this is not an unconstrained equal-throughput intelligence benchmark.

The model's short public explanations were relevant to observed stock, its actual location and own capacity. It did not invent cooperation, violate bounds or claim a delivery had completed. There was no live negotiation, refusal, adaptation to another model's response, disagreement resolution, or independent Muse recipient to evaluate in this run. Amina's repeated self-collection is behavioural divergence, not proof of superior planning or emergent society reasoning.

## Usage and spending

| Call | Input tokens | Output tokens | Latency including preflight | Estimated token cost |
| --- | ---: | ---: | ---: | ---: |
| 1 | 4,296 | 552 | 12,105 ms | $0.00771600 |
| 2 | 4,556 | 237 | 3,777 ms | $0.00670225 |
| 3 | 4,673 | 337 | 5,989 ms | $0.00727350 |
| 4 | 4,955 | 287 | 4,045 ms | $0.00741350 |
| 5 | 5,602 | 377 | 4,493 ms | $0.00860475 |
| 6 | 5,511 | 246 | 3,669 ms | $0.00793425 |
| **Total** | **29,593** | **2,036** | **34,078 ms** | **$0.04564425** |

Costs use the existing uncached-input/output rates; they are application estimates from returned usage, not a refreshed provider invoice or credit balance. Six preflights and six generations were made, with zero retries and zero provider failures. The ledger retained six full reservations totalling **$0.097224**, without refunding the unused difference. Lifetime reserved accounting moved **$0.042286 → $0.139510**. The local $0.25/day and $1 total limits were not raised. The separate $100 allocation, credit expiries and key-to-billing-team mapping remain unverified.

## Correction and next evaluation

After the run ended, the selector was corrected offline: a stock-capable resident already carrying supplies uses the existing deterministic return/stock routine rather than paying again merely because a historical shortage remains in memory. Delivered requests, commitment choices and newly discovered road changes still receive their higher-priority reasoning opportunities. This correction neither changes the six recorded decisions nor regenerates their history. A regression test exercises collection, return and stocking with no continuation calls to the synthetic Muse delegate.

Post-correction validation: **297 tests passed across sixteen files**. Both TypeScript projects, production build and whitespace checks passed; the existing shared-renderer chunk warning remains. No additional live evaluation was used to validate this correction.

The next evaluation should broaden actual reasoning opportunities, not just increase the dollar ceiling. Use a small diverse selection and include a genuinely delivered incoming request from normal simulation history so the recipient receives an independent decision opportunity without requiring model-chosen cooperation. Any offline warm-up or initial message must be labelled as such. A subsequent model-generated offer and independent model task response can then be evaluated separately. Preserve refusal, deferral, clarification and self-help as possible outcomes.

Recommend preparing a reviewed run of up to twelve generations under a $0.25 run ceiling, with appropriate explicit approval for any necessary daily-limit adjustment. This is within the user's $10 outer ceiling but is **not authorized by the completed six-call approval**. No further live calls were made. The full 7G success criterion remains outstanding.
