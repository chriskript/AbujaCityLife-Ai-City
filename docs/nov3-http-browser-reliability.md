# Muse HTTP/browser reliability — November 3, 2026

**Accepted for the bounded local HTTP/browser evaluation.** A fresh, isolated 64-generation run completed normally after the Windows persistence repair, with real Muse decisions and 1,107 successful authoritative checkpoint replacements. It ran continuously past the earlier failure window. This is evidence of a reliable bounded local demonstration, not proof that Windows contention has been eliminated or a certification of public hosting.

Run `7g-http-reliability-20261103T123036Z`; session `eadc6540-8255-4ae3-b5cd-fef66630c97b`. The previous interrupted run, its uncommitted pending replacement and execution claim were never resumed, promoted or altered.

## Approved envelope and preflight

The user separately approved this single run: **64 generations / $1.25 incremental**, 8,000 input / 2,048 output tokens, 30-second shared deadline, fifteen wall minutes, all sixteen residents, six generations/minute and one pending inference. The native 1,800 simulated-second bound remained. There were no automatic request retries, resumptions or offline substitutions.

Official [Meta prices](https://dev.meta.ai/docs/pricing-rate-limits) and [model availability/limits](https://dev.meta.ai/docs/models) were rechecked: `muse-spark-1.3` Standard, $1.25/million input and $4.25/million output. Full-run reservation was **$1.197056**. Preflight found $42.649328 daily and $88.873834 cumulative reservation headroom before this run. The existing $50/day and $100 cumulative allowances through November 4, with November 5 Lagos reversion, were preserved. Authentication was verified by the first bounded invocation, without an extra paid probe.

Operating checkpoints were validated read-only; previous evidence, pending files, credentials and the ledger prefix were hashed and protected. A fresh approval window, exclusive execution claim, private local access token and isolated checkpoint were used. Source/build hashes remained unchanged throughout execution. The production build was served only on loopback port 8791.

## Actual results

| Measure | Result |
| --- | --- |
| Provider traffic | 64 token preflights + 64 generation requests; every response HTTP 200 |
| Muse responses | 64 across all sixteen residents |
| Authoritative actions | 63 accepted, zero rejected; one response discarded at an operator pause |
| Offline decision requests | Zero |
| Recorded usage | **344,377 input / 28,151 output tokens** |
| Estimated incremental cost | **$0.550113**, including the discarded response |
| Retained reservations | **$1.197056**, 64 new records; historical prefix untouched |
| Pipeline latency | min 2.542s / median 5.779s / max 10.800s, including preflight/accounting |
| Token preflights | 4,676–6,550; below 8,000 |
| Total runtime | **807.820s — 13m 27.8s** |
| Longest continuously unpaused interval | **618.639s — 10m 18.6s** |
| Final world | **243.25 simulated seconds**, sequence **1107**, paused |
| Maximum pending inference | One; no unsettled provider call or interruption at completion |

Costs are conservative local estimates from reported usage, without cache discounts, not an independently reconciled provider invoice. [Exact structured decisions and validations](http-reliability-live-decisions.json) and the [machine-readable scope/persistence audit](nov3-http-browser-reliability.json) accompany this report. Full private inputs and sanitised provider/replacement traces remain in the ignored isolated evidence directory.

## Windows persistence evidence

Read-only process-local diagnostics record each replacement's target, outcome, attempt number and elapsed time. They contain no checkpoint payload, key or cookie and do not change retry bounds, authority or action execution.

- **1,107 successful `session.json` replacements**, matching the final committed sequence.
- **177 successful replacements after the final continuous interval exceeded 510 seconds**. Paused/startup time was excluded. The run therefore did not pass merely by ending before the previous approximately 8½-minute failure point.
- One real session-checkpoint `EPERM` at **484.177s of session age**. The *same flushed file* succeeded on attempt **two**, **38.275ms total elapsed**. No new provider request or world action was needed to recover that file operation.
- The ancillary `status.json` file also encountered `EPERM` twice in one replacement, then succeeded on attempt three. There were **3,127 successful status-file replacements**. Neither target had a terminal replacement failure.
- Final checkpoint valid and durably paused; no `.pending` file, ledger lock or incomplete ledger transaction remained. Read-only restore preserved all identities, inventories, balances, locations, activities, memories, relationships, communications, orders, tasks, events and shared history.

**Qualification:** the observed recoveries were within the old 185ms retry window. This run does not establish that the extension to 1.585s caused the successful outcome, nor identify the external lock holder. It does show the repaired system operating beyond the former failure window, observing and safely recovering genuine contention, and completing its bounded accounting/reporting path. Permanent-failure behaviour remains covered by offline fault injection; no paid provider failure was manufactured.

## Integrated browser acceptance

- Browser session/world IDs matched the actual isolated server and remained stable through refresh/reconnection. Visible **Live Meta / backend**, API `mode: live-meta`, real Meta proposal metadata and the recorded provider traffic agreed.
- All sixteen resident selectors were exercised before and after refresh/reconnection. Activities, resources and real model-driven economic/communication events appeared in the feed. Read-only phone inspection showed Amina's legitimately existing Musa and Zainab contacts without taking control or sending a player prompt.
- Pause and refresh retained **sequence 10 / time 0.5 / two requests**, with no new reasoning while paused. Amina's response **2** crossed the deliberate pause boundary: charged and reserved, but no action applied. Later Amina decisions used fresh IDs; the discarded proposal was not replayed.
- The sole browser navigated to `about:blank`. Measurements **80.855 wall seconds apart** show returned responses **8→17**, world time **23→58** and sequence **113→271**. The trace confirms zero SSE observers during the disconnected interval; reconnection retained the same world and later consequences.
- Browser polling and the event stream remained operational during the long continuous interval and past the earlier failure window. At the intentional generation stop, the server saved its paused final state and closed; the browser froze without local fallback. Connection-refused messages **after** that intentional close are not provider or persistence failures. No console error occurred during normal post-reconnection live operation.
- Unauthenticated session and phone reads returned 401; `.env`, runtime-token and isolated-access-file URLs returned 404. The local cookie was HttpOnly/SameSite Strict. It is intentionally not a Secure cookie over loopback HTTP; public hosting remains a separate security/deployment task.
- Public frames contained no raw resident knowledge/memory/need objects. All **64 scoped-input audits** passed own-biography, legitimately known place/private-home, delivered-thread, notified-reply, capability/job, owned-order and resident-feedback checks. Public artifacts and client build were checked for the real key and token.

## What residents actually did

This was not an attempt to obtain a particular social outcome. Examples from the independently generated decisions:

- Amina **18** ordered two food portions after finding empty stock. Zainab **19** asked when food might arrive; Amina **21** independently clarified the pending order. Delivery at 119s introduced two explicitly paid units from a finite external source.
- Amina **37** texted Zainab that food had arrived. Zainab **38** bought food, **40** ate, then **45** replied that stock was empty again. Amina **47** placed another two-unit order. Its delivery was due at 244s, **after** the final 243.25s checkpoint, so it remains paid/pending rather than falsely reported completed.
- Fatima **48** asked Halima about food. Halima later clarified uncertainty rather than claiming a delivery time she did not know. Zainab introduced herself to Fatima and received an independent acceptance; a further introduction to Halima remained pending. These were actual scoped interactions, not synthetic fixtures.
- Twenty jobs completed and paid **34 credits**. Seven jobs remained active with **11 credits held**. Supply work produced eight goods; three food purchases and two consumptions occurred. No automatic refill or invented wage was applied.
- Four face-to-face encounters and one delivered/replied text thread were recorded. There were no new phone contacts, structured social meetings or relationship-counter changes. Extended hangout conversations and lasting friendships remain unproven. The earlier 200-generation and Grace–Maryam evidence remain separately labelled.

Muse chose the meaningful actions. Navigation, timers, delivery, inventory and payment execution remained deterministic. No action was rewritten, no social outcome forced and no matched offline comparison branch was run here. This test demonstrates live integration and continuity, not improved Muse reasoning merely from added context.

## Preservation and validation

All **42 protected files** were byte-preserved, including operating saves, previous failed session/pending replacement, prior approvals/evidence and credentials. The full historical ledger prefix remains; total reservations are now **662**. Money conservation passed with the original **555 credits**, including resident/business balances, held wages and explicit external spending. No duplicate request identities or action execution were found.

Evidence SHA-256: `538d1c7dbb68f65744b4adf58266a3f15a4a7f0d4ef7d159dd167ac2a2db657c`. Final checkpoint SHA-256: `f8c5f1e8f2c63f333bc82df392e26f7831becf3098aa77384ee13dd2f232e243`.

Offline validation: **409 tests across 32 files passed** (384.47s), including 23 focused checkpoint/progression/HTTP tests. Both TypeScript projects and production build pass. The existing large routes-chunk advisory remains. No commit, push, deployment, production-credential change, publication or second live run occurred.

## Demonstration and submission readiness

The clean local artifact is **`output/playwright/unity-gardens-final-demo.mp4`**, **2:59**, 1280×720 H.264 / 25fps, approximately 5.35MB. It uses source seconds 50–229 from this run's actual browser capture at **1× speed**, with explanatory captions. It is silent: no generated speech, fake conversation, repeated footage, frame stretching or added Muse request. The live badge and phone controls remain visible. A separate VTT contains the same explanatory text; do not overlay it a second time on the burned-in version.

All **4,475 frames** decoded without error; duration and continuous timing were verified. Eight representative encoded frames were visually reviewed, and Chrome playback/seeking/advancement passed. The original capture, Python/PyAV/Pillow render project, cue schedule, QA frames and source/output hashes are retained under `output/playwright/final-demo-project/` and its parent.

[Submission materials](submission-materials.md) and the [final walkthrough](submission-walkthrough.md) now refer to this accepted run. The existing GitHub repository was verified public via the connector and anonymous HTTP 200; this task did not push the local changes. Remaining release gates are owner review, approval of any commit/push/publication, video upload/visibility, and checking the actual submission portal's deadline and required fields. No public live backend was exposed and no submission was sent.
