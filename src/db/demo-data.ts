// Made-up demo data (PRIV-01, DEMO-09, DEMO-10). Pure functions: no database access.
// The same anchor date always produces the same data, so tests and demos are repeatable.

import type { IsiAnswers, Screening } from "@/core/questionnaires";
import type { HabitKey, Night, SleepAid, WokeReason } from "@/core/schema";
import { NightSchema } from "@/core/schema";
import { nightMetrics, WATCH_MISMATCH_MIN } from "@/core/metrics";
import { addDays, formatClock, parseClock } from "@/core/time";

export interface DemoPatient {
  isMain: boolean;
  name: string;
  age: number;
  providerName: string;
  visitDate: string;
  consentAt: Date | null;
  usualDay: UsualDay;
  isiBaseline: IsiAnswers | null;
  isiPrevisit: IsiAnswers | null;
  screening: Screening | null;
  discuss: string | null;
  sharedAt: Date | null;
  watchConnected: boolean;
  nights: Night[];
}

export interface UsualDay {
  inBed: string;
  lightsOut: string;
  finalWake: string;
  outOfBed: string;
  caffeine: string;
  alcohol: string;
  exercise: string;
  sleepAids: string;
}

export const PROVIDER_NAME = "Dr. Alex Chen, NP"; // simulated provider

/** Small deterministic random generator (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    chance: (p: number) => next() < p,
    pick: <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)],
  };
}

const round5 = (n: number) => Math.max(0, Math.round(n / 5) * 5);
const shift = (hhmm: string, min: number) => formatClock(parseClock(hhmm) + min);

const MAYA_NOTES: { text: string; quote: string }[] = [
  {
    text: "Midterm tomorrow so I was in bed with my laptop until late. Lay there for ages thinking about the exam.",
    quote: "Lay there for ages thinking about the exam.",
  },
  {
    text: "Had an energy drink at the library around 5. Felt wired until almost 2.",
    quote: "Felt wired until almost 2.",
  },
  {
    text: "Woke up at 4 and my mind just started going through everything I have to do this week.",
    quote: "my mind just started going through everything I have to do this week",
  },
  {
    text: "Better night. No coffee after lunch and I left my phone on the desk.",
    quote: "No coffee after lunch and I left my phone on the desk.",
  },
  {
    text: "My watch says I slept 7 hours but I was awake for a lot of that, just lying still.",
    quote: "I was awake for a lot of that, just lying still.",
  },
];

// Things Maya noted that don't fit a chip (HAB-09). Keyed by night index.
const MAYA_DAY_NOTES: Record<number, string> = {
  9: "Started a part-time job at the campus café, closing shift until 10:30.",
  23: "Had a cold, took cough syrup before bed.",
  38: "Fight with my roommate, kept replaying it in my head.",
  47: "Went home for the weekend, different bed.",
  52: "Closing shift at the café again.",
};

interface NightPlan {
  baseSol: number;
  baseWaso: number;
  prescriptionRate: number;
  melatoninRate: number;
  stressRate: number;
}

function planFor(weekIndex: number): NightPlan {
  // Weeks 0-1: on a short prescription course. Weeks 2-3: midterms. Weeks 4-7: slowly better.
  if (weekIndex < 2) return { baseSol: 45, baseWaso: 40, prescriptionRate: 0.45, melatoninRate: 0.15, stressRate: 0.3 };
  if (weekIndex < 4) return { baseSol: 60, baseWaso: 50, prescriptionRate: 0, melatoninRate: 0.4, stressRate: 0.65 };
  if (weekIndex < 6) return { baseSol: 35, baseWaso: 30, prescriptionRate: 0, melatoninRate: 0.35, stressRate: 0.3 };
  return { baseSol: 25, baseWaso: 20, prescriptionRate: 0, melatoninRate: 0.25, stressRate: 0.25 };
}

/**
 * Maya's 8 weeks (56 nights) ending with the night before `today`.
 * Includes missed nights, late entries, late caffeine linked to worse nights,
 * and a watch that overestimates sleep on bad nights.
 */
export function mayaNights(today: string, seed = 21): Night[] {
  const r = rng(seed);
  const lastNight = addDays(today, -1);
  const first = addDays(lastNight, -55);
  const nights: Night[] = [];
  let noteIdx = 0;

  for (let i = 0; i < 56; i++) {
    const date = addDays(first, i);
    // Leave last night empty so the tester can log it; skip ~1 night a week.
    if (date === lastNight) continue;
    if (i > 2 && i < 54 && r.chance(0.12)) continue;

    const plan = planFor(Math.floor(i / 7));
    const habits: HabitKey[] = [];
    const caffeine = r.chance(0.3);
    if (caffeine) habits.push("caffeine_late");
    const stress = r.chance(plan.stressRate);
    if (stress) habits.push("stress");
    if (stress && r.chance(0.6)) habits.push("late_study");
    if (r.chance(0.35)) habits.push("screens_bed");
    if (r.chance(0.12)) habits.push("nap");
    if (r.chance(0.25)) habits.push("exercise");
    if (r.chance(0.08)) habits.push("alcohol");

    let sleepAid: SleepAid | null = null;
    if (r.chance(plan.prescriptionRate)) sleepAid = "prescription";
    else if (r.chance(plan.melatoninRate)) sleepAid = "melatonin";

    const late = habits.includes("late_study") ? r.int(30, 75) : 0;
    const inBed = shift("00:15", r.int(-30, 30) + late);
    const lightsOut = habits.includes("screens_bed") ? shift(inBed, r.int(10, 40)) : shift(inBed, r.int(0, 10));

    let sol = plan.baseSol + r.int(-15, 20);
    let waso = plan.baseWaso + r.int(-15, 20);
    if (caffeine) sol += r.int(40, 60);
    if (stress) waso += r.int(5, 25);
    if (sleepAid === "prescription") sol -= 15;
    if (habits.includes("exercise")) sol -= 5;
    sol = Math.max(5, round5(sol));
    waso = round5(waso);
    const awakenings = waso === 0 ? 0 : waso < 25 ? 1 : waso < 50 ? 2 : 3;

    const finalWake = shift("08:00", r.int(-30, 25));
    const outOfBed = shift(finalWake, r.int(0, 25));

    const base = {
      date,
      mode: "full" as const,
      inBed,
      lightsOut,
      solMin: sol,
      awakenings,
      wasoMin: waso,
      finalWake,
      outOfBed,
      quality: 3,
      habits,
      sleepAid,
    };
    const m = nightMetrics(base);
    const quality = m.sePct < 70 ? 1 : m.sePct < 80 ? 2 : m.sePct < 88 ? 3 : 4;

    // Watch counts lying still as sleep: big overestimate on bad nights.
    const watchOver = m.sePct < 80 ? r.int(55, 105) : r.int(0, 30);
    const watchTstMin = r.chance(0.08) ? null : m.tstMin + watchOver;
    const mismatch = watchTstMin != null && Math.abs(watchTstMin - m.tstMin) >= WATCH_MISMATCH_MIN;
    const watchAnswer = mismatch ? r.pick(["lying_awake", "lying_awake", "lying_awake", "not_sure", "took_off"] as const) : null;

    const wokeReason: WokeReason | null = awakenings
      ? r.pick(["worry", "worry", "noise", "bathroom", "phone", "not_sure"] as const)
      : null;

    let note: string | null = null;
    let quote: string | null = null;
    if (i % 11 === 5 && noteIdx < MAYA_NOTES.length) {
      ({ text: note, quote } = MAYA_NOTES[noteIdx++]);
    }

    nights.push(
      NightSchema.parse({
        ...base,
        quality,
        wokeReason,
        note,
        quote,
        dayNote: MAYA_DAY_NOTES[i] ?? null,
        lateEntry: i > 3 && r.chance(0.08),
        watchTstMin,
        watchAnswer,
      }),
    );
  }
  return nights;
}

/** A lighter, generic dataset for the extra students in the provider list. */
function lightNights(today: string, seed: number, count: number, baseSol: number, baseWaso: number): Night[] {
  const r = rng(seed);
  const out: Night[] = [];
  for (let i = count; i >= 2; i--) {
    if (r.chance(0.2)) continue;
    const inBed = shift("23:45", r.int(-40, 40));
    const sol = round5(baseSol + r.int(-10, 15));
    const waso = round5(baseWaso + r.int(-10, 15));
    out.push(
      NightSchema.parse({
        date: addDays(today, -i),
        inBed,
        lightsOut: shift(inBed, r.int(0, 15)),
        solMin: Math.max(5, sol),
        awakenings: waso === 0 ? 0 : waso < 30 ? 1 : 2,
        wasoMin: waso,
        finalWake: shift("07:30", r.int(-20, 30)),
        outOfBed: shift("07:45", r.int(-10, 30)),
        quality: r.int(2, 4),
        habits: r.chance(0.3) ? ["stress"] : [],
      }),
    );
  }
  return out;
}

export const MAYA_USUAL_DAY: UsualDay = {
  inBed: "00:15",
  lightsOut: "00:30",
  finalWake: "08:00",
  outOfBed: "08:15",
  caffeine: "2-3 coffees or energy drinks, sometimes after 2 pm",
  alcohol: "Rarely, on weekends",
  exercise: "Walks to campus; gym once a week",
  sleepAids: "Melatonin sometimes",
};

export function mayaPatient(today: string): DemoPatient {
  const nights = mayaNights(today);
  return {
    isMain: true,
    name: "Maya Thompson",
    age: 21,
    providerName: PROVIDER_NAME,
    visitDate: addDays(today, 4),
    consentAt: new Date(`${addDays(today, -57)}T09:00:00Z`),
    usualDay: MAYA_USUAL_DAY,
    isiBaseline: [3, 3, 2, 3, 3, 3, 3], // 20: moderate
    isiPrevisit: [2, 2, 1, 2, 2, 3, 2], // 14: subthreshold
    screening: { snoringOrApnea: false, restlessLegs: false, drowsyDriving: false, phq2: [2, 1] }, // PHQ-2 = 3
    discuss:
      "Whether I should keep taking melatonin, and what I can do about lying awake before exams.",
    sharedAt: new Date(`${addDays(today, -1)}T09:30:00Z`),
    watchConnected: true,
    nights,
  };
}

export function extraPatients(today: string): DemoPatient[] {
  const usual: UsualDay = {
    inBed: "23:45",
    lightsOut: "00:00",
    finalWake: "07:30",
    outOfBed: "07:45",
    caffeine: "1 coffee in the morning",
    alcohol: "None",
    exercise: "3 times a week",
    sleepAids: "None",
  };
  return [
    {
      isMain: false,
      name: "Jordan Lee",
      age: 19,
      providerName: PROVIDER_NAME,
      visitDate: addDays(today, 2),
      consentAt: new Date(`${addDays(today, -22)}T09:00:00Z`),
      usualDay: usual,
      isiBaseline: [2, 2, 1, 2, 2, 2, 2],
      isiPrevisit: [2, 1, 1, 2, 1, 2, 1],
      screening: { snoringOrApnea: true, restlessLegs: false, drowsyDriving: false, phq2: [0, 1] },
      discuss: "My roommate says I snore a lot. Is that related?",
      sharedAt: new Date(`${addDays(today, -1)}T08:00:00Z`),
      watchConnected: false,
      nights: lightNights(today, 7, 21, 30, 25),
    },
    {
      isMain: false,
      name: "Priya Patel",
      age: 23,
      providerName: PROVIDER_NAME,
      visitDate: addDays(today, 9),
      consentAt: new Date(`${addDays(today, -15)}T09:00:00Z`),
      usualDay: usual,
      isiBaseline: [2, 3, 2, 2, 2, 3, 2],
      isiPrevisit: null,
      screening: null,
      discuss: null,
      sharedAt: null, // not shared yet: the provider can't open it
      watchConnected: false,
      nights: lightNights(today, 11, 14, 40, 35),
    },
  ];
}

