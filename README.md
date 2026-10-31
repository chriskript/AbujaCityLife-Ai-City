# Abuja City Life: AI City Lab

**An experimental urban simulation exploring how AI agents understand their surroundings, make decisions, and act in a virtual environment.**

Built for the **Meta Global AI Developer Hackathon 2026** — Indie Developer track, *Push the Frontier* theme.

## Overview

Abuja City Life: AI City Lab is building a compact, fictional 3D neighbourhood inspired by Abuja, Nigeria. Its goal is to connect Meta's AI models to inhabitants with personal priorities, local knowledge, natural conversations, and decisions that affect their shared world.

Every model-proposed action must pass through a deterministic validation and execution layer. The neighbourhood is designed to demonstrate autonomous activities, cooperation, and adaptation with observable consequences.

## Capabilities and status

**Implemented:** a playable Three.js town with sixteen residents, including Musa, Amina, Zainab and Chris. Residents independently pursue funded work, earn/spend demo credits, rest, buy/eat food, produce supplies from finite inputs and coordinate physical deliveries. Optional encounters receive independent responses. Select residents and inspect real activity, resource and payment outcomes. Original taxi and Amina–Musa supply fixtures remain available.

The browser now connects to a **controlled, authoritative Node backend**, with persistent world state, validated decisions, and conversation requests. Development defaults to a **scripted mock provider** with labelled conversation fixtures and no inference charges. Controlled Muse Spark 1.3 evaluations include a successful taxi destination selection, a partially grounded conversation, and an autonomous transport proposal rejected for an excessive quantity. The quantity contract is now corrected offline; successful live cooperation remains unproven.

The same headless foundation powers the browser: independent goals, limited knowledge, event-driven activities, inventory consequences, and structured memories. The original instruction-driven mock taxi demonstrations remain available in **Taxi lab**. Consequential conversation actions require separate confirmation and simulation validation.

**Evolution toward Abuja City Life: AI Town:** [Milestone 7B](docs/milestone-7b.md) expands the [7A foundation](docs/milestone-7a.md) to sixteen residents with connected personal/resource routines and a conserved credit economy. The [accepted assessment](docs/ai-town-assessment.md) remains the broader direction. Continuous unattended service operation, phone/text channels and longer-horizon systems remain future work. Further live Meta evaluation requires separate approval.

## Technology

- **Current:** TypeScript, Three.js, Vite, Node.js, Vitest, and tsx.
- **Integration foundation:** Meta Model API, with Muse Spark and Muse Wonder as runtime candidates.

## Getting started

Requires **Node.js 22.12 or newer** and npm.

```bash
git clone https://github.com/chriskript/AbujaCityLife-Ai-City.git
cd AbujaCityLife-Ai-City
npm ci
```

Initialize local demo access once, build, and start the mock backend:

```bash
npm run backend:init
npm run build
npm run backend
```

Open **http://127.0.0.1:8787/** and sign in using the token in ignored `runtime/demo-access.json`. Select characters, observe their activities, and try the clearly labelled mock conversation fixtures. **Neighbourhood experiments** offers alternative mock policies on reset. For frontend development, keep the backend running and use `npm run dev` in another terminal (port 5173). See the [backend guide](docs/backend.md) for access, persistence and operating limits.

For the original journeys, open **Taxi lab** in the navigation (or `/?experience=taxi`). Try **Find a lake view**, **Visit the market**, or **Take a detour**. Its text input recognises market/lake fixtures; it is not general natural-language understanding.

Run the headless simulation:

```bash
npm run demo
```

Run the shared neighbourhood scenario with three inhabitants:

```bash
npm run demo:neighbourhood
```

The original demo runs three taxi scenarios; the neighbourhood demo runs a cooperative restocking fixture. Both print event traces without API keys or inference calls.

Advance and save the normal sixteen-resident town without a browser or Meta requests:

```bash
npm run town:headless -- --seconds=240
```

This bounded offline runner uses its own recovery file, `runtime/town-headless.json`. Use `--population=8` for the smaller starting/growth target. Existing residents are preserved when expanding a checkpoint. See [7B operation and limits](docs/milestone-7b.md).

Run tests and static checks:

```bash
npm test
npm run typecheck
npm run build
```

The backend serves the production build locally. `npm run preview` serves static files only; it does not proxy the API. A recent browser with WebGL 2 is required for the 3D scene.

For server-side API setup and an offline configuration check, see the [Meta API guide](docs/meta-api.md). Keep credentials in local backend configuration; never put them in browser code or Git.

## Documentation

- [AI Town assessment, quantity fix, and proposed milestones](docs/ai-town-assessment.md)
- [Milestone 7A implementation, evidence, and remaining limits](docs/milestone-7a.md)
- [Milestone 7B population, economy, recovery, and verification](docs/milestone-7b.md)
- [Simulation architecture](docs/architecture.md)
- [Controlled backend and local execution](docs/backend.md)
- [Shared neighbourhood foundation](docs/neighbourhood-foundation.md)
- [Visible inhabitants and session contract](docs/visible-inhabitants.md)
- [Browser verification and limitations](docs/browser-verification.md)
- [Meta API setup and verification](docs/meta-api.md)
- [Project provenance and third-party attribution](docs/provenance.md)

Developed for the October 26–November 4, 2026 hackathon. This entry is independent of the pre-existing Abuja City Life game.

## License

No project license has been selected yet. Third-party dependencies retain their own licenses; see [attribution](docs/provenance.md#direct-development-dependencies).
