# Real Muse HTTP/browser acceptance — November 3, 2026

**Partial acceptance; persistence reliability remains a live-demo blocker.** The genuine browser/server integration ran 43 Muse generations across all sixteen residents before a Windows checkpoint replacement failed with `EPERM`. The authoritative session stopped. The browser froze and reported backend unavailability without substituting offline decisions. This run was not resumed and no request was retried.

Run: `7g-http-20261103T111807Z`, session `fd858388-7357-4d21-a283-40a716ca9ccd`. The [approved envelope](live-http-browser-acceptance-plan.md) was 96 generations / $2, 8,000 input / 2,048 output tokens, shared 30-second deadline, six/minute, one pending inference, 1,800 simulated seconds / 30 wall minutes. The user's explicit request authorised this single run. No further run is authorised by this report.

## Actual provider use and decisions

| Measure | Recorded result |
| --- | --- |
| Model | `muse-spark-1.3`, Standard |
| HTTP calls | 43 token preflights + 43 generations; all returned HTTP 200 |
| Structured decisions returned | 43; all sixteen residents participated |
| Authoritative outcomes | 41 accepted; 1 ordinary rejection; 1 result discarded at an operator pause |
| Recorded usage | 224,966 input + 16,336 output tokens |
| Estimated cost | **$0.3506355**, including the discarded result |
| Retained worst-case reservations | **$0.804272** = 43 × $0.018704 |
| Observed token-preflight range | 4,672–6,395, below 8,000 |
| Full pipeline latency | min 3.263s / median 4.732s / max 9.020s; includes preflight/accounting |
| Last committed world | 181.25 simulated seconds, sequence 816; approximately 8½ wall minutes after server start |

Pricing was checked against [Meta pricing](https://dev.meta.ai/docs/pricing-rate-limits) and [model documentation](https://dev.meta.ai/docs/models): $1.25/million input and $4.25/million output, no cache discount assumed. These are local estimates from reported usage, not an independently reconciled provider invoice. The approved temporary $50 daily / $100 cumulative allowances and November 5 Lagos reversion remain unchanged.

[Every exact structured decision, validation and usage record](http-browser-live-decisions.json) is included separately. [Machine-readable acceptance and scope audit](nov3-live-http-browser-acceptance.json) includes participant counts, resource changes, pause/disconnection measurements and integrity hashes. Full private scoped inputs, initial state, checkpoint and sanitised provider traces remain in the ignored isolated evidence directory; credentials are excluded from public artifacts.

## Connected consequences

- Amina **2**, at 0.5s, independently ordered six food units for six credits. The explicit finite external source fell from 240 to 234; delivery occurred at 60.5s. No stock reset occurred.
- Zainab **20**, at 55.75s, saw zero stock and asked nearby Amina: “Market looks out of food right now — do you know when more may arrive or where else to check?” Amina **21** independently accepted/replied after delivery: “Market has food now — 6 portions in stock and sales are open.” Zainab **37** later bought one portion. This is a real face-to-face information exchange followed by an independently selected purchase, not a scripted meeting or proof that the reply caused the purchase.
- Ngozi bought food **10** and independently ate it **25**. Fatima and Maryam chose rest. Other residents prioritised income, travel or work. Zainab still held food with high hunger at interruption: a purchase is not completed eating.
- Twelve work activities completed, paying **21 credits**; eight further jobs held **13 credits** pending completion. Supply work produced six goods from finite inputs; four additional inputs were held in active work. There were three purchases and one consumed portion. Market stock ended at four; supplier stock at fourteen. Business funding was debited and wages paid by deterministic execution of accepted choices.
- Amina **29** initiated a separate introduction to Ngozi, pending at interruption. Her **36** introduction to Fatima was ordinarily rejected as `encounter-unavailable` while the earlier encounter remained pending. No invalid relationship or commitment was applied. Amina had no subsequent decision before interruption, so adaptation after this particular rejection is unobserved.
- No phone threads, new contacts, structured social-meeting invitations or relationship-counter changes occurred. This run does not extend earlier evidence into sustained hangout conversation or friendship. The earlier [200-generation evaluation](nov3-sustained-muse-live-evaluation.md) remains separate evidence.

Muse supplied the meaningful choices above. Movement, stock delivery, payment, work completion and timers were deterministic world mechanics. No synthetic fixture supplied these live decisions and no player message or phone control was used to create an interaction. This acceptance run did not include a matched offline counterfactual branch; earlier comparisons must not be attributed to it.

## Browser acceptance

| Check | Evidence / result |
| --- | --- |
| Correct provider and world | Authenticated browser API matched the isolated session/world IDs, `live-meta` and visible **Live Meta / backend**; actual `action-proposed` events identify `mode: meta`. |
| All residents | All sixteen buttons selected and displayed the correct resident before and after refresh/reconnection. |
| Activity and economy | The feed showed paid wholesale ordering, purchases, arrivals, work starts/completions and wages. Stock display changed from 1 to 0 to delivered stock and subsequent purchases. Event inspector retained the actual model proposal/validation IDs. |
| Phones | Bisi's read-only Contacts view showed Ngozi; Calls and Chats opened without acquiring control. Amina's phone initially opened; later polling correctly failed when the session became unavailable. No new phone conversation occurred. |
| Pause + refresh | Sequence 249, time 54.25, 14 returned requests remained unchanged for over 25 wall seconds across refresh; same session and world. |
| Pause during inference | Ngozi **14** returned across the pause boundary. Usage and reservation were retained, with `inference-unavailable` and **no action validation or execution**. Subsequent work choices used distinct requests. |
| Observer-free | Sole browser navigated away. SSE observer count stayed zero from world time 55.5 to reconnection at 92.25. Captures 74.898 wall seconds apart show 18→26 returned responses and 55.5→91.5 simulated seconds, without a browser observer. |
| Reconnect | Same world/session, later committed sequence and consequences; no reset or offline substitution. |
| Layout | Real desktop 1280×720 and mobile 390×844, canvas, resident selection and phone checked. No horizontal document overflow. Mobile labels are crowded; physical mobile hardware remains untested. |
| Failure | First phone read returned 503, then the test process closed. UI retained a frozen snapshot and explicitly said no local fallback or inference was running. No later provider dispatch or duplicated action is recorded. |

Browser captures and logs are under `output/playwright/http-*`; desktop/mobile/phone screenshots and real recording footage are retained. The pre-login 401 is expected. Later 503/connection-refused console entries correspond to the persistence stop, not a hidden offline switch. The recorded build had a stale accessibility description saying “mock residents” even in live mode; the visible mode and API were correct. The post-run source now uses the mode-neutral “autonomous residents”; no decision logic changed.

## Privacy, continuity and interruption

All **43** recorded input-scope audits passed: own biography, legitimate places, own private home, participant-only invitations, delivered communication, unchanged capabilities/work constraints, owned supply orders and resident-only rejection feedback. Public frames did not contain the API key, local token or raw resident knowledge/memory/need objects. The trusted observer's phone projection is separate from model knowledge; observing a phone does not give another NPC its contents.

Unauthenticated session/phone GETs returned 401. `.env`, runtime token and isolated evidence URLs returned 404. Login used an HttpOnly/SameSite cookie; no token appeared in a URL or recording. Client build scanning found no provider key. The loopback service is a trusted local operator service, **not a public multi-user security boundary**.

All protected operating saves, prior approvals/evidence and the entire historical ledger prefix were byte-preserved. Exactly 43 new reservations were added. No ledger lock or incomplete ledger transaction remained. Forty-three request identities were unique; repeated SSE events were identical, not duplicated executions.

The final read-only integrity audit found one maximum pending inference, zero unsettled provider calls and 598 total retained ledger reservations. Local money conservation also passed: 167 resident credits + 369 business credits + 13 held wages + 6 explicitly spent outside town = the original 555 credits. No unexplained money or goods were added.

The last-good checkpoint is valid at **sequence 816 / 181.25s**. The separately retained, valid but **uncommitted** replacement is sequence **817 / 181.5s**, with the same 43 request count. It was not promoted. Both checkpoints still say `paused: false`: failure prevented a new durable pause; the session was nonoperational and the HTTP driver stopped. Do not mistake that saved flag for permission to restart. The exclusive execution claim remains, and no stopped request is automatically resumed.

Evidence SHA-256: `1e871da4057cd5d4059fe767a0a582b20b0aa0477bab382f56465a11906add7c`. Committed checkpoint SHA-256: `cf55af9ae1c25323046de63eaa1c15867e9e875ffcbb79b7c70aa4645b0174a0`.

## Focused repairs and readiness

The OS returned `EPERM` during atomic replacement despite five rename attempts over 185ms. The files were ordinary archive files; the evidence does **not** identify the external lock holder or prove it was antivirus. The change allows transient Windows contention for a bounded **1.585s / eight rename attempts** on the same already closed/flushed file. It never rewrites the pending payload, deletes the last-good file, retries a model call or reapplies an action. Permanent errors still stop.

The new acceptance harness also tried to issue a pause command after persistence had already failed. That rejected and prevented its usual final report. An offline audit reconstructed this run from immutable evidence. The harness now closes a failed session and archives its last-good state honestly without demanding a writable checkpoint or pretending it paused. Regression coverage injects permanent replacement failure and verifies no provider call, unchanged checkpoint, retained pending file and a terminal report. Separate offline tests cover provider failure, serious validation failure, ordinary recovery, quota boundaries and late pause results. These fault tests are **synthetic**, not additional live provider tests.

The pre-execution baseline was 406 tests across 31 files. Post-repair validation passed **408 tests across 32 files** (481.37s), including 22 focused persistence/progression/harness checks. TypeScript and production build pass; the existing large routes-chunk advisory remains. A read-only in-memory restore preserved all sixteen residents and their existing inventories, money, locations, activities, memories, knowledge, relationships, tasks, resources, communication, orders, events and history. The last-good and pending file hashes remained unchanged. No commit, push, deployment, credential change or additional live run occurred.

**Recommended next gate:** one separately approved fresh HTTP reliability test after review, using all sixteen eligible residents, up to **64 generations / $1.25**, 8,000/2,048 tokens, 30-second deadline, six/minute, one pending, 1,800 simulated seconds / fifteen wall minutes. Worst-case reservation is **$1.197056** at unchanged verified pricing. This window permits normal browser polling beyond this run's approximately 8½-minute interruption point. Start from a fresh world/approval, repeat observer-free progression and pause/refresh, and check checkpoint replacements. This is a reliability check, not a request for another social success story. Do not resume this failed run. A clean live confirmation of the Windows repair is still unproven.
