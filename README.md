# Abuja City Life: AI City Lab

**An experimental urban simulation exploring how AI agents understand their surroundings, make decisions, and act in a virtual environment.**

Built for the **Meta Global AI Developer Hackathon 2026** — Indie Developer track, *Push the Frontier* theme.

## Overview

Abuja City Life: AI City Lab is building a compact, fictional 3D neighbourhood inspired by Abuja, Nigeria. Its goal is to connect Meta's AI models to inhabitants with personal priorities, local knowledge, natural conversations, and decisions that affect their shared world.

Every model-proposed action must pass through a deterministic validation and execution layer. The neighbourhood is designed to demonstrate autonomous activities, cooperation, and adaptation with observable consequences.

## Capabilities and status

**Implemented:** a playable Three.js neighbourhood where Musa, Amina, and Zainab pursue activities without player instructions. Select an inhabitant, follow their movements, and watch validated cooperation change cargo, stall stock, and purchases. Character cards, an activity feed, pause/reset controls, and alternative mock policies make their shared day observable.

The browser currently uses a **scripted mock provider**, with no inference charges. One controlled server-side Muse Spark 1.3 test has returned a valid destination-selection decision. This verifies the API foundation; it does not enable live Meta gameplay in the browser.

The same headless foundation powers the browser: independent goals, limited knowledge, event-driven activities, inventory consequences, and structured memories. The original instruction-driven taxi demonstrations remain available in **Taxi lab**. Natural conversations are visibly unavailable until a live dialogue provider is connected.

**Next:** connect a secure, budget-controlled backend for live Meta decisions and grounded conversation, then evaluate complete interactions.

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

Start the browser application:

```bash
npm run dev
```

Open **http://127.0.0.1:5173/** and observe the neighbourhood. Select characters in the scene or the character card. Use focus, pause, and time controls to inspect their activities; **Neighbourhood experiments** offers alternative mock policies that take effect on reset. The default clock runs at 2× speed.

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

Run tests and static checks:

```bash
npm test
npm run typecheck
npm run build
```

To inspect the production build locally, run `npm run preview` and open the URL printed in the terminal. A recent browser with WebGL 2 is required for the 3D scene.

For server-side API setup and an offline configuration check, see the [Meta API guide](docs/meta-api.md). Keep credentials in local backend configuration; never put them in browser code or Git.

## Documentation

- [Simulation architecture](docs/architecture.md)
- [Shared neighbourhood foundation](docs/neighbourhood-foundation.md)
- [Visible inhabitants and session contract](docs/visible-inhabitants.md)
- [Browser verification and limitations](docs/browser-verification.md)
- [Meta API setup and verification](docs/meta-api.md)
- [Project provenance and third-party attribution](docs/provenance.md)

Developed for the October 26–November 4, 2026 hackathon. This entry is independent of the pre-existing Abuja City Life game.

## License

No project license has been selected yet. Third-party dependencies retain their own licenses; see [attribution](docs/provenance.md#direct-development-dependencies).
