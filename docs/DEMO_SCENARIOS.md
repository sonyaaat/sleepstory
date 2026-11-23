# Demo scenarios

How testers use the prototype, and the scenarios for the team meeting, the peer evaluation (cognitive walkthrough) and Demo Day.

## How a tester uses the prototype

1. Open the app. The start screen offers **Try it as Maya, from sign-up** and **Skip to Maya's morning** (the main path).
2. Either button gives the tester their own copy of Maya's 8 weeks of made-up data. Other testers never see it.
3. A **tester bar** sits at the top of every screen. It's a demo tool, not part of the product:
   - **Patient ↔ Provider**: switch sides to see your own entry appear on the Snapshot.
   - **Reset**: restore Maya's original data.
   - **New tester**: start a fresh session (for the next person at a Demo Day table).
4. The app quietly records a session log: how long the check-in took, how many AI fields the tester corrected, whether the AI or the fallback was used, and how long the Snapshot was open. The team uses it as evaluation evidence (DEMO-11).

**About Maya:** 21, third-year student. Insomnia since first year, worse around midterms. Late caffeine and studying in bed. Sometimes takes melatonin; had a short course of a prescription sleep aid. Her watch tends to overestimate her sleep on bad nights. Her visit with her primary care provider is in a few days, and she has already approved sharing her Snapshot.

## Scenario 1: Log last night (patient)

**Setup:** **Skip to Maya's morning** → patient home.

**Task given to the tester:**
> You're Maya. Last night you went to bed around 12:30, it took you about an hour to fall asleep because you kept thinking about your exam, you woke up twice for about 20 minutes in total, and you got up at 8:15. You slept badly. You had an energy drink at 4 pm, scrolled your phone in bed, took a melatonin, and had a bad headache. Log your night and make sure your provider will know about the melatonin and the headache.

**Expected steps:**

| # | Screen | What the tester does | What should happen |
|---|---|---|---|
| 1 | Home | Taps the **microphone** (or **Type it**) | Sees the streak with flames for logged mornings and a dashed circle for a missed one. No score. |
| 2 | Story | Says or types the night | Six hint tiles show what to cover. The mic works in Chrome; typing always works. |
| 3 | Here's what I heard | Checks the diary answers and the face for sleep quality, optionally taps ✓, taps a line to change it, then **Next** | Answers are filled from the story. Unsure ones have a ✓ circle. An unclear answer is asked inline with options. "What did the AI do?" explains the AI's role. |
| 4 | Anything else? | Checks that **Melatonin**, **Late caffeine** and the headache are already there, then **Save** | Everything here is optional and prefilled from the story. "+ Other" adds a medicine, a wake reason or a habit that isn't listed. |
| 5 | Saved | Looks at the streak and badges, the night timeline and the weekly chart, then taps **Edit** and comes back | Results are shown as pictures. Edit reopens the answers, and saving again replaces the entry. |
| 6 | Watch question | Answers why the watch shows more sleep, if asked | Appears only after saving, and only if the gap is 60 min or more |

**Variations to try:**
- **Tap answers:** tap *Tap answers* on the home screen (or *Rather tap your answers* on the typing screen) and pick an option under each question.
- **No AI:** with no gateway key, the review screen says the simple parser was used, and everything still works.
- **Vague story:** "slept badly, woke up around 2" → the app asks whether that's *2:00 am* or *2 hours*.
- **I don't know:** "I woke up twice, I don't remember for how long" → the app asks how long, and the answer can stay *Don't know*.

**Success:** the night is saved with correct answers in about a minute, and the tester could fix anything the AI got wrong.

## Scenario 2: Read the Sleep Snapshot (provider)

**Setup:** tester bar → **Provider** → patient list → Maya.

**Task given to the tester:**
> You're Maya's primary care provider, and you have one minute before her visit. Find out: has her insomnia improved, is there anything you should screen for, can you trust her watch data, and what does she want to talk about?

**Where the answers are** (default **Simple** layout):

| Question | Where on the Snapshot | Expected answer with Maya's data |
|---|---|---|
| Has it improved? | Verdict and Insomnia Severity Index scale at the top; sleep diary week by week (numbers and 8-week bars) | "Sleep is getting better"; Insomnia Severity Index 20 → 14 (moderate → subthreshold) |
| Anything to act on? | Needs attention | PHQ-2 positive → *consider PHQ-9*; zopiclone taken more often than planned in 1 of 8 weeks; **Nytol is new** (self-started) |
| Sleep medicines? | Sleep medicines table | Zopiclone stopped; melatonin about 2 nights a week; Nytol new |
| What seems linked to bad nights? | Worse nights tend to follow | Stressful days, studying late and late caffeine; most often woken by racing thoughts |
| What does she want to discuss? | Patient wants to talk about | Her own words. If the tester did scenario 1 first, their note (e.g. the headache) appears here. |
| Can you trust the watch? | Watch vs diary | The watch shows about an hour more sleep than the diary; Maya says she was lying awake still |

**Variation:** tap **Download PDF**. The Snapshot fits on one printed page.

**Success:** the tester answers all four questions in under a minute without scrolling back and forth.

## Questions to ask testers at the end

1. Was anything the AI filled in wrong? Was it easy to fix?
2. Did you understand what the AI did and didn't do?
3. Would you do this every morning? What would stop you?
4. (Provider side) What would you remove from the Snapshot? What's missing?
5. Did anything make you worry about your privacy?

## Before a demo

- `npm run dev`, open http://localhost:3000, click **Skip to Maya's morning**, run both scenarios once.
- Check that the review screen says the AI was used (not the fallback). If it shows the fallback, check `JANUS_API_KEY` in `.env.local`.
- Press **New tester** between visitors.
