# Product: SleepStory

## The problem

Insomnia is one of the most common reasons people see a primary care provider. To choose a treatment (for example, adjusting a sleep aid or referring to CBT-I, cognitive behavioural therapy for insomnia), the provider needs to know how the patient has actually slept since the last visit. Today that information is hard to get:

- **Recall is biased.** When asked "how have you been sleeping?", patients remember mostly their worst and most recent nights (peak-end bias; Horwitz et al., 2023).
- **Paper sleep diaries fail.** People skip them after bad nights and fill them in later from memory. One study found patients reported 97.9% adherence, but only 37.1% of entries were made on time.
- **Wearable data doesn't fill the gap.** Consumer watches overestimate sleep in insomnia, because lying still while awake looks like sleep (agreement with lab tests drops from 82% in good sleepers to 39% in insomnia). Providers also have no time to read raw watch data: in a 2026 survey, under 6% of physicians had integrated wearable data, and time was the main barrier.

As a result, treatment decisions are made on an incomplete picture, and appointments feel unproductive for both sides.

## Who it's for

| User | Role in the product |
|---|---|
| **Students and young adults with insomnia** (primary user) | Spend about 60 seconds each morning on a check-in. Can see their own data. Approve every share with their provider. |
| **Primary care providers**, e.g. a family physician or nurse practitioner at campus health | Read a one-page Sleep Snapshot before the visit. No new account or software needed in the final design. |

Indirect stakeholders: clinic staff, privacy officers (PHIPA/PIPEDA), and family or roommates.

> Wording rule from community-partner feedback: say **"primary care provider"**, not "doctor" or "physician", in the UI and in documents.

### Demo persona

**Maya, 21, third-year student.** She has had trouble sleeping since first year. It gets worse around midterms, and late caffeine and studying in bed don't help. She sometimes takes melatonin, and her provider prescribed a sleep medication for a short time. She doesn't want another app that gives her a sleep score. She wants her provider to understand how her sleep has really been.

All demo data for Maya is made up.

## The solution in one paragraph

Each morning Maya taps a reminder link and tells the app about her night, by voice or text. A self-hosted AI model turns her story into Consensus Sleep Diary fields. She confirms them, and anything the AI is unsure about is highlighted for her to check. One tap records whether yesterday was different from a usual day (late caffeine, stress, a sleep aid, and so on). Her watch data, if any, is compared with her diary *after* she answers, and large gaps are flagged instead of hidden. Before her visit she retakes a short questionnaire, writes what she wants to discuss, previews the **Sleep Snapshot**, and approves sharing it. Her provider reads the one-page Snapshot in under a minute: how sleep changed, sleep-aid use, red flags, what seems linked to bad nights, how far the watch and diary agree, and Maya's own words.

## Design principles

Every feature has to follow these. Each one traces back to research or feedback.

| # | Principle | Why (source) |
|---|---|---|
| 1 | **The diary leads; the watch is a cross-check.** The patient answers before seeing watch data, and gaps are shown as information, not "corrected". | Wearables overestimate sleep in insomnia (*Sleep Medicine* 2026 review; Chinoy et al. 2021). Prof. Edith: the mismatch itself is useful. |
| 2 | **The AI listens; code calculates.** The AI only turns words into fields. Every number on the Snapshot comes from tested code. | Hallucinated numbers are a liability risk (competitive analysis). V.0 testing feedback: validate unstructured → structured data. |
| 3 | **The patient always has the last word.** Every AI-filled field can be corrected, and uncertain fields are highlighted. | PO2 rubric: handle uncertainty and user correction. Larry's bad experience with an AI action plan he couldn't correct. |
| 4 | **No sleep score, no grades.** Forgiving streaks ("5 of the last 7 days") that never reset to zero. | Orthosomnia: sleep tracking can increase sleep anxiety (30.9% of trackers screened at risk, 2026). |
| 5 | **Low effort, especially on bad nights.** About 60 s per check-in, a 3-question rough-night mode, and habits recorded in one tap. | Paper diaries fail after bad nights (team notebook). Prof. Edith: people are bad at consistent self-reporting. |
| 6 | **Short for providers.** One page, red flags first, readable in under a minute. | Brenda: don't overwhelm providers. AMA 2026: time is the main barrier. |
| 7 | **Associations, never causes.** "Linked, not proof", always with the number of nights. | Few nights and many confounders (competitive analysis). |
| 8 | **Privacy explained in plain language; the patient approves every share.** | Brenda: explain where data is stored and how it is used. |
| 9 | **The app never diagnoses or recommends treatment.** It suggests what's worth discussing. | Regulatory (Health Canada SaMD) and safety. |
| 10 | **Works without a wearable.** | Equity: not everyone owns one (team notebook, D4). |

## What makes it different

- **Versus CBT-I apps** (Sleepio, Somryst, CBT-i Coach): those treat insomnia. SleepStory supports whatever treatment the provider chooses, and it's made for the short primary-care visit.
- **Versus trackers and their AI coaches** (Oura, Whoop, Apple): those are tracker-led, give a generic sleep score, and are tied to one brand of device. SleepStory is diary-led, works with any device or none, and avoids scores.
- **Versus the Consensus Sleep Diary app:** it uses the same validated diary questions, but adds conversation, low-effort input, and a provider-ready summary.

The full competitive analysis is in the team's project folder (`SleepStory: Competitive Analysis and Redesign…`).
