// Rules used during the morning check-in.

import type { DiaryEntry, DiaryFields, Night } from "./schema";
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

export function followUpQuestion(f: Pick<DiaryEntry, "awakenings" | "solMin">): FollowUp {
  if (f.awakenings != null && f.awakenings > 0) return "woke_reason";
  if (f.solMin != null && f.solMin >= SLOW_ONSET_MIN) return "kept_awake";
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
  const full = nights.filter(
    (n): n is Night & { inBed: string; lightsOut: string; finalWake: string; outOfBed: string } =>
      n.mode === "full" && n.inBed != null && n.lightsOut != null && n.finalWake != null && n.outOfBed != null,
  );
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

// ---- Streaks and small rewards (CHK-17): one missed morning a week doesn't break the streak ----

export const STREAK_MILESTONES = [3, 7, 14, 30, 60] as const;

export interface DayStreak {
  /** Mornings logged in the current streak. */
  days: number;
  /** Missed mornings forgiven inside the streak (at most one in any 7 days). */
  forgiven: number;
  /** The next milestone to reach, or null after the last one. */
  next: number | null;
  /** The milestone reached exactly today, if any. */
  reached: number | null;
}

/**
 * Counts back from last night. A missed night is forgiven if no other night in the
 * 7 days before it (walking back) was missed; a second miss in a week ends the streak.
 */
export function dayStreak(nightDates: string[], today: string, maxDays = 400): DayStreak {
  const set = new Set(nightDates);
  let days = 0;
  let forgiven = 0;
  let lastMiss = -Infinity;
  // Last night not logged yet is still open, not a miss.
  const start = set.has(addDays(today, -1)) ? 1 : 2;
  for (let i = start; i <= maxDays; i++) {
    if (set.has(addDays(today, -i))) {
      days++;
      continue;
    }
    if (i - lastMiss < 7) break;
    lastMiss = i;
    forgiven++;
  }
  // Forgiven misses after the oldest logged night aren't part of the streak.
  if (days === 0) forgiven = 0;
  const next = STREAK_MILESTONES.find((m) => m > days) ?? null;
  const reached = (STREAK_MILESTONES as readonly number[]).includes(days) ? days : null;
  return { days, forgiven: Math.min(forgiven, Math.ceil(days / 7)), next, reached };
}
