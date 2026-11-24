# SleepStory: guide for graders

This guide is for anyone evaluating SleepStory without having followed the project. It covers the problem, how to open the prototype, what to try, and why each feature exists.

SleepStory is the **technical (AI) solution** of team SSLAAM (CS497 / HLTH480, Fall 2026). The team's **non-technical solution** is a set of sleep habit cards, documented separately by the team.

## The problem and the users

Insomnia is one of the most common reasons people see a primary care provider. To pick a treatment, the provider needs to know how the patient has really slept since the last visit, but:

- patients remember mostly their worst and most recent nights;
- paper sleep diaries are skipped after bad nights and filled in later from memory;
- consumer watches overestimate sleep in insomnia, and providers have no time to read raw watch data.

**Who it's for:**

- **Students and young adults with insomnia.** They log each night in about a minute.
- **Their primary care providers.** They read a one-page Sleep Snapshot before the visit.

More detail and sources are in [PRODUCT.md](PRODUCT.md).

## How to open it

All data is made up. Use the demo persona **Maya**, a 21-year-old student with insomnia.

| Option | How | What works |
|---|---|---|
| **Live app** (Demo Day) | At our table, or run it locally (below). Open the app; it starts on Maya's morning. | Everything: voice or text, AI, editing, the provider Snapshot |
| **Phone demo** (QR code) | Scan the QR code, or open https://sonyaaat.github.io/sleepstory/ on a phone or a computer. It starts on Maya's morning. | Every page: the check-in (type it, tap answers, or voice where the browser supports it), the Saved screen, onboarding, privacy and the provider Snapshot. The data stays on the phone. |
| **Clickable prototype** (backup) | Open `SleepStory-prototype.html` (shared by the team) in any browser, on a phone or a computer. | The main patient path, from the home screen to the Saved screen. Only the main buttons are active. |
| **Run locally** | Node.js 22, then `npm install`, `cp .env.example .env.local` (add the AI key), `npm run db:push`, `npm run dev`, and open http://localhost:3000 | Same as the live app. Without an AI key, a simple rule-based parser is used instead, and the app says so. |

Voice input works in Google Chrome. In other browsers, use **Type it** or **Tap answers**.

## Key tasks to try

1. **Log last night as Maya.** On the home screen, tap the microphone (or **Type it**) and describe the night, for example:
   > I went to bed around 12:30 but it took me about an hour to fall asleep because I kept thinking about my exam. I woke up twice and was awake for about 20 minutes in total. I got up at 8:15 and slept pretty badly. I had an energy drink at 4 pm, scrolled my phone in bed and took a melatonin before bed. I also had a really bad headache.

   Check the answers on **Here's what I heard** and change one by tapping it. Tap **Next**, look at **Anything else?** and tap **Save**. On the Saved screen, try **Edit**.
2. **Log a night without talking or typing.** Tap **Tap answers** on the home screen and pick an option under each question.
3. **Read the Sleep Snapshot as the provider.** In the top bar, switch to **Provider** and open Maya. Find out whether her sleep is improving, what needs attention, which sleep medicines she takes, and what she wants to talk about. Try **Download PDF**.

The top bar is a demo tool, not part of the product. Use **Reset** to restore Maya's data and start fresh.

## What the AI does

- **Input:** only the words the patient says or types about last night.
- **Output:** the standard sleep diary answers (Consensus Sleep Diary), plus the habits, sleep medicine and notes for the provider that the patient mentioned.
- **Model:** a self-hosted model, so the story is not sent to OpenAI or Google.

**How it handles its limits:**

- Answers the AI is unsure about get a ✓ to confirm, and an unclear answer is asked as a question with options instead of being guessed.
- Every answer can be changed with one tap, and "I don't know" is allowed.
- If the AI is slow or unavailable, a rule-based parser fills in the form, and the screen says so.
- The AI never calculates numbers. Everything on the Snapshot is computed by tested code from the answers the patient confirmed.
- The "What did the AI do?" panel explains the input, output, limits, fairness (built and tested with English stories) and where the AI runs.
- The privacy page explains, in plain language, what is stored and who sees it.

## Main features and the need behind each

| Feature | User need | Where it came from |
|---|---|---|
| Tell the night by voice or text | Paper diaries feel like work and get skipped after bad nights | Contextual inquiry, literature |
| AI fills in the diary; unsure answers get a ✓; unclear ones get a question | Patients must stay in control of what the AI writes | Interviews (a bad experience with an AI plan that couldn't be corrected), course rubric |
| "I don't know" for any answer | Honest diaries have gaps; guessing makes the data worse | Sleep diary research |
| **Tap answers** mode | Some mornings people don't want to talk or type | User testing |
| Two short pages instead of four | Fewer steps, less to read | User testing (3 sessions) |
| **Medication** section | Testers couldn't find where to record melatonin | User testing |
| **For your provider** notes, prefilled from the story | Symptoms like a headache were easy to miss | User testing |
| Forgiving streak (one missed morning a week is okay) and a home-screen widget | Testers said they would forget and that logging every day felt long; streaks motivate without punishing | User testing; research on sleep-tracking anxiety (no sleep score) |
| Saved screen with a night timeline, a weekly chart and streak badges | Testers wanted to see progress and something motivating, without reading | User testing |
| One-page **Sleep Snapshot**: verdict, what needs attention, a typical night, week-by-week bars, medicines, the patient's own words, what bad nights follow, watch vs diary | Providers have about two minutes before the visit | Community partner feedback, provider time studies |
| Watch is compared only after the diary is saved | Watches overestimate sleep in insomnia; the gap itself is useful | Literature, expert interview |
| Patient approves every share | Privacy and trust | Community partner feedback |

Every requirement, with its status and source, is in [REQUIREMENTS.md](REQUIREMENTS.md).

## What is simulated

- **Home-screen widget:** a mock-up on the home screen. A real widget needs an installed app.
- **Watch data:** simulated.
- **Provider side:** demo-only. In the real product, the provider would receive the Snapshot only after the patient approves.
- **Data:** Maya's 8 weeks are made up.
- **Phone demo:** the story is read by a simple rule-based reader in the browser instead of the self-hosted AI model, and the screens show its answers the same way. Nothing leaves the phone, and no session log is kept.
