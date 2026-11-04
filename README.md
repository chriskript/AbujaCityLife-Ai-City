# Abuja City Life: AI Town

A miniature living society where the residents have lives of their own.

Welcome to **Unity Gardens**, a fictional neighbourhood in Abuja, Nigeria. Sixteen residents share apartment blocks, standalone homes, local businesses and a central green. Each brings a different background, livelihood, needs and ambitions. A trader needs supplies. A courier looks for work. A neighbour may have time to talk or have another priority.

**We create the world, its rules, and its possibilities. The residents create their own stories.**

Built for the Meta Global AI Developer Hackathon 2026, Indie Developer track, Push the Frontier theme.

## Explore Unity Gardens

- Follow residents through their day: commuting, working, shopping, eating and resting at home or around the neighbourhood.
- Watch a small economy in motion, with paid work, finite supplies, market stock and physical deliveries.
- Discover social encounters, growing acquaintances and relationships shaped by what actually happens. Knowing someone does not automatically mean having their number or trusting them with a job.
- Open a resident's phone to inspect contacts, messages and simulated calls. Residents can accept, refuse, defer, clarify or ignore a discussion. Calls do not include voice audio.
- Select residents and buildings, inspect activities and events, or temporarily take control of a resident's phone. Close a road and observe how residents discover the change and respond.

The player can observe, talk and intervene without directing every life. Unity Gardens has a shared past; what happens next is open.

## Resident intelligence and Meta Muse

The local experience runs with **deterministic offline policies by default**, with no API charges. Offline residents already navigate, earn and spend, exchange messages, respond to requests and complete deliveries. Mock conversation is clearly labelled.

**Muse Spark 1.3**, through Meta Model API, adds language-model reasoning at selected decision opportunities. Live evaluations have demonstrated residents choosing work, food and replenishment, exchanging information, sharing contacts and following a workplace invitation. Residents have also independently introduced themselves, proposed a meeting, accepted and attended together. Sustained conversation during an agreed hangout and lasting friendship changes remain **unproven**. Muse receives the deciding resident's limited knowledge and personal context; proposed actions must pass the simulation's rules before changing the world.

Persistent local live use runs with `npm run dev:live` after you configure and authorize a reusable local operating policy. See the [persistent Muse operation guide](docs/local-live.md). Bounded experiments retain their separate approvals; see [Meta setup and evaluation documentation](docs/meta-api.md).

## Run locally

For the persistent Muse society, follow the one-time setup in the [local live guide](docs/local-live.md), then run **`npm run dev:live`**. It builds the interface, restores the authoritative society and prints its URL. Inference stays disabled until you explicitly authorize your local policy. The commands below run explicit offline Mock development with its own checkpoint.

You need **Node.js 22.12+**, npm and a WebGL 2-capable browser.

```bash
git clone https://github.com/chriskript/AbujaCityLife-Ai-City.git
cd AbujaCityLife-Ai-City
npm ci
npm run backend:init
npm run build
npm run backend
```

Open **http://127.0.0.1:8787/** and use the local access token in `runtime/demo-access.json`. The default offline town needs no Meta key. Keep API keys in backend configuration, never browser code or Git.

For frontend development, leave the backend running and run `npm run dev` in another terminal. For setup, controls and troubleshooting, see the [local operation guide](docs/backend.md).

## Built with

**TypeScript, Three.js, Vite, Node.js, Meta Model API, Vitest**

Developers can check the project with `npm test`, `npm run typecheck` and `npm run build`.

## An evolving society

The vision is a neighbourhood whose shared history grows through residents' choices: deeper relationships, changing livelihoods, new forms of cooperation and, eventually, community organisation and generations. The next step is more convincing autonomous interaction, with consequences people can follow and understand.

AI Town is a separate hackathon entry that builds on the broader Abuja City Life work.

## Learn more

- [Project status as of 4 November 2026: town, residents, relationships and Muse achievements](docs/project-status-2026-11-04.md)
- [Unity Gardens redesign: planning, migration, screenshots and verification](docs/unity-gardens-redesign.md)
- [Unity Gardens: history and residents](docs/unity-gardens.md)
- [Local operation and controls](docs/backend.md)
- [Simulation architecture](docs/architecture.md)
- [Muse: live validation and limitations](docs/nov3-autonomous-society-validation.md)
- [Accepted live Muse browser reliability and demonstration](docs/nov3-http-browser-reliability.md)
- [Submission walkthrough](docs/submission-walkthrough.md)
- [Project provenance and attribution](docs/provenance.md)

No project licence has been selected. Third-party dependencies retain their own licences.
