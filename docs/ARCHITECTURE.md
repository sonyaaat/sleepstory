# Architecture

How the code is organised, how data flows, and how to extend it. Requirement IDs refer to [REQUIREMENTS.md](REQUIREMENTS.md).

## Stack

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript | One project for the patient side, the provider side and the API routes |
| UI | **shadcn/ui** components on Tailwind CSS v4, icons from lucide-react | We don't write custom component styles (NFR-10). Only the theme colours in `globals.css` are ours. |
| Charts | Recharts | Sleep efficiency chart on the Snapshot |
| Validation | zod | One schema shared by the AI output, the API and the forms |
| Database | Prisma with SQLite (local) | Switch the provider to Postgres for deployment (NFR-07) |
| AI | `openai` client pointed at the Intela gateway, model `qwen3.6-35b-a3b` | Any OpenAI-compatible endpoint works |
| Tests | Vitest | Pure logic in `src/core` is fully tested |

Node 22 is pinned in `.tool-versions`.

## Folder structure

```
src/
  app/                      Next.js pages and API routes (thin: no business logic)
    page.tsx                Start screen: Try as Maya / Start as myself
    patient/                Home, check-in flow, My sleep, privacy page
    provider/               Patient list, Sleep Snapshot (/provider/snapshot/[id])
    api/                    extract, checkin, watch answer, tester actions
  components/
    ui/                     shadcn/ui components (generated, don't edit by hand)
    ...                     our components, built only from ui/ pieces
  core/                     Pure TypeScript: no database, no network, fully unit-tested
    time.ts                 Clock and date helpers
    schema.ts               Diary fields, habits, sleep aids (zod)
    metrics.ts              TIB, TST, SE, medians, period comparison
    questionnaires.ts       ISI and PHQ-2 scoring, red-flag rules
    habits.ts               Habit vs no-habit comparisons
    snapshot.ts             Builds the whole Snapshot object from nights + patient
    streak.ts               Forgiving streak
  adapters/                 Everything that talks to the outside world, behind interfaces
    llm/                    Gateway extractor, rule-based fallback, quote verifier
    speech/                 Browser speech now; Whisper service later
    wearables/              Simulated watch now; Oura, Apple Health, Google later
    notify/                 Reminders (Later)
  db/                       Prisma client, demo seed, session helpers
prisma/schema.prisma
tests/                      Vitest tests, mirroring src/core and src/adapters/llm
```

**Rule:** `src/core` never imports from `app`, `adapters` or `db`. Pages call core functions with data from `db`.

## Data model

All data belongs to a demo **Session** (one per tester, identified by a cookie). JSON fields are stored as strings because SQLite has no JSON type.

| Model | Key fields |
|---|---|
| **Session** | `id`, `kind` (`maya` or `self`), `today` (the simulated date, moved by *Next morning*) |
| **Patient** | `sessionId`, `name`, `age`, `providerName`, `visitDate`, `consentAt`, `usualDay` (JSON), `isiBaseline` / `isiPrevisit` (JSON answers), `screening` (JSON), `discuss`, `sharedAt`, `watchConnected` |
| **Night** | `patientId`, `date` (the evening the night started), `mode` (`full` or `rough`), the 8 diary fields, `habits` (JSON), `sleepAid`, `wokeReason`, `note`, `quote`, `lateEntry`, `watchTstMin`, `watchAnswer`, `aiFieldsCorrected`, `source` (`ai`, `fallback`, `manual`, `seed`) |
| **Event** | `sessionId`, `type`, `data` (JSON), `at`: the session log (DEMO-11) |

The Snapshot is never stored. It's computed from the nights every time it's shown, so it always matches the data.

### Dates and times

- A night is identified by the date of the **evening** it started (going to bed at 00:30 on Nov 9 belongs to the night of Nov 8).
- Clock times are stored as `"HH:MM"`. For calculations they become **minutes since noon**, so 23:00 → 660 and 01:00 → 780, and a night never wraps past midnight.

## Diary fields and metrics

The 8 fields come from the Consensus Sleep Diary (core version):

| Field | Meaning |
|---|---|
| `inBed` | Time got into bed |
| `lightsOut` | Time tried to fall asleep |
| `solMin` | Minutes to fall asleep |
| `awakenings` | Number of times woke up |
| `wasoMin` | Total minutes awake during the night |
| `finalWake` | Time of final awakening |
| `outOfBed` | Time got out of bed |
| `quality` | 1 (very poor) to 5 (very good) |

All metrics are computed in `src/core/metrics.ts`:

| Metric | Formula |
|---|---|
| Time in bed (TIB) | `outOfBed − inBed` |
| Total sleep time (TST) | `(finalWake − lightsOut) − solMin − wasoMin` |
| Sleep efficiency (SE) | `TST / TIB × 100` |
| Poor night | SE below 85% |
| Period comparison | Median of each metric, first 4 weeks vs last 4 weeks |
| Watch mismatch | `|watchTst − diaryTst| ≥ 60 min` |

Questionnaires (`src/core/questionnaires.ts`): ISI 0–28 with bands 0–7 / 8–14 / 15–21 / 22–28; PHQ-2 0–6, positive at 3 or more. Red-flag rules are listed in SAFE-03.

Habit links (`src/core/habits.ts`): for each habit, compare median SE on nights after a day with the habit vs without. Shown only when both sides have at least 5 nights, with the night counts and "linked, not proof".

## How the AI works

The AI has one job: **turn the patient's words into diary fields.** It never calculates or summarises numbers (principle 2 in [PRODUCT.md](PRODUCT.md)).

```
story text
   │
   ▼
/api/extract ──► gateway extractor (qwen, JSON mode, temperature 0, 8 s timeout)
   │                 │ fails, times out, or no key
   │                 ▼
   │             rule-based fallback parser
   ▼
zod validation (ranges, clock format) ── invalid fields dropped, marked missing
   ▼
quote check (quote must appear word-for-word in the story)
   ▼
review screen: patient confirms or corrects every field
   ▼
/api/checkin saves the confirmed night  ──►  core/metrics  ──►  Snapshot
```

The extractor returns, for each field: the value, a confidence (`high`, `medium`, `low`), and whether it was `assumed`. It also returns the habits mentioned, a possible ambiguity question, and one short quote. The response tells the UI which mode was used (`ai` or `fallback`), and the review screen shows it.

**Gateway settings:** `chat_template_kwargs: { enable_thinking: false }`, `response_format: { type: "json_object" }`, `temperature: 0`. If `finish_reason` is `length`, the output is treated as invalid.

## Environment variables

See [.env.example](../.env.example). Put real values in `.env.local`, which git ignores.

| Variable | Purpose |
|---|---|
| `JANUS_API_KEY` | Gateway key. Empty means the app uses the fallback parser. |
| `LLM_BASE_URL` | OpenAI-compatible base URL |
| `LLM_MODEL` | Model name |
| `DATABASE_URL` | SQLite file locally, Postgres URL when deployed |

## How to extend

**Add a UI component:** `npx shadcn@latest add <component>`. Build screens from those pieces; don't add hand-written CSS. If a layout needs something shadcn doesn't have, use Tailwind utility classes in the component.

**Add a habit chip:** add it to `HABITS` in `src/core/schema.ts`. The check-in, the extractor prompt and the habit comparison all read from that list.

**Add a questionnaire:** add scoring and a band function to `src/core/questionnaires.ts`, with tests, then a red-flag rule if needed.

**Add a wearable source:** implement the `WearableSource` interface in `src/adapters/wearables/` (returns watch total sleep per night). Screens don't change.

**Swap the AI model:** change `LLM_MODEL` / `LLM_BASE_URL`. Any OpenAI-compatible endpoint works. The validation and fallback stay the same.

**Add a Python service** (for example self-hosted Whisper speech-to-text, AI-09, or a heavier analysis model): run it as a small FastAPI service with its own folder (`services/<name>/`), and call it over HTTP from an adapter in `src/adapters/`. Its URL goes in an environment variable. The rest of the app only sees the adapter interface, so the TypeScript and Python parts stay independent.

**Move to Postgres** (NFR-07): change `provider` in `prisma/schema.prisma`, set `DATABASE_URL`, run `npx prisma migrate deploy`.
