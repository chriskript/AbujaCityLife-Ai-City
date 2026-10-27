# Abuja City Life: AI City Lab

**An experimental urban simulation exploring how AI agents understand their surroundings, make decisions, and act in a virtual environment.**

Built for the **Meta Global AI Developer Hackathon 2026** — Indie Developer track, *Push the Frontier* theme.

## Overview

Abuja City Life: AI City Lab is building a compact, fictional 3D neighbourhood inspired by Abuja, Nigeria. Its goal is to connect Meta's AI models to virtual characters that interpret natural-language instructions, choose reachable destinations, and adapt when conditions change.

Every model-proposed action must pass through a deterministic validation and execution layer. The intended demonstration follows a taxi driver from a request for a lake view through a visible journey and a blocked-route detour.

## Capabilities and status

**Implemented:** a headless TypeScript simulation with an original road network, destination and route selection, action validation, deterministic travel, interruption feedback, and bounded replanning. Three reproducible scenarios cover a lake-view request, a market trip, and a road closure. Event traces expose decisions, validation results, executed actions, and outcomes.

The local demonstration currently uses a **scripted mock provider**. A server-side Meta API contract probe is available, but live model behaviour has not yet been verified.

**Planned:** the interactive Three.js neighbourhood, browser controls, an agent-debug panel, and verified Meta-powered gameplay. There is no browser interface yet.

## Technology

- **Current:** TypeScript, Node.js, Vitest, and tsx.
- **Integration foundation:** Meta Model API, with Muse Spark and Muse Wonder as runtime candidates.
- **Planned frontend:** Three.js and Vite.

## Getting started

Requires **Node.js 22.12 or newer** and npm.

```bash
git clone https://github.com/chriskript/AbujaCityLife-Ai-City.git
cd AbujaCityLife-Ai-City
npm ci
```

Run the current simulation:

```bash
npm run demo
```

This runs all three scenarios and prints JSON event traces. No API key or inference calls are required.

Run tests and static checks:

```bash
npm test
npm run typecheck
```

For server-side API setup and an offline configuration check, see the [Meta API guide](docs/meta-api.md). Keep credentials in local backend configuration; never put them in browser code or Git.

## Documentation

- [Simulation architecture](docs/architecture.md)
- [Meta API setup and verification](docs/meta-api.md)
- [Project provenance and third-party attribution](docs/provenance.md)

Developed for the October 26–November 4, 2026 hackathon. This entry is independent of the pre-existing Abuja City Life game.

## License

No project license has been selected yet. Third-party dependencies retain their own licenses; see [attribution](docs/provenance.md#direct-development-dependencies).
