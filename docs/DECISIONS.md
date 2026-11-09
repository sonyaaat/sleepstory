# Decisions

Decisions we've made and why, so nobody has to re-discuss them. Add new ones at the bottom with the date. If a decision changes, don't delete it: mark it *Replaced by #N*.

| # | Date | Decision | Why |
|---|---|---|---|
| 1 | 2026-11-08 | **Responsive web app**, no native app | One codebase for phones and the provider's desktop; testers can try it from a link |
| 2 | 2026-11-08 | **Next.js + TypeScript**, one project for frontend, API and logic | Fastest way to a working end-to-end prototype; one shared schema for AI output, API and forms. Python can still be added as separate services (see #9). |
| 3 | 2026-11-08 | **Self-hosted qwen3.6-35b-a3b** on the Intela gateway, not OpenAI or Google | Privacy story (patients' words aren't sent to big-tech APIs), and it's free for the team. Thinking is turned off for speed. |
| 4 | 2026-11-08 | **The AI only extracts diary fields; code computes every number** | Hallucinated numbers on a clinical summary are a liability risk (competitive analysis). Code can be unit-tested. |
| 5 | 2026-11-08 | **Rule-based fallback** when the AI is unavailable, slow (over ~8 s) or returns invalid output | A demo must never break; the rubric asks how the system handles errors |
| 6 | 2026-11-08 | **Simulated accounts** (one demo session per tester, by cookie) instead of real login | Many people will try the prototype at once; real accounts are on the roadmap (PRIV-06) |
| 7 | 2026-11-08 | **Users are students and young adults**; the demo persona is Maya, 21 | The team's chosen population; campus health is the realistic first setting |
| 8 | 2026-11-08 | **Habits are recorded inside the morning check-in**, not in a separate evening log | One check-in a day keeps effort low (competitive analysis: merge the evening log into the morning) |
| 9 | 2026-11-08 | **Python modules are added as HTTP services** behind adapters (e.g. Whisper speech-to-text) | Keeps the TypeScript app simple while letting the team use Python ML tools later |
| 10 | 2026-11-08 | **Watch data is shown only after the patient answers**, and gaps are shown, not corrected | Wearables overestimate sleep in insomnia; Prof. Edith: the mismatch itself is useful information |
| 11 | 2026-11-08 | **No sleep score; forgiving streaks** that never reset to zero | Orthosomnia risk (sleep tracking can increase anxiety) |
| 12 | 2026-11-08 | **Wording:** "primary care provider", never "doctor"; "consider" / "worth discussing", never "detects" or "diagnoses" | Community-partner feedback; Health Canada software-as-a-medical-device rules |
| 13 | 2026-11-08 | **Privacy wording:** say "self-hosted model, not sent to OpenAI or Google". Don't say "stays in Canada" yet. | The gateway's server location isn't confirmed |
| 14 | 2026-11-08 | **Browser speech-to-text** (Web Speech API) for voice in the first prototype; self-hosted Whisper later | Works today in desktop Chrome with no setup. Phone voice needs HTTPS hosting (CHK-13). |
| 15 | 2026-11-08 | **UI from a component library: shadcn/ui** (on Tailwind, with lucide icons). No custom styles from scratch. | Building our own styles would take too long. shadcn gives accessible, good-looking components that we copy into the repo and can still adjust. The UI inspiration images guide layout and colours only. |
| 16 | 2026-11-08 | **SQLite locally, Postgres when deployed**, through Prisma | No setup for teammates; one setting to switch |
| 17 | 2026-11-08 | **Free-text / voice "anything else?" note next to the habit chips.** Known habits in it are recognised by rules (not the AI) and ticked for the patient to confirm; the rest is shown to the provider word for word, at most 3 notes. | Chips miss new or unusual events, which often matter most to a provider. Rules are instant while typing; keeping the patient's words avoids AI rewording. |
