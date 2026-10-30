# Milestone 6A: one controlled live conversation

Conducted October 30, 2026, under explicit approval for one Muse Spark 1.3 generation, no retries, and a $0.025 allowance. This was **live Meta inference**, not a mock response.

The existing authenticated HTTP conversation endpoint, authoritative session, Meta provider, dialogue validator and persistent ledger were used unchanged. Autonomous inference and the HTTP clock were disabled, the saved world was paused, and no proposal confirmation was sent. Only Zainab's existing observation and bounded conversation context were supplied. `.env` passed the offline ignored/untracked check; no credential or authentication header was recorded.

Player message:

> Hi Zainab. I'm new around here. Where can I get something to eat?

Zainab's exact spoken response:

> Hello, welcome! I'm Zainab, also running errands around here. For food, you could try the Market Square stall and the Community Centre supply desk. I'm not sure right now though — last I saw the market stall had 0 goods, and earlier the centre desk had 8 supplies, but that may have changed. Worth checking both?

| Measurement | Result |
| --- | --- |
| Model reported by API | `muse-spark-1.3` |
| Meta generation HTTP / response status | `200` / `completed` |
| Application endpoint HTTP | `200` |
| Generation requests / retries | 1 / 0 |
| Token-counting requests | 1; no generation performed by this endpoint |
| Dialogue schema and evidence-ID validation | Pass |
| Uncertainty / proposed decision | `true` / `null` |
| Generation round-trip latency | 5,487 ms |
| Provider latency including preflight/accounting | 6,739 ms |
| Preflight input context tokens | 1,601 |
| Billed-usage input tokens | 1,458 |
| Output tokens, including reasoning | 881 |
| Reasoning tokens (count only; no traces retained) | 754 |
| Cached input tokens | 0 |
| Estimated inference cost | $0.00556675 |
| Conservative reservation retained | $0.016204 |

Current [Meta prices](https://dev.meta.ai/docs/pricing-rate-limits) were checked before dispatch: Spark Standard input/output are $1.25/$4.25 per million tokens. The provider reserved its full 6,000-input/2,048-output ceiling before any Meta HTTP request. The original $0.009878 reservation remains intact; the ledger now has two entries totalling $0.026082 in conservative reservations. Reservations are not actual charges and are never refunded automatically. The separate evaluation allowance is consumed and cannot authorise a second request.

## Grounding assessment

**Partially grounded.** Zainab knew Market Square and the Community Centre supply desk. Her own memories recorded a market purchase, zero remaining stall goods, and eight supplies previously observed at the desk. The response used these counts accurately, described them as past observations, and admitted uncertainty. It invented no destination, stock count, completed action or new character.

However, suggesting the **Community Centre supply desk as a place to obtain food is unsupported**: her observation identifies generic supplies, not food or a retail service there. Uncertainty softens the claim but does not establish the missing affordance. The existing validator proves schema shape and that cited IDs are supplied; it does not establish that each sentence follows from those IDs. This is a semantic grounding limitation, not a clean grounding pass.

## Consequences and follow-up

The conversation persisted two events and corresponding structured memories: the player's utterance as an uncertain report, and the NPC's actual utterance as observed speech. World revision and session accounting changed. Locations, activities, inventory, resources, tasks, commitments and simulation time did not change. No consequential decision was proposed or executed. The service was closed after evaluation; the checkpoint remains paused. No production code changed and no further live requests were made. The full 129-test regression suite passed after evaluation.

Before another paid test, make known food-service affordances explicit and add offline grounding checks for supply-desk versus food-stall recommendations. Then separately approve the smallest autonomy/cooperation evaluation: a prepared, clearly labelled co-located fixture where Amina independently chooses how to address low stock, followed by Musa independently accepting or declining **if she chooses to request assistance**. Alternative legitimate decisions must remain valid outcomes. Verify the resulting task transition and each actor's event-derived memories; separately budget any further decisions needed for collection and delivery. Conversation alone does not establish autonomous multi-character reasoning.

Detailed sanitised evidence and the one-shot execution guard are retained only in ignored `runtime/milestone6a-live-result.json`. No secrets or private reasoning traces are included. No commit, push or deployment was performed.
