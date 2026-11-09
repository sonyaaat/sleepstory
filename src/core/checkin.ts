// Rules used during the morning check-in.

import type { DiaryFields, Night } from "./schema";
import { addDays } from "./time";

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

/** Usual times derived from past nights (most common value of each clock field). */
export function usualTimesFrom(nights: Night[], fallback: UsualTimes): UsualTimes {
  const mode = (vals: string[], fb: string) => {
    if (!vals.length) return fb;
    const counts = new Map<string, number>();
    for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  };
  const full = nights.filter((n) => n.mode === "full");
  return {
    inBed: mode(full.map((n) => n.inBed), fallback.inBed),
    lightsOut: mode(full.map((n) => n.lightsOut), fallback.lightsOut),
    finalWake: mode(full.map((n) => n.finalWake), fallback.finalWake),
    outOfBed: mode(full.map((n) => n.outOfBed), fallback.outOfBed),
  };
}

// ---- Late entries (CHK-11): only yesterday's night can be caught up ----

/** The nights a patient may still log on `today`: last night, and the one before it (marked late). */
export function loggableNights(today: string) {
  return { lastNight: addDays(today, -1), lateNight: addDays(today, -2) };
}
