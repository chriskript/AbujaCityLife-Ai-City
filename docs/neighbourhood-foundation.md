# Shared neighbourhood foundation

This headless foundation adds an authoritative, isolated neighbourhood with Musa (taxi driver), Amina (market trader), and Zainab (resident). The [visible inhabitants experience](visible-inhabitants.md) now consumes this same core through a local session adapter. It is not connected to a hosted world or live Meta inference.

## Run

```bash
npm run demo:neighbourhood
npm test
npm run typecheck
```

The demonstration explicitly labels every decision as a scripted mock fixture. It runs without player commands and stops after a completed transport job, Amina's observed delivery outcome, and Zainab's purchase. The trader-restocking story is one fixture policy, not a required decision sequence.

To save an optional local checkpoint:

```bash
npm run demo:neighbourhood -- --checkpoint
```

Checkpoints use timestamped filenames under ignored `runtime/`. They contain simulation state and memories, not credentials. The persistence helper supports explicit save/load using a versioned JSON snapshot, a flushed temporary file, and atomic rename. Invalid checkpoints fail closed. No inference accounting files are read, replaced, or reset.

## State and execution

`shared/neighbourhood/world.ts` owns character identities, goals, intentions, needs, activities, inventories, roads, transport tasks, events, and revisions. Snapshot and observation getters return detached copies. New instances have independent state; there is no global writable world or HTTP endpoint.

The existing graph and Dijkstra implementation are reused through the small `pathToNode()` export. Existing destination routing, taxi agent, scenarios, rendering, provider probe, budget history, and regression tests remain intact.

NPC proposals use a strict action contract. The simulation checks capabilities, current activity, personal knowledge, proximity, stock, carrying limits, reservations, and task status. A model-selected intention does not complete an activity. Movement advances deterministically along edges; goods move only after validated transactions or physical collection/delivery.

Proposals are tied to registered request IDs and actor revisions. Relevant observations and outcomes invalidate old actor decisions, while unrelated world changes need not. Resource and task preconditions are checked again against current authoritative state. Duplicate completed request IDs do not repeat effects. Replaying an old request after restoration is rejected; new attempts to fulfil a delivered job are also rejected.

World revisions include simulation advancement and recorded changes. Roads cannot be removed while occupied. An unobserved obstruction is discovered before edge entry, leaves the character at the safe waypoint with cargo intact, and triggers a fresh decision. The core does not silently invent a new intention or call a model during navigation.

## Cooperation and resources

Transport tasks follow `proposed → accepted/declined → collected → delivered`. Unanswered offers expire after 90 simulation seconds. Only the recipient can answer, and participants must still be near each other. Accepted tasks reserve supplier stock, preventing self-collection from consuming promised goods.

The accepted driver explicitly chooses whether to start fulfilling the task. The executor then travels to the supply desk, validates collection, loads cargo, travels to the market, and validates delivery. A blocked leg leaves the task active for a later decision. Delivery deposits goods into the stall's receiving inventory; Amina need not be physically present. One simulation reward is recorded per completed job, with no real-world payments or economics.

The initial world contains nine goods in total: eight at the supplier and one at the stall. Purchases transfer goods to the resident rather than destroying them. Tests verify conservation and nonnegative quantities. Trader self-carrying capacity is two units; taxi capacity is six. No more than 64 task records are accepted in one world checkpoint.

## Knowledge and memories

Authoritative state is never sent wholesale to the decision provider. Each observation contains only the actor's own profile, goals, needs, inventory, relationships and memories; known locations; known nearby people; last personally observed resource counts; and personally known task states and road closures. The capability list describes supported actions; actual eligibility is still validated per proposal.

Resource knowledge can become stale. Amina does not learn about a remote delivery or stock change until she observes it at the stall. Personal observation updates stock needs; a remote global stock mutation is not automatically a personal need trigger. Completed delivery receipts provide verifiable evidence for the trader and update the relevant relationship once.

Memories distinguish established facts, observed events, reported information, uncertain beliefs, commitments, and verified outcomes. Every memory references an actual simulation event and its source. Sharing a memory creates a report or belief; it does not change world inventory or turn the report into an established fact. Uncertainty survives forwarding. Characters cannot propose arbitrary memory writes.

Each NPC retains at most 24 recent memories. Outstanding task knowledge remains available separately. Event history is bounded, retaining recent events and evidence referenced by retained memories. Checkpoint validation checks identity/capability profiles, paths, memory evidence, task/cargo consistency, goods conservation, and reward counts. Local files are not cryptographically authenticated and must not be accepted from public clients as authoritative snapshots.

## Autonomous scheduling

`DecisionScheduler` consumes coalesced triggers: activation, activity completion/failure, observed low stock, incoming offers, offer resolution/expiry, information, and relevant observations. It uses round-robin fairness, one inference in flight, a 20-second per-NPC cooldown, six requests per simulation minute, and 24 requests per scheduler episode by default.

Selected travel/work/wait activities continue deterministically between decisions. Incoming events can interrupt waiting; work is non-preemptive until its bounded completion. Calling `advance()` never calls inference. Failed providers produce no action and do not automatically retry. The trigger queue is bounded to eight distinct reasons per character.

These are local simulation scheduling limits, not a replacement for persistent inference spending controls. Scheduler counters use simulation time and are not durable billing limits. A future live provider must additionally use wall-clock request limits, existing persistent cost reservations, and an explicitly approved inference budget.

## Alternatives and boundaries

The scripted provider can independently choose driver refusal and trader cooperation, self-collection, waiting, or reduced sales. Tests exercise each outcome. A strict JSON Schema and provider interface are prepared for later Meta integration; no live adapter is connected to this contract, and its API compatibility has not been live-tested.

The visible-inhabitants milestone connects this state to the miniature scene and character selection without duplicating the simulation. Natural conversation, backend hosting, and paid inference remain separate work.
