# Milestone 7E: Addressed town and resident phones

Implemented and verified offline on October 31, 2026. The normal sixteen-person town uses `town-v1`; the original taxi graph and explicit neighbourhood fixtures retain `legacy-v1`. No live Meta requests, commits, pushes or deployment were made.

## Connected town

`shared/world/town-layout.ts` is the shared catalogue for navigation, addresses, building footprints, public entrances, private units, workplaces and rendering. The expanded bounds are 390 by 320 metres. Original road edges, market, supplier, taxi stand, lake and garden remain. Four apartment blocks contain sixteen separate flats; twelve are occupied. Four standalone homes house the remaining four residents. Housing assignments live in mutable world state, rather than permanent identity rules. Eight existing businesses retain their owners, funding and work mechanics at distinct premises; taxi and courier work remain mobile.

The west, north, south and east residential districts surround the core and central green. Procedural facades, balconies, roofs, compound walls, sidewalks, street markings and greenery use reusable geometry/material batches. The supplied images informed the visual direction; no third-party image assets or new dependencies were introduced.

Home, workplace, route validation, proximity and observation generation resolve the selected map. Separate flats have separate logical locations, sharing only a public entrance. Knowing a building does not grant entry to another resident's dwelling. Indoor residents disappear from the street, remain in the simulation, and can be selected through the roster or building inspector. Work, meals, rest, communication and delivery still run through the existing authoritative engine.

The Three.js interface adds fixed-angle pan/zoom, overview, building selection, dwelling/workplace addresses and focus controls. Manual panning releases follow. Overview labels name buildings; selected buildings show addresses, occupied/vacant counts and present residents. No interiors, decorative traffic or emergency subsystem were added.

## Scoped handset and control

Select a resident and choose **Open phone**. Chats group retained exchanges by contact, show delivery state, message bubbles and linked delivery tasks. Calls show status and eligible response/end controls. Contacts come from that resident's acquired contacts, not a global directory. Timestamps use simulation time. Reading a phone does not answer, mark NPC messages read, alter memories or pause decisions. No NPC unread state is inferred from player inspection.

`shared/neighbourhood/phone.ts` projects the owner's retained conversations separately from the operator feed. Undelivered incoming messages/replies and another resident's private ignore decision remain masked. NPC inference still receives the smaller bounded communication context.

**Take phone control** obtains one exclusive, transient 60-wall-second lease. A visible open handset renews it every 20 seconds. Closing, changing owners or hiding the page releases it; disconnect expires it and restart clears it. Tokens appear only in the private control response and subsequent authenticated control/action request, never snapshots, checkpoints or logs. Existing movement, paid work and rest may complete. Only the controlled resident's new autonomous decisions pause; messages and deadlines continue. Actor generations invalidate late inference, including acquisition followed by release, without refunding consumed inference accounting.

Manual actions have player provenance and request IDs. They use strict schemas and the existing semantic validator/executor. The whitelist permits communication, communication response, end call, contact sharing and linked transport proposal/response. It grants no movement, rest, work or arbitrary activity control. Invalid eligibility, unknown contacts, expired exchanges, busy residents and stale leases fail before gameplay mutation. Replayed successful request IDs return their recorded outcome. A conversation acceptance is distinct from a job acceptance and from successful physical delivery.

Manual phone actions request no inference themselves. Recipients remain independent under the existing mock/live mode, autonomy gates, cooldowns and budget limits. The handset exposes the existing bounded communication mechanics, not an unlimited chat model or voice audio.

## Interfaces and recovery

- World snapshots are **version four** with explicit map identity and address references. Version-one through version-three migration paths remain. `pathToNode` accepts a map and retains the legacy default.
- Presentation frames are **version two**, including map identity, home/work addresses and indoor building presence. Rebuild and restart the backend, then reload browsers together; older clients reject incompatible frames.
- Existing server and CLI checkpoints get an exclusive **`.pre-7e-backup`** containing their original bytes before map-upgrade persistence. World identity, inventories, memories, relationships, delayed communication, escrow, cargo, timers, counters and remaining progression allowances are retained.
- Existing travel follows unchanged original edges and progress. Active paid work records its original site and may finish there once; later work uses the new premises. Existing rest completes where recorded. Old place/business observations remain historical evidence; work availability observed at the old site does not become current evidence at the new one. Residents explicitly learn their refined home and known workplace destinations without learning others' private housing assignments.
- Authenticated `GET /api/phone?actorId=…`, `POST /api/phone/control` and `POST /api/phone/actions` use the existing local operator authentication, Origin checks, body limits and rate limits. The local adapter mirrors lease and action behaviour. The public control status contains only actor and expiry, never the token.

Rollback is an operational recovery action: stop the process, retain the current checkpoint separately, and restore the matching backup with compatible code. Do not copy old checkpoints over an active process or erase persisted budget consumption to obtain more runtime. No operating checkpoint or spending ledger was used during acceptance.

## Acceptance evidence

`npm test -- --maxWorkers=2 --reporter=dot`: **282 tests passed across fourteen files** (51.58 seconds in the final run). Fifteen new integrated tests in `tests/town-map-phone.test.ts` cover addresses/reachability, legacy paths, private flats, indoor projection, active travel/work/rest migration, corruption rejection, deterministic recovery, scoped inspection, lease renewal/expiry/restart, late inference accounting, busy work completion, invalid actions, deduplication, local parity, HTTP authentication and exact rollback copies. Existing supply, taxi, communication, economic conservation and progression regressions also pass. Legacy timing fixtures explicitly select the legacy map.

One new acceptance test starts with a player-authored phone request, allows the recipient to decide independently, then separately proposes and accepts a transport task. The recipient physically collects and delivers the stock, and the engine pays the agreed wage exactly once. Proposal, discussion response, job commitment and completed delivery remain separate records.

An isolated CLI version-three, eight-person legacy checkpoint advanced from second 120 to 180 after upgrade, wrote `.pre-7e-backup` and released its lock. Server tests additionally recover travel, work, delayed messages and deliveries with counters preserved and leases cleared.

Both TypeScript projects and the production build pass. The neighbourhood JavaScript is 139.64 kB minified / 38.98 kB gzip; shared renderer/routes are 603.53 / 153.89 kB. The existing large-chunk warning remains.

Installed Chrome verified the production build at desktop 1280×720 and mobile viewport 390×844: sixteen residents, building selection/focus, pan/zoom/overview, indoor selection, all phone tabs, lease transitions and paused refresh recovery. Amina's manually sent text received Zainab's independent accepted reply. Tunde's outgoing call to Musa completed with an independent acceptance. Closing the handset released control. The original taxi scenario C reached the overlook without page errors. Mobile had no horizontal overflow; handset content remained inside the viewport. These are desktop browser viewport checks, not physical mobile hardware results. Existing initial unauthenticated 401 and password-form notices remain; no application page errors occurred in the successful functional runs.

Ignored verification artifacts are under `output/playwright/milestone7e-*`; scripts and isolated checkpoints remain outside tracked product files.

## Measurements and limits

A default offline twenty-minute run exercised all sixteen residents: all sixteen ate, fourteen performed paid work, 572 decisions produced zero rejected proposals, twelve texts, two calls and four completed deliveries. It produced 34 supplies and consumed 35 meals in 7,669 ms wall time on this machine. The resulting checkpoint was 403,874 bytes. Forty subsequent quarter-second committed server steps averaged 18.42 ms, with 23.56 ms p95; this includes advancement, serialization, filesystem flush/replace and projection rather than isolated disk time. A paused desktop scene sampled 91 animation frames over 1.5 seconds, averaging 16.49 ms between frames. These are local samples under host load, not comparative performance improvements or mobile guarantees.

One isolated browser backend encountered a checkpoint write/replace failure after roughly 37 simulated seconds. Its original error handling did not retain the filesystem error code, so the cause remains unidentified. It failed closed without publishing an uncommitted frame. Sanitized error-code reporting and unhealthy HTTP/SSE behaviour now make a stopped session visible; no unsafe persistence bypass or automatic retry was added. A fresh isolated restart ran through the retained 1,800-second allowance without recurrence. Filesystem reliability remains a submission-rehearsal risk, not a claimed root-cause fix.

The current layout has twenty units and a finite authored set of workplaces. The registry can grow, but residents beyond vacant housing need additional catalogue units; the existing population safety ceiling remains 32. Default sixteen, optional eight-person CLI fixtures, finite production/funding, retained history limits, the 1,800-second server allowance and 2,048 routine-decision allowance remain. Reset/restart do not refill those allowances. The core is not structurally tied to sixteen actors, but this map has finite physical capacity.

The next milestone should be a submission rehearsal focused on recovery and unattended progression within explicit budgets: repeat checkpoint/refresh recovery, measure running-scene mobile hardware performance and diagnose any recurring filesystem error. No thirty-day endurance claim is made. More residents, governance, elections, family systems, interiors and longer communication chains should wait until the integrated experience is stable.
