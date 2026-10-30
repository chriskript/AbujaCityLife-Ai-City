# Milestone 6C: first live autonomous decision

Evaluated October 30, 2026. This was **live Meta Muse Spark 1.3 Standard inference**, not a mock decision. One generation was made, with no retry. The conditional Musa call did not occur. Prompts, schemas, fixture setup and inputs were not changed to obtain a preferred result.

**Result: a contextually reasonable intention produced an invalid executable proposal.** The application rejected it safely. This is not a successful cooperation or delivery demonstration.

## Starting state and supplied observation

The unchanged `prepareAutonomyFixture()` performed explicitly labelled deterministic setup through validated movement before inference. After setup, the simulation clock stayed at **26 seconds** and no background scheduler or HTTP timer ran. The main browser/demo checkpoint was not used or modified.

| Relevant fact | Amina | Musa |
| --- | --- | --- |
| Location/activity | Market Square, idle | Market Square, idle |
| Occupation | Market trader | Taxi driver |
| Personal goals | Restock; serve customers | Earn; rest |
| Needs | Stock 0.8, income 0.4, food 0 | Income 0.8, stock/food 0 |
| Carried goods / rewards | 0 / 0 | 0 / 0 |
| Relationships / commitments | None | None |
| Relevant knowledge | Stall 1, sales open; supplier 8 | Stall 1, sales open; supplier quantity unknown |

Authoritative starting resources were supplier **8**, market **1**, sales open, no tasks or blocked roads. These world facts were not sent wholesale to the model.

Only Amina received an inference observation. It contained:

- Her own identity, personality (careful with stock, resourceful, values dependable assistance), priorities, needs, goals, current fixture-labelled intention, inventory, relationships and capabilities.
- Known places: Taxi Stand, Market Square and Community Centre supply desk. Services/products were separately identified as taxi pickup, food retail/food portions, and stock collection/stall supplies.
- Her last-observed market quantity/open status from time 0 and eight supplier goods from time 10, explicitly marked **historical**, not guaranteed current availability.
- Six bounded memories: identity; one market item observed; arrival at the supplier; eight supplies observed; return to market; and a nearby-arrival event at time 25.75. Each retained its provenance and interpretation.
- Nearby Musa: name, taxi-driver occupation, idle activity. No Musa private goals, needs, memories or supplier quantity were included.
- No known tasks or blocked edges, and the supported action types: travel, wait, work, propose transport, collect self, stock stall, set sales and share.

The actual consumed triggers were `activity-completed`, `person-arrived` and `restored`; low stock was represented by the existing stock observation and need 0.8. There was no player instruction or newly invented low-stock trigger. The exact bounded request is retained locally in ignored `runtime/milestone6c-amina-request.json`, including observation timestamps and evidence IDs. It contains no credential or private reasoning trace. No Musa observation was dispatched.

## Model proposal, validation and execution

Exact model output:

```json
{
  "action": {
    "quantity": 8,
    "recipient": "musa",
    "type": "propose-transport"
  },
  "goalId": "restock",
  "reason": "Stall is low and I am at the market, asking Musa here to help bring supplies from the centre desk."
}
```

The model selected the restocking goal and transport assistance without being instructed to choose cooperation. Its public explanation matched the supplied low-stock context, locations and nearby taxi driver; it did not claim a delivery was complete.

However, **quantity 8 violates the application's 1–6 quantity constraint**. Meta returned HTTP 200 with `status: completed`, but the local `isNpcDecision` contract rejected the decision. It was stopped inside the provider before authoritative semantic action validation/execution. No transport task existed afterwards, so Musa was correctly skipped rather than given a fabricated request. No alternative generation or mock substitution followed.

The core recorded `inference-unavailable` and request/accounting bookkeeping. Amina's generated intention was **not adopted** into authoritative character state. No inventory, resources, rewards, activities, positions, relationships or character memories changed. Simulation time stayed 26; both characters stayed idle. No accepted commitment, collection or delivery occurred.

## Usage and spending

| Measurement | Amina | Musa |
| --- | --- | --- |
| Model | `muse-spark-1.3` | Not invoked |
| API HTTP/status | 200 / completed | — |
| Generation latency | 8,741 ms | — |
| Provider latency including count/accounting | 10,448 ms | — |
| Token-count endpoint input | 2,241 | — |
| Reported usage input/output | 2,098 / 1,275 | — |
| Reasoning tokens, count only, included in output | 1,205 | — |
| Cached input | 0 | — |
| Estimated additional cost | **$0.00804125** | $0 |
| Full reservation retained | **$0.016204** | $0 |

There was one token-count request and one generation request, with no hosted tools. The two-call ceiling was $0.032408 within the authorised $0.04 allowance, using [Spark Standard pricing](https://dev.meta.ai/docs/pricing-rate-limits) checked before dispatch. The existing ledger's $0.026082 history remains intact; it now retains **three reservations totalling $0.042286**. Retained reservations are conservative accounting, not reported actual charges. The isolated evaluation checkpoint and exclusive stage records are retained; no automatic replay is allowed.

## Limitations and next step

This result demonstrates unprompted selection of a plausible strategy from an existing NPC opportunity, and effective rejection of an invalid proposal. It does **not** establish reliable executable autonomy or independent NPC-to-NPC cooperation.

The principal defect is contract mismatch: the API JSON Schema permits any integer quantity, while the application allows 1–6, and that numeric limit was not provided in Amina's observation. The model used the observed supplier count of eight. Carrying/transport limits are also not explicit in observations. This missing constraint context must be distinguished from inventing stock or locations. Historical supply availability remains uncertain, and a short model explanation is not proof of exhaustive reasoning.

The backend also collapses this local validation failure into the generic `inference-unavailable` event; the exact rejected proposal is available in the sanitised evaluation evidence rather than the normal action timeline. Better rejection classification would improve browser inspection.

Recommended next step: align the exported schema's numeric bounds and observed capability limits with the existing validator, and add offline boundary/rejection tests. Then separately approve a fresh bounded branch against the unchanged fixture. Once a validated live action exists, use the existing backend snapshots/event stream to show its actual task/activity consequences in the browser; keep background live inference disabled. Do not change the fixture or force cooperation to improve the outcome.

All **153 tests passed** after evaluation. No production code, prompt or fixture was changed. No commit, push or deployment was performed. Detailed evidence is retained in ignored `runtime/milestone6c-live-result.json`, the isolated checkpoint and stage records; raw reasoning traces and authentication headers were not retained.
