# Roadmap

Phases and their contents. Each item is a requirement ID from [REQUIREMENTS.md](REQUIREMENTS.md); status is tracked there, not here.

## Phase 0: First prototype (team meeting, Nov 9)

**Goal:** the two core tasks work end to end with Maya's demo data.
1. A tester logs last night (story → AI fields → correct → follow-up → habits → done → watch comparison).
2. A tester switches to the provider side and reads Maya's Snapshot, including their own new entry.

**Build order** (each step leaves something you can show):

| # | Step | Requirements |
|---|---|---|
| 1 | Core logic and tests: metrics, scoring, red-flag rules, habit comparisons | SAFE-01–03, HAB-06, NFR-05 |
| 2 | Database, demo sessions, Maya's 8-week data, the 2 extra students | DEMO-03, DEMO-09, DEMO-10, WEAR-01 |
| 3 | UI kit set up (shadcn/ui), then Sleep Snapshot page, patient list, PDF print | NFR-10, PRV-01–12 |
| 4 | AI extraction with validation, fallback, quote check | AI-01–08 |
| 5 | Check-in flow: home, story, review, follow-up, habits, done, watch question, rough-night mode | CHK-01–10, HAB-01–04 |
| 6 | Tester bar, session log recording, privacy page | DEMO-01, DEMO-04–07, DEMO-11, MY-02, PRIV-03 |

**Waiting on:** the gateway key in `.env.local` (AI-01), and UI inspiration images in [design/inspiration/](design/inspiration/) before building screens (steps 3, 5, 6). The images guide layout and colours; components come from shadcn/ui, not custom CSS (NFR-10).

## Phase 1: Complete prototype (before peer evaluation and Demo Day)

**Goal:** the full patient journey, and everything a cognitive walkthrough or a Demo Day visitor might try.

- Onboarding: ONB-01–05, DEMO-02, DEMO-08
- Before the visit: VIS-01–04, PRIV-04
- Safety messages: SAFE-04, SAFE-05
- Patient's own data: MY-01, HAB-05, HAB-07
- Check-in details: CHK-11, CHK-12
- Provider: PRV-13
- Evaluation support: DEMO-12, NFR-06
- Course: DOC-02 (PO2 guide), DOC-04 (screenshots)

## Phase 2: Final prototype (Dec 11)

**Goal:** respond to Demo Day feedback (DOC-03) and strengthen the AI and privacy story.

- Deployment and access: NFR-07, CHK-13, PRIV-06
- AI: AI-09 (self-hosted speech-to-text), AI-10, AI-11
- Safety: SAFE-06, SAFE-07
- Integration with the habit cards: HAB-08
- Provider modules preview: PRV-14
- Data rights: MY-03, PRIV-05

The Demo Day feedback will reorder this list. Record every change in the feedback change log (DOC-03).

## Later: product roadmap (not built in the course)

CHK-14 reminders · PRV-15 secure email links · PRV-16 EMR export · PRV-17 multi-visit comparison · PRIV-07 production hardening · WEAR-03–05 real wearables · NFR-08 French · a validation study with campus health providers.

## Progress log

| Date | What was done |
|---|---|
| 2026-11-08 | Project set up (Next.js, TypeScript, Tailwind, Prisma, zod, Vitest). Gateway access tested. Project documents written. Shared diary schema and time helpers started. |
| 2026-11-08 | Step 1 done: sleep metrics, period comparison, watch comparison, ISI/PHQ-2 scoring, red flags, habit links, streak and check-in rules, with 35 unit tests. UI library chosen (shadcn/ui). |
| 2026-11-08 | Step 2 done: Prisma schema and SQLite database, per-tester demo sessions (create, reset, next morning, new tester, event log), Maya's 8-week generated data and 2 extra students, tested against the Snapshot story. Tester bar UI still to come. |
| 2026-11-08 | Steps 3–6 built with shadcn/ui default styling: start screen, tester bar, patient home, check-in flow (story, review, follow-up, habits, done, watch question, rough-night mode), privacy page, provider list, Sleep Snapshot with chart and print layout, session log. AI extraction tested with the fallback; the gateway is waiting for the API key. Still to check in a browser: voice input, one-page print, phone layout. Restyle once UI inspiration images are added. |
