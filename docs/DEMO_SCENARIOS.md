# Demo scenarios

How testers use the prototype, and the scenarios for the team meeting, the peer evaluation (cognitive walkthrough) and Demo Day.

## How a tester uses the prototype

1. Open the app. The start screen offers **Try as Maya** (the main path) and, from P1, **Start as myself**.
2. *Try as Maya* gives the tester their own copy of Maya's 8 weeks of made-up data. Other testers never see it.
3. A **tester bar** sits at the top of every screen. It's a demo tool, not part of the product:
   - **Patient ↔ Provider**: switch sides to see your own entry appear on the Snapshot.
   - **Next morning →**: move the demo date forward one day, so you can log another night.
   - **Reset**: restore Maya's original data.
   - **New tester**: start a fresh session (for the next person at a Demo Day table).
4. The app quietly records a session log: how long the check-in took, how many AI fields the tester corrected, whether the AI or the fallback was used, and how long the Snapshot was open. The team uses it as evaluation evidence (DEMO-11).

**About Maya:** 21, third-year student. Insomnia since first year, worse around midterms. Late caffeine and studying in bed. Sometimes takes melatonin; had a short course of a prescription sleep aid. Her watch tends to overestimate her sleep on bad nights. Her visit with her primary care provider is in a few days, and she has already approved sharing her Snapshot.

## Scenario 1: Log last night (patient)

**Setup:** *Try as Maya* → patient home.

**Task given to the tester:**
> You're Maya. Last night you went to bed at 12:30, it took you about an hour to fall asleep, you woke up twice for about 40 minutes in total, and you got up at 8:15. You had an energy drink at 4 pm and took a melatonin before bed. Log your night.

**Expected steps:**

| # | Screen | What the tester does | What should happen |
|---|---|---|---|
| 1 | Home | Taps **Log last night** | Sees the forgiving streak and days until the visit. No score. |
| 2 | Story | Types or says the night in their own words | Mic button works in desktop Chrome; text always works |
| 3 | Review | Checks the 8 fields, fixes anything wrong | Fields are filled from the story. Unsure fields are highlighted. "Assumed" values are labelled. An ambiguous answer gets a question with options. The "What did the AI do?" panel explains the AI's role. |
| 4 | Follow-up | Answers "What woke you up?" | Only one question, because there were awakenings |
| 5 | Habits | Keeps "Late caffeine" (pre-selected *from your story*) | One tap is enough |
| 5b | Habits | Checks **Took a sleep aid → Melatonin** (pre-selected from the story) and taps **Save** | Her own medicines appear as chips; **+ Something else** adds a new one |
| 6 | Done | Reads the thank-you message | Streak goes up; no score |
| 7 | Watch question | Answers why the watch shows more sleep | Appears only after the diary is saved, and only if the gap is 60 min or more |

**Variations to try:**
- **Tap answers:** tap *Tap answers* on the home screen (or *Rather tap your answers* on the typing screen) and pick an option under each question.
- **No AI:** with no gateway key, the review screen says the simple parser was used, and everything still works.
- **Vague story:** "slept badly, woke up around 2" → the app asks whether that's *2:00 am* or *2 hours*.

**Success:** the night is saved with correct fields in about 60 seconds, and the tester could fix anything the AI got wrong.

## Scenario 2: Read the Sleep Snapshot (provider)

**Setup:** tester bar → **Provider** → patient list → Maya.

**Task given to the tester:**
> You're Maya's primary care provider, and you have one minute before her visit. Find out: has her insomnia improved, is there anything you should screen for, can you trust her watch data, and what does she want to talk about?

**Where the answers are:**

| Question | Where on the Snapshot | Expected answer with Maya's data |
|---|---|---|
| Has it improved? | Headline: ISI baseline vs now; metrics table first vs last 4 weeks | ISI went down but is still in the subthreshold or moderate band; time to fall asleep improved |
| Anything to screen for? | Screening and red flags | PHQ-2 positive → *consider PHQ-9* |
| Sleep medicines? | Sleep medicines section (layout B) or "Anything to act on?" (layout A) | Zopiclone: used more often than planned in 1 of 8 weeks, then stopped; melatonin about 2 nights a week; **Nytol is new** (self-started, not on her list) |
| What seems linked to bad nights? | What seems linked (max 3 rows) | Studying late, stressful days and late caffeine, each with night counts and "linked, not proof" |
| Can you trust the watch? | Watch vs diary | The watch shows about an hour more sleep on bad nights; Maya says she was lying awake still |
| What does she want to discuss? | In their words | Her quote and "wants to discuss" text. If the tester did scenario 1 first, their own words appear here. |

**Variation:** tap **Download PDF**. The Snapshot fits on one printed page.

**Success:** the tester answers all four questions in under a minute without scrolling back and forth.

## Questions to ask testers at the end

1. Was anything the AI filled in wrong? Was it easy to fix?
2. Did you understand what the AI did and didn't do?
3. Would you do this every morning? What would stop you?
4. (Provider side) What would you remove from the Snapshot? What's missing?
5. Did anything make you worry about your privacy?

## Before a demo

- `npm run dev`, open http://localhost:3000, click **Try as Maya**, run both scenarios once.
- Check that the review screen says the AI was used (not the fallback). If it shows the fallback, check `JANUS_API_KEY` in `.env.local`.
- Press **New tester** between visitors.
