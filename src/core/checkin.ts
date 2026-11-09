// Rules used during the morning check-in.

import type { DiaryFields, Night } from "./schema";
import { addDays, formatClock, nightMinutes } from "./time";

// ---- Forgiving streak (CHK-01, CHK-08): "5 of the last 7 days", never resets to zero ----

export interface Streak {
  logged: number;
  window: number;
}

/**
 * Nights logged among the last `window` nights before `today`.
 * Last night is the night of `today − 1` (nights are dated by their evening).
 */
export function forgivingStreak(nightDates: string[], today: string, window = 7): Streak {
  const set = new Set(nightDates);
  let logged = 0;
  for (let i = 1; i <= window; i++) if (set.has(addDays(today, -i))) logged++;
  return { logged, window };
}

/**
 * The last 7 mornings (oldest first, ending today) and whether each one has an entry.
 * The morning of day D reports the night of D − 1.
 */
export function weekMornings(nightDates: string[], today: string) {
  const set = new Set(nightDates);
  const WEEKDAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  return Array.from({ length: 7 }, (_, k) => {
    const morning = addDays(today, k - 6);
    const day = new Date(`${morning}T00:00:00Z`).getUTCDay();
    return { morning, label: WEEKDAY[day], logged: set.has(addDays(morning, -1)), isToday: k === 6 };
  });
}

// ---- Follow-up question (CHK-06): at most one, chosen by rules ----

export type FollowUp = "woke_reason" | "kept_awake" | null;

export const SLOW_ONSET_MIN = 30;

export function followUpQuestion(f: Pick<DiaryFields, "awakenings" | "solMin">): FollowUp {
  if (f.awakenings > 0) return "woke_reason";
  if (f.solMin >= SLOW_ONSET_MIN) return "kept_awake";
  return null;
}

// ---- Rough-night mode (CHK-10): 3 questions, the rest from the usual times ----

export interface UsualTimes {
  inBed: string;
  lightsOut: string;
  finalWake: string;
  outOfBed: string;
}

export interface RoughAnswers {
  solMin: number;
  wasoMin: number;
  quality: number;
}

/** Fills the clock fields from the patient's usual times. Returns the fields and which ones were assumed. */
export function fillRoughNight(a: RoughAnswers, usual: UsualTimes) {
  const fields: DiaryFields = {
    ...usual,
    solMin: a.solMin,
    wasoMin: a.wasoMin,
    awakenings: a.wasoMin > 0 ? 1 : 0,
    quality: a.quality,
  };
  const assumed: (keyof DiaryFields)[] = ["inBed", "lightsOut", "finalWake", "outOfBed", "awakenings"];
  return { fields, assumed };
}

/**
 * Usual times derived from past nights: the median of each clock field, rounded to
 * 15 minutes, and kept in order (in bed <= lights out, final wake <= out of bed).
 */
export function usualTimesFrom(nights: Night[], fallback: UsualTimes): UsualTimes {
  const full = nights.filter((n) => n.mode === "full");
  if (!full.length) return fallback;
  const med = (vals: number[]) => {
    const s = [...vals].sort((a, b) => a - b);
    return Math.round(s[Math.floor(s.length / 2)] / 15) * 15;
  };
  const toClock = (m: number) => formatClock(m + 720); // back from the noon-based timeline
  const inBed = med(full.map((n) => nightMinutes(n.inBed)));
  const lightsOut = Math.max(inBed, med(full.map((n) => nightMinutes(n.lightsOut))));
  const finalWake = Math.max(lightsOut + 60, med(full.map((n) => nightMinutes(n.finalWake))));
  const outOfBed = Math.max(finalWake, med(full.map((n) => nightMinutes(n.outOfBed))));
  return { inBed: toClock(inBed), lightsOut: toClock(lightsOut), finalWake: toClock(finalWake), outOfBed: toClock(outOfBed) };
}

// ---- Late entries (CHK-11): only yesterday's night can be caught up ----

/** The nights a patient may still log on `today`: last night, and the one before it (marked late). */
export function loggableNights(today: string) {
  return { lastNight: addDays(today, -1), lateNight: addDays(today, -2) };
}
