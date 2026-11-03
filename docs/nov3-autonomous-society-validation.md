# November 3 autonomous society validation

Unity Gardens completed a **200-response live Muse evaluation across all sixteen residents**, including recovery after ordinary rejection, independent replies, voluntary contact sharing, an invitation-informed workplace visit and persistent economic consequences. No cooperation or successful outcome was forced. Completed extended hangout conversation and good need prioritisation remain unproven.

## Live evaluations

Both runs received separate explicit approval and used fresh isolated state. Both retained the reviewed 200-generation/$5 envelope, 8,000 input/2,048 output tokens, 30-second shared deadline, 1,800 simulated seconds, 90 wall minutes, six generations/minute and one pending inference. Neither operating town nor prior evidence was overwritten or resumed.

| Run | Returned / attempted | Accepted / ordinary rejected | Stop | Simulated time | Known estimated cost |
|---|---:|---:|---|---:|---:|
| [First continuity run](nov3-first-continuity-live-evaluation.md) | 55 / 56 | 55 / 0 | 30-second token-preflight timeout; pending Halima request retained | 183s reasoning + 60s deterministic drain | $0.45559225 + one unmeasured attempt |
| [Sustained follow-up](nov3-sustained-muse-live-evaluation.md) | 200 / 200 | 198 / 2 | Approved generation ceiling | 513.25s | $1.823308 |

Known combined usage: **1,426,585 input / 116,628 output tokens**, estimated **$2.27890025**, plus one conservatively unmeasured interrupted preflight. No generation dispatch was recorded for that preflight. Retained reservations for the two runs total **$4.788224**; global ledger now holds **555 entries / $10.321894**, preserving all historical reservations. Estimates use verified standard [Meta pricing](https://dev.meta.ai/docs/pricing-rate-limits), without cache discounts; these are not invoices. The temporary $50 daily/$100 cumulative allowances and existing November 5 Lagos reversion remain unchanged. Baseten was not integrated.

The successful follow-up made every meaningful choice through Muse. Deterministic navigation, timers, payments, consumption, production and delivery executed validated choices. Its maximum preflight count was 6,733, below 8,000. All responses have measured usage; no retry, fallback or interruption occurred. The first run's timeout was reported, preserved and not retried.

## Connected consequences, not just isolated choices

- **Failure → new choice → response:** Zainab's unavailable encounter was rejected without effects. Her next independently generated decision, with actual private feedback supplied, texted existing contact Amina. Amina independently replied about replenishment; Zainab later bought and ate. Grace also received a rejection for trying to respond to someone no longer nearby, then independently waited. Neither invalid proposal was rewritten, retried or made successful by policy.
- **Enquiry → invitation → visit → follow-up:** Sadiq texted Tunde about work. Tunde independently clarified and invited him to the public workshop. After receiving that reply, Sadiq explicitly chose travel “as invited,” arrived at 487.25s and sent an arrival confirmation at 489.5s. No repair job was open: no employment promise, wage or task was invented. The final message remained pending.
- **Introduction → number sharing:** Musa introduced himself to Sadiq and Grace, received independent replies and separately offered his own number. Both gained Musa as a contact; he did not automatically gain their numbers. These contacts survived paused save/load verification. Relationship counters did not change.
- **Economic continuity:** 64 completed jobs paid 103 coins; eight jobs still held 13 coins in wages. Four paid orders delivered 20 finite external food units. Sixteen portions were purchased across thirteen actions; thirteen were consumed and three remained carried. Live final supplier/market stock was 24/5. All local/external goods and money reconciled. No inventory refill, hidden cash or player intervention was used.
- **Personal priorities:** seven rests completed, and several residents explicitly changed plans for rest, food or information. Others kept working or could not obtain work/food. At the cutoff, six residents had hunger ≥0.8 versus zero in the equivalent offline baseline. Informed autonomous choice is demonstrated; uniformly prudent behaviour is not.

The matching offline baseline produced 18 supplies and consumed 13 meals, versus Muse's 16 and 13; it completed three paid transport deliveries, whereas Muse chose imports and information exchanges. At actual decision points 145 actions differed and 55 matched the offline proposal. This is behavioural divergence, **not proof that Muse is better**.

The successful run contained five valid encounter responses and three delivered text replies, but **no structured social invitation, socialise turn or completed shared-time hangout**. Social options were visible: all 200 schemas offered invitations and known public venues; 94 inputs included known nearby people and 187 usable remote contacts. The earlier [Grace–Maryam meeting](milestone-7g-informed-autonomy-live-evaluation.md) remains genuine evidence from its own run; it is not an event in the follow-up. No friendship or conversation completion was manufactured to fill this gap.

## Event ordering and persistence

The first audit checked 624 event IDs and 17,572 repeated snapshot appearances. The follow-up checked **1,739 IDs and 137,531 repeats**. Repeated payloads matched; times/revisions stayed ordered; request IDs were unique within each run. Scoped-input audits passed, including own biography, delivered messages, legitimate places, owner-only orders and private rejection memories.

Separate **paused offline checkpoint copies**, using providers that were never called, preserved gameplay, money, inventory, tasks, contacts, memories, transcripts, receipts, accounting and pending interruption evidence. Replaying a completed request against the restored world applied no effects. Original live artifacts, operating checkpoints and ledger were unchanged. This is recovery verification, not live resumption after save/load.

Audit detail: [first run](7g-continuity-live-audit.json), [follow-up](7g-continuity-followup-live-audit.json). Exact structured responses, relevant supplied context and outcomes are in [first decisions](7g-continuity-live-decisions.json) and [all 200 follow-up decisions](7g-continuity-followup-live-decisions.json).

## Defects found and focused offline fixes

1. **Encounter-purpose ambiguity:** `ask` is explicitly general advice; `request-help` is specialised transport discussion and requires the actor's existing capability. Model schemas reflect capability eligibility. Sadiq's exact earlier proposal remains rejected, with bounded private recovery and no rewritten action.
2. **Operator event visibility:** social meeting, replenishment and rejection/interruption events existed in the world but were omitted by the presentation whitelist. They now use the existing event feed/inspector. No NPC observations, events or outcomes are invented. A read-only browser fixture displayed seven actual events from the recorded Grace–Maryam acceptance/attendance; it executed no world actions and no model conversation.
3. **HTTP observer continuity:** a no-network contract reproduced zero advancement for approved autonomous society HTTP without SSE, while the headless driver advanced. The HTTP timer now permits observer-independent advancement **only for the explicitly approved autonomous society**, preserving legacy live observer gating, pause, one pending pulse and all budget controls.
4. **HTTP failure and reset safety:** the observer-independent HTTP driver pauses durably on provider interruption or serious rejected model proposals, with no retry/resumption. Ordinary rejections continue bounded recovery. Society Reset is refused: it previously could discard the social extension/state and re-enter a different reasoning path. Offline experiment resets remain available. No operating save was reset.

The last HTTP fixes were implemented **after the 200-response run**, not live-tested with additional Muse calls. Seven no-network HTTP regressions cover autonomy approval, legacy gating, generation limits, pause, provider/validation safe-stop, ordinary continuation and reset refusal. The headless evaluation coordinator and reviewed deterministic drain were preserved.

## Offline and browser results

- Original **393-test baseline passed**, followed by 395 after event-presentation coverage, and **402/402 across 30 files** after the final continuity/safety fixes.
- Both TypeScript projects and production build passed. The existing 603.59 kB routes-chunk advisory remains; no rendering redesign was introduced.
- Fresh 1,800-second offline rehearsal: **868 valid decisions, all sixteen residents active/eating, six completed paid deliveries, 49 meals, zero rejected proposals**. Restarts at 600/1,200s preserved gameplay/accounting; stale phone leases were cleared; exhausted allowances could not be replenished by restart/reset.
- Desktop/mobile browser: all sixteen selections, homes/buildings, Chats/Calls/Contacts, explicit phone-control acquire/release, actual ended call history, recorded events and progression display passed. Inspection acquired no lease or inference. A 390×844 viewport had no horizontal page overflow. This was desktop Chrome emulation, not physical-mobile testing.
- While the browser was at about:blank, the isolated offline town advanced **181 simulated seconds over 46.618 wall seconds**, preserving identity. Paused refresh retained time 888.5 and the world ID. It later reached 1,800s and paused automatically. The HTTP live-mode change is separately verified with synthetic no-network providers, not misrepresented as a live browser run.

[Browser evidence and screenshots](nov3-browser-acceptance.json) · [Presentation-fix validation](nov3-presentation-validation.json) · [Final checks and preservation audit](nov3-final-validation.json). The temporary browser servers/checkpoints were isolated from the operating town and all live evaluations.

## Remaining limits and submission readiness

No accounting, checkpoint, privacy-scope or action-authority inconsistency was found. Provider preflight reliability is not guaranteed by one successful 200-response run. Extended shared-time Muse conversation, home visits, lasting relationships, successful work for Sadiq and longer economic endurance remain unproven. The 200-generation cap ended the follow-up after 8m33.25s, not a complete 1,800-second life cycle. More credits alone would not establish those outcomes.

The default local app remains explicitly offline; the general backend command has not been switched to the all-resident society evaluation provider. The new live HTTP behaviour has offline contract coverage, but a real provider-backed browser society demonstration would still need its own isolated, explicitly approved configuration/run. Do not present the offline town or rendering fixtures as live Muse.

The [README](../README.md) now reflects demonstrated contact sharing and a workplace visit while retaining these limits. The [final three-minute walkthrough](submission-walkthrough.md) separates the live evidence from the offline app. A final recording, submission fields and any public demo URL still need preparation/verification; none was published or claimed complete here.

If another run is chosen, its purpose should be further independent responses, completed activities and choices informed by these actual experiences, with explicit state provenance and a fresh approval. It must not automatically resume either stopped run, retry Halima's request, inflate limits or chase a predetermined social outcome. No additional live run is authorised by this report.

No commit, push, deployment, production credential modification, new provider integration, weather, time-of-day or governance system was introduced.
