# Bounded Muse context in Unity Gardens

Prepared November 1, 2026. No additional Meta requests were made for this investigation. The next live run requires separate approval; see the [proposed evaluation](milestone-7g-phase-d-plan.md).

## What stopped Phase C

The preserved run `7g-c-unity-20261101T085502Z` contains nine successful generations and a tenth attempt stopped at preflight: 6,045 input tokens against a 6,000 ceiling. This was a conservative local stop, not a model context-window limit. The tenth attempt did not generate or execute an action. Its input was Amina's next decision after Musa independently accepted discussing a transport request. The original evidence remains unchanged.

The failing visible payload comprised 13,855 JSON input characters, 7,308 instruction characters and 5,118 schema characters: 26,281 combined. The first Amina request contained 10,448 input characters. Instructions and schema were fixed; growth was primarily accumulated memories and their repeated evidence representation.

| Failing observation component | Characters | Interpretation |
| --- | ---: | --- |
| Actor | 5,363 | Includes 3,105 memory characters, up from 938 in the first request; 1,171 cached knowledge characters |
| Place knowledge | 2,562 | Structured facts/availability, overlapping cached knowledge and place identities |
| Scoped history | 1,688 | Own biography plus granted public facts; essentially unchanged from the first input |
| Memory evidence | 1,014 | A second representation of memory identifiers and provenance |
| Communication | 828 | Delivered exchange needed for Amina's follow-up |
| Known employment | 662 | Skills, availability, location, funding and eligibility remain useful |
| Place identities | 451 | Partly repeated alongside place facts |
| Action constraints / permitted actions | 308 / 221 | Small and essential; retained |

These are nested section measurements, not additive token allocations. The 7,308-character instructions and 5,118-character action schema also represent substantial fixed overhead. **Only the historical total preflight counts are exact model tokens.** Meta's [token-counting documentation](https://dev.meta.ai/docs/token-counting) describes model templates and server scaffolding; character counts cannot establish exact post-change token totals. No API tokenizer was called.

Within the old instructions, core/decision/conversation rules contribute 3,646 characters, communication 1,244, history 906, employment 882 and location 630. The largest schema branches are communicate (473), respond-communication (424), encounter (353) and respond-encounter (339). Both transport-response variants together contribute 504. These social alternatives are meaningful; the solution retains permitted alternatives and removes unavailable branches and conversation-only prose from autonomous inputs, rather than forcing a narrow storyline.

## Implemented context policy

`server/inference/model-context.ts` projects an already authorised `NpcObservation`. It has no access to the world, canonical biographies or other residents' private state. No resident knowledge, save, memory or event is deleted or rewritten.

- Merge place identities, facts and availability; preserve partial/complete/unknown semantics, timestamps, sources, freshness and evidence IDs. Missing availability explicitly means unknown. Keep all known travel alternatives.
- Remove duplicated actor knowledge caches, capabilities and memory-event wrappers. Represent memory provenance/interpretation once. Keep known identities, transporters, phone contacts and relationship states distinct.
- Preserve current needs, goals, inventory, skills, own biography, current activity, resources, blocked routes, all capabilities, permitted actions, constraints and complete employment grounding.
- Keep every active transport task, recently terminal tasks, pending encounters, active threads and unexpired accepted help discussions awaiting a proposal. Keep recent terminal exchanges as additional context. Accepted discussion remains different from a task commitment.
- Keep all reports, beliefs, commitments and outcomes, non-world sources, speech-only records, place availability evidence, verified observations and memories about current locations, work, tasks or exchange participants. Fill remaining memory slots by topic relevance and recency (preferred total 12, never a cap on mandatory records).
- Select only relevant **already granted** neighbourhood facts. Always retain the resident's own biography. History never supplies another person's private motives or compulsory behaviour.
- Use concise instructions for the relevant domains; move conversation-only claim rules out of autonomous decisions. Send only permitted action-schema branches. The authoritative full schema and world validator still decide whether a proposal is executable. Any memory reference outside the supplied subset is rejected.
- Remove a player transcript turn only when it exactly duplicates the current explicit message. Earlier distinct statements remain.

The projected JSON has a soft target of 16,000 characters and a hard ceiling of 24,000, preserving the existing hard input bound. Optional memories and archived threads may be removed to meet the soft target. Mandatory content can exceed the soft target; exceeding the hard bound fails closed before network dispatch. This is deliberately not unlimited summarisation: critical reported facts are never silently compressed into stronger claims or dropped merely to fit. Long conversations or many mandatory reports can still stop a future run and require review.

Selection emits included/mandatory/omitted IDs and character counts. Evaluation evidence records the raw scoped request, exact projected input, exact instructions, actual narrowed schema, provider preflight, output and validation separately. The exact prepared body is reused for the single preflight and generation. There is no automatic compaction retry, ceiling escalation or consequential-action retry.

## Offline measured effect

`npm run context:profile` reads the preserved evidence without credentials, ledger access or network. A portable fixture retains the exact first and failing scoped requests for regression coverage. The [profile artifact](model-context-profile.json) includes all ten local captured inputs, section counts, selection manifests and projected payloads, with a SHA-256 of the original evidence.

| Input | Old JSON | New JSON | Old combined visible text | New combined visible text | Reduction |
| --- | ---: | ---: | ---: | ---: | ---: |
| First Amina decision | 10,448 | 7,630 | 22,874 | 16,287 | 28.8% |
| Blocked Amina follow-up | 13,855 | 9,049 | 26,281 | 17,706 | 32.6% |

Across the ten inputs the combined visible reduction is 28.5–34.9%. Autonomous instructions are 4,216 characters in these observations. Amina's applicable schema is 4,441 characters. The delivered Musa reply, actionable constraints, biography and freshness/evidence semantics survive the blocked-request regression. **The new token total and reasoning quality are unmeasured until an approved live run.** Less text is not evidence of better reasoning.

## Ceiling and reservations

Keep 6,000 as the default for existing integrations and approved profiles. Recommend an explicit **8,000-token preflight ceiling only for the separately reviewed next profile**, retaining 2,048 output tokens, low reasoning effort, a 20-second invocation timeout and no hosted tools. This gives modest headroom for legitimate multi-step social state while context selection addresses avoidable growth. A larger ceiling alone would postpone the same bottleneck.

Meta's [model documentation](https://dev.meta.ai/docs/models) lists a 1,048,576-token context window for Muse Spark 1.3. The proposed 8,000 limit is supported within that window. The [standard pricing](https://dev.meta.ai/docs/pricing-rate-limits), checked during this investigation, remains $1.25 per million input tokens and $4.25 per million output tokens.

| Input ceiling | Output ceiling | Full uncached reservation per generation |
| ---: | ---: | ---: |
| 6,000 | 2,048 | $0.016204 |
| 8,000 | 2,048 | $0.018704 |

The increase is $0.0025 (15.43%) per generation; 48 full reservations total **$0.897792** within the proposed $0.90 run ceiling. Durable reservations happen before any provider HTTP request and remain after failures or success; measured usage costs are reported separately. Historical reservations are preserved. No budget or credential settings changed in this task.

The read-only readiness check finds effective daily $20 and cumulative $5 through November 4 Lagos time, reverting to $0.25/day and $1 cumulative on November 5. Existing cumulative reservations total $0.333958, leaving $4.666042 of cumulative reservation headroom. This is capacity, not a spending target. Authentication and current provider access remain unverified without a new request. The inspector's comparison to the older Phase B whole `.env` fingerprint is false because the configuration has changed; it is not a credential authentication result. The current `.env` matches the protected post-Phase-C fingerprint.

## Verification and limits

Regression coverage exercises the exact 6,045-token request, private scoping, uncertain/partial facts, contradictory reports, pending help, memory-reference validation, employment eligibility, hard overflow without network, identical preflight/generation bodies, retained reservations and no retry at 8,001 tokens. A twenty-minute offline soak projects eligible observations for all sixteen residents while paid work and delivery continue; projection does not mutate world saves.

The longer synthetic coordinator rehearsal uses 48 offline decisions under fake live mode to test accounting, evidence, authoritative actions, timeout margins and refusal to resume an existing evidence directory. It is not Muse evidence. Existing communication, economy, navigation, persistence, employment and autonomy regressions remain part of the full suite. Final test/build results are recorded in the [evaluation plan](milestone-7g-phase-d-plan.md).

Offline counterfactuals receive the **same selected information before wire deduplication**, represented as a typed observation; they do not parse the model's compact JSON. A parallel offline town advances for the same elapsed simulated time. These two comparisons answer different questions and must not be conflated with causal evidence of model improvement.
