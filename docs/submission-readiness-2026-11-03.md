# Submission readiness — November 3, 2026

This was the earlier focused encounter-purpose checkpoint. The subsequent two live runs, browser acceptance and final 402-test result are in [November 3 autonomous society validation](nov3-autonomous-society-validation.md).

## Encounter-purpose correction

Model-facing instructions now distinguish **introduce** (identity exchange), **ask** (general questions/advice, including food and work) and **request-help** (specialised transport-assistance discussion requiring the initiator's own propose-transport capability). Remote general discussion uses chat. Prepared schemas expose request-help only to residents who possess that capability. This is capability grounding, not an automatic action rewrite. The authoritative world and communication capability guards remain unchanged.

Regression coverage replays Sadiq's exact decision 94 from run `7g-informed-20261103T054118Z`. It remains rejected as missing-assistance-capability. No encounter, commitment, inventory, money, relationship, recipient knowledge or recipient memory is created by rejection.

That specific reason is now eligible for existing bounded ordinary-rejection recovery. It discloses the actor's own missing capability, not private recipient state. Feedback explains the purpose distinction without selecting a replacement. The affected resident gets a fresh request identity and scoped observations; duplicate submission does not execute again. Three identical failures within 120 seconds still impose a 120-second resident cooldown, including through save/load. Other residents and deterministic mechanics can continue. The coordinator-level offline rehearsal confirms that the next separately supplied choice can be **wait**, without forcing the suggested ask alternative or cooperation, and without offline policy substitution.

Missing contacts, unknown/private recipients or venues, missing consent, unrelated missing capabilities and malformed responses retain fail-closed classification. Provider, persistence and accounting protections are unchanged. The prior live run's historical rejection classification/report has not been edited; this is a forward-looking code change.

## Can attended meetings become completed conversations?

**The execution and scheduling path is technically available; genuinely live completion remains unproven.** Existing arrival and social-partner-arrived triggers schedule further meaningful reasoning, the prepared schema exposes socialise when both residents are available and consented, and utterances trigger a partner response opportunity. Repeated consecutive speech from the same resident is blocked. Separate turns update experienced socialExchanges; they do not automatically create trust or friendship. Completion of agreed shared time is a deterministic event, not fabricated speech.

The new regression exercises arrival-triggered requests without player-interaction triggers, two distinct synthetic turns, save/load, relationship counters, exactly one shared-time completion and a subsequent decision opportunity. Existing refusal, withdrawal, private-home, separate-travel, consent and delivery tests remain.

A separate read-only offline check loaded the actual Grace–Maryam stopped checkpoint into an in-memory copy. Both existing triggers exposed socialise; two explicitly synthetic turns executed and shared time completed at **295.75s** with two experienced utterances each. The checkpoint, prior live evidence and spending ledger were unchanged. This check did **not** resume the live evaluation or call Muse. It proves executability from the recorded state, not that Muse would choose these words/actions or that completion entails friendship. No scheduling/execution blocker was found, so no social scheduling code was changed.

## Validation

- Focused encounter/social contracts: **15/15 passed**.
- Coordinator recovery contracts, including the exact purpose rejection followed by an independent wait: **2/2 passed**.
- Full offline suite: **393/393 tests passed across 29 files** (287.01 seconds).
- Both TypeScript projects and production build: **passed**. The existing 603.59 kB routes-chunk advisory remains.
- All **94 recorded decision requests** reprojected successfully without mutation; capability-purpose enums checked. Maximum projected input: **15,864 characters**, below the existing 24,000 hard cap. Exact new provider token counts require an approved preflight; no live tokenizer request was made.
- All **14 previously protected operating/configuration/prior-evidence hashes** match. The actual latest stopped checkpoint and ledger also match before/after the offline meeting check. No credentials or temporary allowances changed.
- README relative documentation links resolve. Browser rendering/recording was not freshly rehearsed by this task; the October 31 browser rehearsal is explicitly dated in the walkthrough.

Offline artifacts: `output/offline-attended-meeting-20261103.json` and `output/encounter-context-reprojection-20261103.json`. Synthetic fixtures/tests are not additional live evidence.

## Remaining demonstration blockers

There is no known software blocker between mutual attendance and conversation. Muse remains free to leave, work, rest or stay silent, so a fresh run cannot guarantee the Grace–Maryam scene repeats or completes. General action validity, context capacity, provider latency/access and persistence can still interrupt execution; the safeguards must remain. Nutrition and economic continuity remain imperfect, and durable relationship development, comparable post-failure learning and longer-term sustainability are not established by the latest short run.

The most reliable submission uses the working offline town plus clearly labelled recorded live evidence. A final screen recording, verification of the installed build/access flow, judge-facing submission fields and any public demonstration URL remain presentation tasks. No new video, public URL, deployment or completed submission is claimed here.

## Most effective final evaluation, only if approved

One fresh isolated `7g-d-society` run is justified if it will not displace recording/submission. Retain the reviewed **200 generations / $5 incremental / 8,000 input / 2,048 output / 30-second shared deadline / 1,800 simulated seconds / 90 wall minutes / six generations per minute / one pending inference**, all sixteen residents and existing response priority. These are ceilings, not targets. Reverify pricing, access, token counts, full-run reservation, ledger headroom, checkpoint hashes and a new execution window before a separate exclusive approval. The last reviewed rates reserved $3.7408 for the envelope; that is not a new current-pricing verification.

Use the normal fresh town, no seeded invitations, biographies as obligations, prewritten dialogue or special resident routing. Measure independent initiation/recipient choices, socialise turns after attendance, agreed-time completion, departure or subsequent plans, actual relationship counters, and any ordinary rejection followed by a distinct informed choice. Continue recording economic/personal choices, costs and validity, including mistakes and non-cooperation. A planned early stop after adequate evidence may save time/credits, but must be recorded and must not fabricate completion or bypass pending-request protections. Do not restart or automatically retry on serious failure. Do not resume the previous stopped request/meeting just to finish it live.

If no natural conversation occurs, submit the accepted invitation/attendance and economic evidence honestly. Another live run is optional for submission readiness, not a prerequisite for recognising the behaviour already demonstrated.

## README and walkthrough

The [README](../README.md) remains concise and public-facing, with local setup and explicit offline/live distinctions. Its Muse claims and evidence link now reflect the independently initiated and attended meeting while stating that completed social conversation and lasting friendship changes remain unproven. The [three-minute submission walkthrough](submission-walkthrough.md) is ready as a recording guide, with a clean separation between the offline app and the recorded live evidence.

No new live API calls, commits, pushes, deployments or credential changes were made.
