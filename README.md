# SleepStory

A web app for students and young adults with insomnia and their primary care providers.

Each morning, the patient spends about 60 seconds describing last night in their own words. An AI turns the story into standard sleep-diary fields, and the patient confirms or corrects them. Before a visit, the app builds a one-page **Sleep Snapshot** that a primary care provider can read in under a minute. Every number on it is calculated by tested code, never by the AI.

This is the technical (AI) solution of team SSLAAM's project for CS497 / HLTH480 (Fall 2026). The team's non-technical solution, the sleep habit cards, is not part of this repository.

## Project documents

| Document | What's in it |
|---|---|
| [docs/PRODUCT.md](docs/PRODUCT.md) | The problem, target users, persona, and the design principles behind every feature |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Every feature and requirement, with its ID, priority, status, and the research or feedback behind it |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What gets built in which phase, and what's done so far |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, folder structure, data model, how the AI works, metric formulas, how to extend |
| [docs/DEMO_SCENARIOS.md](docs/DEMO_SCENARIOS.md) | How testers use the prototype, and the peer-evaluation scenarios with expected steps |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decisions we've made and why, so nobody has to re-discuss them |
| [docs/design/](docs/design/) | UI inspiration and design notes |

**Start with PRODUCT.md, then ROADMAP.md.** REQUIREMENTS.md is the single source of truth for scope and status.

## Running it locally

Requirements: Node.js 22 (the repo pins `22.14.0` in `.tool-versions` for asdf users).

```bash
npm install
cp .env.example .env.local   # then paste your JANUS_API_KEY into .env.local
npm run dev                  # http://localhost:3000
```

`.env.local` is git-ignored. Never commit API keys. Without a key, the app still works: it falls back to a simple rule-based parser instead of the AI model, and the UI says so.

Other commands:

```bash
npm test          # unit tests for metrics, scoring and AI-output validation
npm run lint
```

## Working on this project together

- **Before starting a feature**, find its ID in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) and set its status to *In progress*.
- **When a feature is done**, set it to *Done* in the same commit as the code.
- **Commit messages:** one line, past-tense verb, lowercase, no period, about 60 characters, e.g. `added sleep efficiency chart to snapshot`.
- **One logical change per commit.**
- **New decisions** (anything a teammate might otherwise question later) go in [docs/DECISIONS.md](docs/DECISIONS.md).
- **Use only made-up data.** This is a course prototype, not a medical device. Never enter real patient information.
