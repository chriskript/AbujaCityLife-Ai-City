# Unity Gardens: origins and social context

Unity Gardens is the fictional neighbourhood within **Abuja City Life: AI Town**. The project title and repository are unchanged. The existing 390 × 320 metre layout, buildings, roads, utilities, businesses, homes and starting locations are unchanged.

We create the world, its rules, and its possibilities. The residents create their own stories.

## Canonical starting history

Unity Gardens began as a modest residential development on Abuja's outskirts. Housing filled gradually, and everyday trading, transportation, repair work and essential services developed alongside it. Apartment blocks and standalone homes now share a neighbourhood with a market, supply cooperative, care, learning, tailoring and repair businesses, a central green, gardens, an overlook and existing infrastructure.

The starting community functions ordinarily. Residents have different resources, livelihoods and priorities. Maintaining shared spaces and access roads, and keeping services dependable and affordable, are ordinary unresolved questions, not fabricated breakdowns or emergency missions. There is no elected community leader or formally established residents' association at the start. This does not prohibit residents from organising later, and it does not schedule an organisation or election.

The exact canonical text is pinned in `shared/neighbourhood/social-context.ts` under `unity-gardens-v1`. It describes the starting past; later validated events take precedence. Never edit this revision to reinterpret an existing save's past. Future content revisions need an explicit migration policy.

## Resident backgrounds

The public column is biographical information that could legitimately be disclosed, not information automatically known by every other resident. Initially, each resident receives only their own public and private biography. Other people's introductions, messages and disclosures continue through existing event-backed systems. The private column describes personal experience and outlook, not compulsory behaviour or a newly assigned goal.

| Resident | Public background | Private experience and interests |
| --- | --- | --- |
| Musa | Taxi work built familiarity with local routes. | Weighs variable demand against time and carrying capacity; values dependable earnings. |
| Amina | Developed an everyday market livelihood as commerce grew. | Stock management gave experience comparing collection trips with seeking help. |
| Zainab | Learned local market and centre routines through errands. | Curious about useful information while retaining her own priorities. |
| Chris | Recent arrival combining repair apprenticeship and supply courier work. | Rented near Hill Garden; met Musa through a taxi ride; arrived without knowing Amina. Paid work and repair errands compete for time. |
| Fatima | Brought nursing experience to a local care desk. | Learned to balance dependability with rest and a sustainable working day. |
| Tunde | Built a small repair workshop serving the local trade. | Values repeat customers and weighs requests against workshop resources. |
| Halima | Helped organise practical supply work at the cooperative. | Experience coordinating finite inputs makes budgets relevant alongside demand. |
| Ibrahim | Combined growing experience with supply work. | Values productive work, regular meals and a steadier independent livelihood. |
| Yusuf | Developed tutoring work around the learning desk. | Balances teaching opportunities with personal study. |
| Ngozi | Gained cooking and market experience with Amina and through supply errands. | Interested in learning to run a stall; experience grants no automatic claim to jobs. |
| Emeka | Established electrical repair work alongside the stand-side trade. | Values finishing accepted work and considers capacity before taking on more. |
| Grace | Came to shared lodging near Hill Garden while studying and taking occasional work. | Balances expenses with study; initially knows Yusuf, without a personal acquaintance with Amina. |
| Ladi | Developed walking courier work around market and centre errands. | Considers distance and loads; has met Amina but must earn reliability through completed work. |
| Sadiq | Began repair apprenticeship with Tunde. | Learning and immediate income compete while he seeks greater independence. |
| Maryam | Brought bookkeeping experience and an existing connection with Halima. | Weighs useful work against savings, time and personal priorities. |
| Bisi | Built a tailoring livelihood near the market. | Values steady custom, finishing work and time for neighbours; knows Ngozi from the stalls. |

No additional acquaintances or phone contacts were seeded. Existing directional knowledge is retained: for example, Tunde knows Chris, while Chris initially lists only Musa. That asymmetry is not converted into a reciprocal acquaintance or phone exchange. Earlier district-level home/work descriptions remain historical descriptions; the current distinct home and workplace addresses remain authoritative. No incompatible identity, capability, resource, relationship or location data needed correction.

## State and scoped observations

`WorldState.version` stays at 4. Optional `socialContext` has its own validated `version: 1`, pinned `canon: unity-gardens-v1` and resident-specific knowledge grants. Grants contain bounded public fact IDs and permission to receive one's own biography. Text is resolved from the pinned catalogue rather than copied repeatedly into saves. A missing biography for a custom resident grants none; it does not invent a personal past.

Compatible starting grants represent ordinary local familiarity with the neighbourhood's public origins and circumstances. They are an explicit authored knowledge default, separate from merely being present in canonical data. They grant neither other residents' biographies nor live conditions. A saved restricted grant takes precedence over these defaults.

`projectSocialContext` returns only the deciding resident's authorised context. Its historical fields are marked `historySource: authored-pre-simulation` and `historyAsOf: simulation-start`. Observation retrieval includes at most three of the five shared facts, the actor's own biography and at most six connections. It does not send the full canonical history or all sixteen biographies. Known origins provide identity; current location, existing goals and a conversation's topic select additional relevant shared facts. Topic matching retrieves facts only; it does not trigger actions, conversations or goals. Explicit saved grants always constrain retrieval. Asking about an ungranted fact cannot reveal it.

The connection view derives identity knowledge, sight evidence, meeting evidence, phone possession, relationship records and successful-job counts from the actor's existing legitimate state. `seenInSimulation` and `metInSimulation` describe retained evidence after startup; false does not assert that people never met before. These fields add no initial acquaintances. A relationship with zero successful jobs is not earned trust. History never authorises commitments; decisions still pass the same independent schema, action, capacity, location, communication and economic validators.

Both Muse decisions and server conversations use these scoped observations. Conversation evidence can cite only history IDs present in that observation. History is separate from event-backed memory: it cannot be supplied as `memoryId` to manufacture a shareable observation or message report. Existing service claims still require place-fact and availability evidence. Public biographies are not automatically disclosed through acquaintance knowledge. A resident may later talk about their experience through normal communication, whose contents remain attributed speech rather than independently verified facts.

No authored history creates a task, trigger, event, memory, friendship, promise, conflict, election, organisation, income or successful job. There are no mandatory discussions, partners or community outcomes. Existing needs, goals, action schemas, execution and inference budget controls remain unchanged.

## Existing saves and replay

Restore first migrates legacy snapshot shapes and validates the existing state. A town checkpoint without social context receives the compatible version-1 grants, then is validated again. A non-town legacy fixture retains its original scope; normal town enablement adds context when it becomes a town. New residents admitted through existing town expansion receive only their own compatible defaults.

Migration does not reset the town or rewrite its event history. It preserves resident identities, inventories, coins, food, homes, positions, capabilities, goals, tasks, contacts, memories, relationships, commitments, economic accounting and communication records. Existing restore-trigger behaviour remains unchanged. Existing social contexts, including deliberately restricted or absent individual grants, are preserved rather than refilled on every load. Unsupported revisions, invented fact IDs, duplicate grants and invalid extra fields are rejected.

Repeated save/load cycles retain a single reference per grant without appending memory or event entries. The same deterministic offline actions and event progression remain possible; new context does not change the mock policy or scheduler.

## Offline validation and input comparison

`tests/social-context.test.ts` adds checks for all sixteen residents, migration of both fresh and progressed checkpoints, biography privacy, restricted grants, malformed revisions, conversation evidence scoping, separate phone/trust states, optional refusal, save/load idempotence and deterministic progression. Six simulated minutes of all-sixteen-resident progression produce identical authoritative state when social context is present or removed from decision inputs. All sixteen act; travel, paid work, purchases, eating and rest continue. Existing regression tests cover communications, introductions, delivery commitments, financial conservation, navigation and recovery.

Run the bounded comparison with `npm run social-context:compare`. It constructs six real decision requests, including one actually delivered text request, and compares each with an otherwise identical clone that omits social context. It uses no provider, credentials or network. The reproducible artifact is [unity-gardens-comparison.json](unity-gardens-comparison.json), containing exact added context, input lengths, baseline hashes, current priorities/needs and delivered communication views.

| Decision dimension | Resident | Additional information to assess in a later live evaluation |
| --- | --- | --- |
| Choosing whom to approach | Chris | Recent arrival and existing taxi acquaintance, without a town-wide social directory. |
| Interpreting relationships | Tunde | An acquaintance remains distinct from possessing a phone number or having successful shared work. |
| Responding to requests | Musa | Transport experience alongside a delivered request, with no obligation to accept. |
| Competing priorities | Fatima | Dependable care work and experience balancing rest against responsibilities. |
| Possible cooperation | Halima | Supply experience and finite-budget concerns, without creating partners or current vacancies. |
| Neighbourhood concerns | Maryam | Ordinary shared concerns alongside bookkeeping experience, without an organising role. |

The six cases add approximately 1.2–1.7 thousand JSON characters each. These are character counts, not token estimates or measured provider usage. The existing 24,000-character payload guard, 6,000-input-token preflight, output ceiling, spending reservations and generation limits are unchanged. Growing memory buffers can still approach those ceilings; passing these six early inputs does not guarantee every later request will fit. Budget/size failures must remain visible, without retries that enlarge the authorised budget.

The comparison demonstrates additional scoped information, not better reasoning. No live evidence supports claims of improved partner choice, negotiation or autonomy. The planned twelve-generation live evaluation remains a separate approval step, with its existing caps and evidence requirements. It should assess whether Muse uses backgrounds without overgeneralising acquaintance, inventing obligations, ignoring present needs, or treating starting leadership circumstances as permanent facts. No live approval configuration or production credential was changed by this enhancement.

Connection flags clarify information already in the actor's knowledge, communication and encounter records; they are not newly invented relationship evidence. The biographies and granted starting history supply the additional authored information.

Verification on October 31, 2026: `npm test` passed **305 tests in 17 files**, including eight new social-context tests. `npm run build` passed both TypeScript projects and the Vite production build. Vite retained its large-chunk warning for the shared rendering bundle. `npm run social-context:compare` completed all six cases with **zero generations**. No Meta API request, commit, push or deployment was performed.
