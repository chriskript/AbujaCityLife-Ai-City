# Abuja City Life: AI Town

A miniature living society where autonomous residents make decisions, build relationships, work, and shape their shared world.

Built for the Meta Global AI Developer Hackathon 2026, Indie Developer track, Push the Frontier theme.

## The idea

AI Town is a browser-based 3D neighbourhood inspired by Abuja, Nigeria. Instead of making the player the centre of every story, it explores what happens when residents have their own priorities, limited knowledge, memories, resources, and choices.

A shopkeeper might need a delivery. A neighbour might offer help, refuse, or make another plan. Their decisions can affect work, supplies, money, and future interactions. The player can observe residents and their consequences rather than directing every action.

We create the world, its rules, and its possibilities. The residents create their own stories.

AI Town expands the autonomous simulation work already underway. It is a separate hackathon entry from the pre-existing Abuja City Life game, not a replacement for that game.

## What works today

- Sixteen residents in a playable Three.js neighbourhood, including Amina, Musa, and Zainab, with activities, needs, and resource routines.
- Independent simulation behaviour: residents pursue work, rest, buy and eat food, produce supplies from finite inputs, and coordinate deliveries.
- Social encounters: nearby residents can meet, share scoped information, and give independent responses to optional interactions.
- A small economy: demo credits, payments, inventory, stock, and resource changes have observable consequences.
- Authoritative world rules: proposed actions are validated before they can change gameplay state. Residents do not receive unrestricted knowledge of the world.
- State and recovery: a controlled Node backend maintains persistent world state; a bounded offline headless runner can advance and save a town without a browser or Meta API calls.
- Inspectable outcomes: select residents in the browser and follow activities, events, resources, and payments. The original taxi and Amina–Musa supply demonstrations remain available.

Development runs by default with a scripted mock provider that does not incur inference charges. The Meta Model API integration has been evaluated with Muse Spark 1.3, but reliable live AI-to-AI cooperation is not yet demonstrated. A previously rejected transport proposal exposed a quantity-limit mismatch; the contract has since been corrected and tested offline, not yet reverified against the live API.

## Where we're going

The next step is to connect residents' lives more deeply, not simply add more characters:

- Contacts, phone calls, text messages, and communication across locations.
- More flexible friendships, disagreements, trust, commitments, and shared decisions.
- Environmental disruptions, such as road closures, that have lasting consequences for different residents.
- Longer unattended town progression and an accessible history of what changed and why.
- Eventually, community organisation, leadership elections, new businesses, families, and generations.

These are goals, not claims of completed functionality. The immediate focus is a small, observable society whose everyday decisions have real consequences.

## Technology

- App and simulation: TypeScript, Three.js, Vite, Node.js, and tsx.
- Testing: Vitest.
- AI integration: Meta Model API; Muse Spark and Muse Wonder are integration candidates. Model decisions remain subject to authoritative validation.

## Run locally

Requires Node.js 22.12+ and npm.

```bash
git clone https://github.com/chriskript/AbujaCityLife-Ai-City.git
cd AbujaCityLife-Ai-City
npm ci
```

Initialize local demo access, build, and start the backend:

```bash
npm run backend:init
npm run build
npm run backend
```

Open http://127.0.0.1:8787/ and sign in with the token in the ignored runtime/demo-access.json file. Explore residents, inspect their activities, and try clearly labelled mock conversation fixtures. Neighbourhood experiments offers alternative mock policies on reset.

The mock backend continues without a browser while its process runs, within a persisted 1,800 simulated-second allowance and the existing separate routine-decision cap. Pause stops advancement; restart and reset preserve allowance consumption. Neighbourhood experiments also lets you close/reopen the supply–market road and observe local discovery, detours and delivery consequences. See [Milestone 7C](docs/milestone-7c.md). Live Meta mode remains observer-gated and separately approved.

Residents can also exchange contacts, send delayed texts and make simulated phone calls. Recipients independently answer, refuse, defer or ignore; a discussion can lead to a separately validated supply offer and paid physical delivery. Select a resident and open **Calls & messages** to inspect contacts and outcomes. These are bounded offline policy exchanges without voice audio. Existing checkpoints receive rollback copies before upgrade; see [Milestone 7D](docs/milestone-7d.md).

For frontend development, keep the backend running and launch npm run dev in another terminal (port 5173). See the [backend guide](docs/backend.md).

## Other demos

```bash
npm run demo                 # Original taxi scenarios
npm run demo:neighbourhood   # Three-resident restocking fixture
npm run town:headless -- --seconds=240
```

The bounded headless runner saves its own state in runtime/town-headless.json. Add --population=8 for a smaller population; existing residents are preserved when expanding a checkpoint. See [Milestone 7B](docs/milestone-7b.md) for operating limits.

The original Taxi lab remains accessible in the app or at /?experience=taxi. Its sample inputs use predefined fixtures, not unrestricted natural-language understanding.

## Validate

```bash
npm test
npm run typecheck
npm run build
```

The backend serves the production build. npm run preview serves static files only and does not proxy the API. The 3D scene requires a WebGL 2-capable browser.

API keys belong only in local backend configuration, never in browser code or Git. See [Meta API setup](docs/meta-api.md). Further live Meta evaluations require separate approval.

## Documentation

- [AI Town assessment and roadmap](docs/ai-town-assessment.md)
- [Milestone 7A: Extensible residents and encounters](docs/milestone-7a.md)
- [Milestone 7B: Population, economy, and recovery](docs/milestone-7b.md)
- [Milestone 7C: Bounded unattended progression and road closure](docs/milestone-7c.md)
- [Milestone 7D: Autonomous calls and delayed messaging](docs/milestone-7d.md)
- [Simulation architecture](docs/architecture.md)
- [Backend and local operation](docs/backend.md)
- [Shared neighbourhood foundation](docs/neighbourhood-foundation.md)
- [Visible inhabitants and session contract](docs/visible-inhabitants.md)
- [Browser verification and limitations](docs/browser-verification.md)
- [Meta API setup](docs/meta-api.md)
- [Project provenance and attribution](docs/provenance.md)

Developed for the October 26–November 4, 2026 hackathon.

## License

No project license has been selected. Third-party dependencies retain their own licenses; see [attribution](docs/provenance.md#direct-development-dependencies).
