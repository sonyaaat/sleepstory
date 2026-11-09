# Requirements

This file is the **single source of truth** for scope and status. Update the status in the same commit as the code.

## How to read this file

**Priority: when it gets built**

| Priority | Phase | Meaning |
|---|---|---|
| **P0** | First prototype (team meeting, Nov 9) | The two core tasks work end to end: *log last night* and *read the Snapshot*. |
| **P1** | Complete prototype (before peer evaluation / Demo Day) | The full patient journey: onboarding, pre-visit approval, My sleep. Built right after the first prototype. |
| **P2** | Final prototype (Dec 11, PO2 Round 2) | Improvements from Demo Day feedback, plus extensions that strengthen the AI and privacy story. |
| **Later** | Product roadmap, not built in the course | Shown in "Looking ahead" on the poster and in the business model. |

**Status:** `Done` · `In progress` · `Planned` · `Dropped` (with a reason)

**Why (sources)**

| Tag | Source |
|---|---|
| Lit | Literature from the team notebook (recall bias, diary adherence, wearable accuracy) |
| CA | Competitive analysis: *SleepStory: Competitive Analysis and Redesign* |
| Brenda | Brenda Vollmer, Ontario Health Team (co-creation session) |
| Larry | Larry, patient partner (co-creation session) |
| Edith | Prof. Edith Law (co-creation session) |
| Jen | Prof. Jennifer (co-creation session) |
| V0 | Peer feedback on the V.0 wireframes |
| Rubric | PO1/PO2 assignment rubrics |
| Team | Team decision (see [DECISIONS.md](DECISIONS.md)) |

---

## 1. Demo and tester tools (DEMO)

People will try the prototype themselves, so these exist to make that work. They are not product features.

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| DEMO-01 | Start screen with **Try as Maya** (main path, with 8 weeks of history) | P0 | Done | Rubric: visitors try core features end to end |
| DEMO-02 | Start screen option **Start as myself** (goes through onboarding) | P1 | Planned | Team |
| DEMO-03 | Each tester gets their own copy of the demo data (session cookie), so testers never see each other's entries | P0 | Done | Team |
| DEMO-04 | Tester bar on every screen: **Patient ↔ Provider** switch | P0 | Done | Team |
| DEMO-05 | Tester bar: **Next morning →** moves the demo date forward one day | P0 | Done | Team |
| DEMO-06 | Tester bar: **Reset** restores this tester's demo data | P0 | Done | Team |
| DEMO-07 | Tester bar: **New tester** starts a fresh session | P0 | Done | Team |
| DEMO-08 | **Add 4 weeks of sample nights** for "Start as myself", so the Snapshot isn't empty | P1 | Planned | Team |
| DEMO-09 | Generated 8-week dataset for Maya: midterm period, late caffeine, watch overestimating sleep on bad nights, some missed nights and late entries | P0 | Done | Lit, Edith |
| DEMO-10 | Provider list shows 2 more students with lighter data, for realism | P0 | Done | Team |
| DEMO-11 | Session log *recording*: check-in duration, number of AI fields the tester corrected, AI mode used, Snapshot viewing time | P0 | Done | V0 (data sanity), Rubric (evidence for evaluation) |
| DEMO-12 | Session log *page* for the team to read results after testing | P1 | Planned | Team |

## 2. Morning check-in (CHK)

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| CHK-01 | **Home:** "Log last night" button, forgiving streak ("5 of the last 7 days"), days until the visit. No score. | P0 | Done | Lit (orthosomnia), CA |
| CHK-02 | **Story step:** a text box plus a mic button (browser speech-to-text). The mic is hidden if the browser doesn't support it. | P0 | In progress | V0 (testers liked voice), CA (conversational diaries raise adherence) |
| CHK-03 | The AI extracts the 8 Consensus Sleep Diary fields from the story, with a confidence level per field | P0 | Done | CA, V0 |
| CHK-04 | **Review step:** all 8 fields are editable with a tap. Low-confidence fields are highlighted. Missing fields are asked for. Ambiguous answers get a question with options (e.g. "around 2": *2:00 am* or *2 hours*?). | P0 | Done | Rubric (user correction), CA, Larry |
| CHK-05 | Values the app assumed (e.g. "tried to sleep" = "got into bed") are labelled *assumed* | P0 | Done | CA |
| CHK-06 | **One follow-up question**, chosen by rules: "What woke you up?" if there were awakenings, otherwise "What kept you awake?" if falling asleep took 30 min or more. Skipped otherwise. **Pick any that fit** (multi-select chips) plus "or tell me in your own words" (text or voice). The Snapshot shows the most common reason. | P0 | Done | Notebook (wireframe fig. 7), reference design |
| CHK-07 | **Habit step** (see section 3) | P0 | Done | Notebook |
| CHK-08 | **Done step:** thank-you message ("your provider will have a clearer picture") and the forgiving streak. No score. | P0 | Done | Notebook (wireframe fig. 9), Lit |
| CHK-09 | **Watch vs diary after saving:** if the simulated watch total differs by 60 min or more, ask *I was lying awake but still / I took the watch off / Not sure*. Shown only after the patient has answered. | P0 | Done | Edith, Lit, Team |
| CHK-10 | **Rough-night mode:** only 3 questions (time to fall asleep, time awake, quality). Other fields are taken from the patient's usual times and marked as such. | P0 | Done | CA, Notebook |
| CHK-11 | **Late entry:** only yesterday can be caught up, and it's marked *late*. Older gaps stay gaps (no backfilling). | P1 | Planned | Lit (paper diaries are backfilled) |
| CHK-12 | One entry per night; the patient can edit today's entry | P1 | Planned | Team |
| CHK-13 | Voice input on phones (needs HTTPS hosting) | P2 | Planned | V0 |
| CHK-14 | Reminders at the patient's chosen time (SMS or web push) with a link straight to the check-in, stopping after one nudge | Later | Planned | Notebook (wireframe fig. 3), CA |
| CHK-15 | **"Worth telling your provider":** on the review screen, the AI lists up to 3 short facts from the story that the diary questions don't capture (a symptom, a new medicine, a life event), written in the patient's voice. Each fact must come with words that appear verbatim in the story, or it is dropped. The patient edits, removes or adds notes by text or voice. Saved per night; the newest appear on the Snapshot. | P0 | Done | Sofiia, CA (verifier step) |
| CHK-16 | **"I don't know"** for every diary answer except sleep quality. Unknown answers are saved as empty, never guessed. Each metric uses only the nights that have the answers it needs, and the Snapshot counts nights with missing answers. | P0 | Done | Sofiia, CSD (items may be left blank) |

## 3. Habits and sleep aids (HAB)

There is no evening log. Habits are one screen inside the morning check-in.

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| HAB-01 | "Was yesterday different from usual?" with a large **No, a normal day** button (one tap) | P0 | Done | CA (merge evening log into morning), Notebook (wireframe fig. 8) |
| HAB-02 | Chips: late caffeine or energy drink, alcohol, stressful day / deadline, studied late, screens in bed, napped, exercised, felt unwell | P0 | Done | Larry (sleep hygiene), Notebook (problem statement), reference design |
| HAB-03 | **Took a sleep aid** chip, which reveals *Melatonin · Over-the-counter · Prescription* | P0 | Done | CA (Ontario guideline: medication use matters) |
| HAB-04 | The AI pre-selects chips mentioned in the story, labelled "from your story"; the patient can remove them | P0 | Done | Team |
| HAB-05 | The patient's "usual day" (from onboarding) is shown on the habit screen | P1 | Planned | Notebook (wireframe fig. 8) |
| HAB-06 | Code compares nights with and without each habit, only when there are at least 5 nights on each side, and labels the result "linked, not proof" with the number of nights | P0 | Done | CA, Edith |
| HAB-07 | The patient sees "what seems linked" on My sleep | P1 | Planned | Brenda (patients see their own data) |
| HAB-08 | Link to the non-tech habit cards ("habit I'm trying this week") so the app can show whether sleep changes | P2 | Planned | Notebook (D4: SleepSnap works alongside habit cards), PO1 (integration question) |
| HAB-09 | **"Anything else different, or something new?"**: optional text or voice note on the habit screen for things the chips don't cover (new medication, illness, travel, shift work). Habits recognised in the note are ticked and labelled "from your note"; unticked ones stay unticked. The note is saved word for word and the 3 newest appear on the Snapshot. | P0 | Done | Team (Sofiia: chips can't capture something new) |
| MED-01 | **My sleep medicines** list per patient: name, who started it (provider / self), and for prescribed ones the plan in plain words (as needed up to N nights a week, or every night). Entered at registration (ONB-04); pre-filled for demo Maya (zopiclone course, melatonin). | P0 | Done | Sofiia, CA (Ontario guideline: medication use matters) |
| MED-02 | "Took a sleep aid" shows the patient's own medicines as one-tap chips, plus **Something else** (free name) for a new one. Safety line: "Questions about your medicine? Ask your provider or pharmacist." | P0 | Done | Sofiia |
| MED-03 | **Snapshot medicines:** per medicine, nights per week first vs last 4 weeks; plan and weeks above plan ("worth discussing", never "non-compliant"); new medicines not on the list flagged as new. Layout A shows only changes. | P0 | Done | Sofiia, Brenda (short for providers) |
| MED-04 | Amount (usual / more / less), editing the list, and "Did you start or stop any medicine?" before the visit | P1 | Planned | Sofiia (bare minimum first) |

## 4. Onboarding (ONB)

About 2–3 minutes. Each step feeds something used later.

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| ONB-01 | **Privacy in plain language** (what's collected, who sees it, that the patient approves every share, delete anytime) and a consent checkbox | P1 | Planned | Brenda, Rubric (privacy) |
| ONB-02 | **Baseline ISI** (Insomnia Severity Index, 7 questions, 0–28) | P1 | Planned | CA (Ontario guideline: standard tools) |
| ONB-03 | **Safety questions:** loud snoring or stopped breathing, restless legs, dozing while driving, PHQ-2 (2 mood questions) | P1 | Planned | CA |
| ONB-04 | **Your usual day** (caffeine, alcohol, school-night bedtime, exercise) and current sleep aids | P1 | Planned | CA |
| ONB-05 | **Your care:** provider (simulated), next visit date, reminder time, "Connect watch (demo)" | P1 | Planned | Notebook |

## 5. Before the visit (VIS)

For the P0 prototype, Maya's data already contains a completed pre-visit step and an approved share.

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| VIS-01 | A "Before your visit" card appears 7 days before the visit date | P1 | Planned | CA |
| VIS-02 | The patient retakes the ISI and the safety questions | P1 | Planned | CA |
| VIS-03 | "What do you most want to discuss?" (free text) | P1 | Planned | CA, Notebook |
| VIS-04 | The patient previews the Snapshot and taps **Approve & share**. Nothing reaches the provider without this. | P1 | Planned | Notebook (D4), Brenda |

## 6. Patient's own data (MY)

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| MY-01 | **My sleep:** weekly averages and "what seems linked". No sleep stages, no scores, plus the line "one night doesn't define your sleep". | P1 | Planned | Brenda, Lit (orthosomnia) |
| MY-02 | **Privacy & data page:** what is stored, where, and who sees it | P0 | Done | Brenda, Rubric |
| MY-03 | Download and delete my data | P2 | Planned | CA (PIPEDA access rights) |

## 7. Provider and Sleep Snapshot (PRV)

The layout follows the team's Sleep Snapshot wireframe (notebook, figure 10).

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| PRV-01 | **Patient list:** 3 students with visit date and share status | P0 | Done | Team |
| PRV-02 | **Header:** name, age, period covered, data completeness ("49 of 56 nights logged, 4 late"), watch source | P0 | Done | CA |
| PRV-03 | **Headline:** ISI at baseline vs now with severity band, the biggest change, number of red flags | P0 | Done | CA, Edith (one-page summary) |
| PRV-04 | **Metrics table:** first 4 weeks vs last 4 weeks (medians) for time to fall asleep, awake during the night, total sleep, time in bed, sleep efficiency, awakenings, poor nights per week (efficiency under 85%) | P0 | Done | CA (Somryst precedent, Ontario guideline) |
| PRV-05 | **Chart:** nightly sleep efficiency, a 7-night average line, and markers on sleep-aid nights | P0 | Done | CA, Notebook (wireframe) |
| PRV-06 | **Sleep aids:** nights per week by type, compared across periods | P0 | Done | CA |
| PRV-07 | **Screening and red flags**, each with a suggested next step ("Consider PHQ-9") | P0 | Done | CA |
| PRV-08 | **What seems linked to bad nights:** at most 3 rows, each with the number of nights and the caveat | P0 | Done | CA, Edith |
| PRV-09 | **Watch vs diary:** median watch total vs diary total, how many nights were mismatched, and the patient's explanations | P0 | Done | Edith, Lit |
| PRV-10 | **In their words:** 1–2 verbatim quotes (the newest first, so a tester sees their own) and "wants to discuss" | P0 | Done | CA, Notebook |
| PRV-11 | **Footer:** method (patient-reported diary, consumer watch data), "not a diagnosis", date generated | P0 | Done | CA (safety) |
| PRV-12 | **Download PDF:** a print layout that fits one page | P0 | In progress | Notebook (one-page snapshot) |
| PRV-13 | "How was this calculated?" explanation on each number | P1 | Planned | Rubric (AI role clear), Larry (trust) |
| PRV-14 | **Provider modules:** turn on ready-made extras per patient (anxiety screen GAD-2, sleep-aid taper, CBT-I sleep window). Shown as a "coming soon" toggle in P2, built later. | P2 / Later | Planned | Brenda (adjust by patient group), CA |
| PRV-15 | Send the Snapshot by email as a secure, expiring link (no health data in the email itself) | Later | Planned | CA (Ontario IPC email guidance) |
| PRV-16 | EMR-friendly export (OceanMD, FHIR) | Later | Planned | CA |
| PRV-17 | Compare across several visits | Later | Planned | CA |

## 8. Screening and safety (SAFE)

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| SAFE-01 | ISI scoring and bands: 0–7 none, 8–14 subthreshold, 15–21 moderate, 22–28 severe | P0 | Done | CA |
| SAFE-02 | PHQ-2 scoring; 3 or more is positive | P0 | Done | CA |
| SAFE-03 | Red-flag rules: snoring/stopped breathing → consider sleep apnea assessment; restless legs → consider RLS assessment; dozing while driving → urgent safety discussion; PHQ-2 ≥ 3 → consider PHQ-9 | P0 | Done | CA |
| SAFE-04 | The patient sees a calm message ("some answers are worth discussing with your provider"); the provider sees the flag | P1 | Planned | CA |
| SAFE-05 | Dozing while driving = yes → an immediate on-screen safety message, not delayed until the visit | P1 | Planned | CA |
| SAFE-06 | PHQ-2 positive → full PHQ-9 next time. PHQ-9 item 9 (self-harm) → crisis resources shown immediately. | P2 | Planned | CA |
| SAFE-07 | Snoring = yes → STOP-BANG apnea questionnaire | P2 | Planned | CA |
| SAFE-08 | **Wording rule:** the app never diagnoses or recommends medication changes. It says "consider" or "worth discussing", never "detects". | P0 | Done | CA (Health Canada SaMD) |

## 9. AI (AI)

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| AI-01 | Extraction uses the self-hosted **qwen3.6-35b-a3b** on the Intela gateway (OpenAI-compatible), with thinking off, JSON mode and temperature 0 | P0 | Done | Team, Edith (privacy via self-hosting) |
| AI-02 | The AI output is validated against the shared schema. Out-of-range or malformed values are rejected, never saved. | P0 | Done | V0 (data sanity, validators) |
| AI-03 | **Fallback parser:** rule-based extraction when there's no key, a timeout, or invalid output. The UI shows which mode was used. | P0 | Done | Rubric (handles errors) |
| AI-04 | **Quote check:** a quote is kept only if it appears word-for-word in the patient's story | P0 | Done | CA (verifier step) |
| AI-05 | **The AI never produces Snapshot numbers.** Only fields the patient confirmed feed the metrics. | P0 | Done | CA, Larry |
| AI-06 | "What did the AI do?" panel on the review screen: input (your words), output (these fields), limits (can be wrong; check highlighted fields), where it runs | P0 | Done | Rubric (role, inputs, outputs clear) |
| AI-07 | Count the fields the patient corrected (a measure of AI accuracy for evaluation) | P0 | Done | V0, Rubric |
| AI-08 | Fall back to the parser if the model takes longer than about 8 seconds | P0 | Done | NFR-02 |
| AI-09 | Self-hosted speech-to-text (Whisper) instead of browser speech, as a Python service or a gateway endpoint | P2 / Later | Planned | Privacy |
| AI-10 | An AI-written context summary of at most 3 sentences, built from the patient's own notes, with a check that rejects any number not in the computed data | P2 | Planned | CA |
| AI-11 | Weekly "what we noticed" for the patient: 2–3 code-computed observations plus one CBT-I-aligned tip | P2 | Planned | CA, Edith (habit building) |

## 10. Privacy and data protection (PRIV)

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| PRIV-01 | Use only made-up data. No real patient information in any environment. | P0 | Done | CA |
| PRIV-02 | Secrets live in `.env.local`, which git ignores; `.env.example` documents the variables | P0 | Done | Team |
| PRIV-03 | A plain-language privacy page (same as MY-02) | P0 | Done | Brenda |
| PRIV-04 | The patient approves every share (same as VIS-04) | P1 | Planned | Notebook |
| PRIV-05 | Data export and delete (same as MY-03) | P2 | Planned | CA |
| PRIV-06 | Real accounts and login, replacing demo sessions | P2 | Planned | Team |
| PRIV-07 | Production hardening: Canadian hosting, encryption at rest, audit logs, a PHIPA agent agreement with clinics | Later | Planned | CA |
| PRIV-08 | **Wording rule:** don't claim "data stays in Canada" until the gateway's server location is confirmed. Do say "self-hosted model; the text of your story is not sent to OpenAI or Google", and disclose that Chrome's voice typing uses Google (PRIV-10). | P0 | Done | Team |
| PRIV-09 | **Trustworthy privacy page:** a short version first; each section separates "in this prototype" from "in the real product"; covers what we collect and don't, the AI, voice input, who sees data, safeguards, rights, and breaches; links to the official sources (PHIPA, PIPEDA and its fair information principles, IPC Ontario email guidance, OPC breach reporting, the commissioners' generative AI principles and AI-in-health resolution, Health Canada SaMD guidance, complaint pages); never claims more than is true | P0 | Done | Sofiia (trust), Brenda, Rubric (privacy) |
| PRIV-10 | **Honest voice notice:** browser speech recognition (Chrome sends audio to Google) is disclosed next to each mic button and in the AI panel; typing is always offered | P0 | Done | Team (found while writing PRIV-09) |

## 11. Wearables (WEAR)

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| WEAR-01 | Simulated watch data in the demo (watch total sleep per night) | P0 | Done | Team |
| WEAR-02 | A wearable adapter interface, so real sources can be added without touching the screens | P0 | Done | Team |
| WEAR-03 | Oura API (OAuth, with a sandbox for demos) | Later | Planned | CA |
| WEAR-04 | Apple Health through an iOS Shortcut that sends data to our server (Apple has no web API) | Later | Planned | CA |
| WEAR-05 | Google Health API (Fitbit/Pixel), Garmin, Samsung Health | Later | Planned | CA |

## 12. Quality (NFR)

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| NFR-01 | Responsive: the patient side is designed for phones, the provider side for desktop, and both work on either | P0 | In progress | Team |
| NFR-02 | A check-in can be completed in about 60 seconds | P0 | In progress | CA, Notebook |
| NFR-03 | The Snapshot is readable in under a minute and prints on one page | P0 | In progress | Notebook, Brenda |
| NFR-04 | The app works when the AI is unavailable (fallback) | P0 | Done | Rubric |
| NFR-05 | Unit tests for metrics, questionnaire scoring, AI-output validation and the fallback parser | P0 | Done | V0 |
| NFR-06 | Accessibility basics: large tap targets, good contrast, labels on every input | P1 | Planned | Notebook (digital literacy) |
| NFR-07 | Public deployment (Vercel + Postgres) so testers can use their own phones | P2 | Planned | Team |
| NFR-08 | French version | Later | Planned | CA (bilingual Canada) |
| NFR-09 | UI copy says "primary care provider", not "doctor" | P0 | Done | Brenda |
| NFR-10 | UI is built from a ready-made component library (shadcn/ui on Tailwind), not custom styles. Only the theme colours are ours. | P0 | Done | Team (time) |
| NFR-11 | **Visual design follows the team reference prototype** (night indigo + moon yellow, Russo One headlines, Figtree text, big pill buttons, one question per screen) with a **light and dark theme** switch. The Snapshot always prints in the light theme. | P0 | Done | Sofiia (reference prototype in docs/design/inspiration) |

## 13. Course deliverables (DOC)

| ID | Requirement | Priority | Status | Why |
|---|---|---|---|---|
| DOC-01 | Project documents: product, requirements, roadmap, architecture, demo scenarios, decisions | P0 | Done | Team |
| DOC-02 | **PO2 guide:** problem and users, how to run, 2–3 key tasks, and the main features with the need behind each | P1 | Planned | Rubric (PO2) |
| DOC-03 | Feedback change log: each piece of Demo Day feedback, who gave it, and what changed or why not | P2 | Planned | Rubric (PO2 Round 2) |
| DOC-04 | Screenshots of each version for the poster and the blog | P1 | Planned | Rubric (PO1, PO3) |
