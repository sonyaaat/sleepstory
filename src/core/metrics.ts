// Sleep metrics. Every number on the Snapshot comes from this file (principle 2).
// Formulas follow the Consensus Sleep Diary conventions; see docs/ARCHITECTURE.md.

import type { DiaryEntry, Night, SleepAid } from "./schema";
import { SLEEP_AID_KEYS } from "./schema";
import { addDays, daysBetween, nightMinutes } from "./time";

/** A night is "poor" when sleep efficiency is below this percentage. */
export const POOR_SE_THRESHOLD = 85;
/** Watch and diary total sleep differing by this much (min) counts as a mismatch. */
export const WATCH_MISMATCH_MIN = 60;

/** Each value is null when an answer it depends on was "I don't know". */
export interface NightMetrics {
  tibMin: number | null; // time in bed: needs inBed, outOfBed
  tstMin: number | null; // total sleep time: needs lightsOut, finalWake, solMin, wasoMin
  sePct: number | null; // sleep efficiency: needs both
}

const clockOrNull = (t: string | null) => (t == null ? null : nightMinutes(t));

export function nightMetrics(f: DiaryEntry): NightMetrics {
  const inBed = clockOrNull(f.inBed);
  const outOfBed = clockOrNull(f.outOfBed);
  const lightsOut = clockOrNull(f.lightsOut);
  const finalWake = clockOrNull(f.finalWake);
  const tibMin = inBed != null && outOfBed != null ? outOfBed - inBed : null;
  const tstMin =
    lightsOut != null && finalWake != null && f.solMin != null && f.wasoMin != null
      ? Math.max(0, finalWake - lightsOut - f.solMin - f.wasoMin)
      : null;
  const sePct = tibMin != null && tstMin != null ? (tibMin > 0 ? Math.min(100, (tstMin / tibMin) * 100) : 0) : null;
  return { tibMin, tstMin, sePct };
}

export function isPoorNight(f: DiaryEntry): boolean {
  const se = nightMetrics(f).sePct;
  return se != null && se < POOR_SE_THRESHOLD;
}

/** True when the patient answered "I don't know" to at least one question. */
export function isPartial(f: DiaryEntry): boolean {
  return [f.inBed, f.lightsOut, f.solMin, f.awakenings, f.wasoMin, f.finalWake, f.outOfBed].some((v) => v == null);
}

/** Problems that make a set of diary answers impossible. Unknown answers are skipped. */
export function consistencyIssues(f: DiaryEntry): string[] {
  const issues: string[] = [];
  const inBed = clockOrNull(f.inBed);
  const lightsOut = clockOrNull(f.lightsOut);
  const finalWake = clockOrNull(f.finalWake);
  const outOfBed = clockOrNull(f.outOfBed);
  if (inBed != null && lightsOut != null && lightsOut < inBed)
    issues.push("You started trying to sleep before getting into bed.");
  if (lightsOut != null && finalWake != null && finalWake <= lightsOut)
    issues.push("Your wake up time is before the time you got into bed.");
  if (finalWake != null && outOfBed != null && outOfBed < finalWake)
    issues.push("You got out of bed before you woke up for the day.");
  if (
    lightsOut != null &&
    finalWake != null &&
    finalWake > lightsOut &&
    (f.solMin ?? 0) + (f.wasoMin ?? 0) > finalWake - lightsOut
  ) {
    issues.push("Time to fall asleep plus time awake is longer than the whole night.");
  }
  if (f.awakenings === 0 && (f.wasoMin ?? 0) > 0) issues.push("Time awake is set, but no awakenings.");
  return issues;
}

const nums = (xs: (number | null)[]) => xs.filter((x): x is number => x != null);

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface PeriodStats {
  from: string; // first night date (inclusive)
  to: string; // last night date (inclusive)
  days: number;
  nightsLogged: number;
  solMed: number | null;
  wasoMed: number | null;
  tstMed: number | null;
  tibMed: number | null;
  seMed: number | null;
  awakeningsMed: number | null;
  /** Poor nights per 7 logged nights, so missing nights don't look like good ones. */
  poorPerWeek: number | null;
  /** Sleep-aid nights per 7 logged nights, by type. */
  aidPerWeek: Record<SleepAid, number | null>;
}

export function inRange(nights: Night[], from: string, to: string): Night[] {
  return nights.filter((n) => n.date >= from && n.date <= to);
}

export function periodStats(nights: Night[], from: string, to: string): PeriodStats {
  const list = inRange(nights, from, to);
  const m = list.map(nightMetrics);
  const n = list.length;
  const se = nums(m.map((x) => x.sePct));
  const perWeek = (count: number) => (n ? (count / n) * 7 : null);
  const aidPerWeek = Object.fromEntries(
    SLEEP_AID_KEYS.map((k) => [k, perWeek(list.filter((x) => x.sleepAid === k).length)]),
  ) as Record<SleepAid, number | null>;
  return {
    from,
    to,
    days: daysBetween(from, to) + 1,
    nightsLogged: n,
    solMed: median(nums(list.map((x) => x.solMin))),
    wasoMed: median(nums(list.map((x) => x.wasoMin))),
    tstMed: median(nums(m.map((x) => x.tstMin))),
    tibMed: median(nums(m.map((x) => x.tibMin))),
    seMed: median(se),
    awakeningsMed: median(nums(list.map((x) => x.awakenings))),
    // per 7 nights where efficiency could be computed
    poorPerWeek: se.length ? (se.filter((v) => v < POOR_SE_THRESHOLD).length / se.length) * 7 : null,
    aidPerWeek,
  };
}

/**
 * Splits the `days` nights ending at `lastNight` into two equal halves
 * (by default 4 weeks vs 4 weeks) and returns stats for each.
 */
export function comparePeriods(nights: Night[], lastNight: string, days = 56) {
  const half = Math.floor(days / 2);
  const firstFrom = addDays(lastNight, -(days - 1));
  const firstTo = addDays(firstFrom, half - 1);
  const secondFrom = addDays(firstTo, 1);
  return {
    first: periodStats(nights, firstFrom, firstTo),
    second: periodStats(nights, secondFrom, lastNight),
  };
}

export interface Completeness {
  days: number;
  logged: number;
  late: number;
  /** Logged nights with at least one "I don't know" answer. */
  partial: number;
}

export function completeness(nights: Night[], from: string, to: string): Completeness {
  const list = inRange(nights, from, to);
  return {
    days: daysBetween(from, to) + 1,
    logged: list.length,
    late: list.filter((n) => n.lateEntry).length,
    partial: list.filter(isPartial).length,
  };
}

/**
 * Nightly SE series with a trailing 7-night average (over nights in the last 7 days).
 * Nights whose efficiency can't be computed (an "I don't know" answer) are left out.
 */
export function seSeries(nights: Night[], from: string, to: string) {
  const list = inRange(nights, from, to)
    .map((n) => ({ n, se: nightMetrics(n).sePct }))
    .filter((x): x is { n: Night; se: number } => x.se != null)
    .sort((a, b) => a.n.date.localeCompare(b.n.date));
  return list.map(({ n, se }) => {
    const windowStart = addDays(n.date, -6);
    const window = list.filter((x) => x.n.date >= windowStart && x.n.date <= n.date);
    const avg = window.reduce((s, x) => s + x.se, 0) / window.length;
    return { date: n.date, se, avg7: avg, sleepAid: n.sleepAid };
  });
}

export function isWatchMismatch(n: Pick<Night, "watchTstMin"> & DiaryEntry): boolean {
  const tst = nightMetrics(n).tstMin;
  if (n.watchTstMin == null || tst == null) return false;
  return Math.abs(n.watchTstMin - tst) >= WATCH_MISMATCH_MIN;
}

export interface WatchComparison {
  nightsWithWatch: number;
  watchTstMed: number | null;
  diaryTstMed: number | null;
  /** Median of (watch − diary); positive means the watch shows more sleep. */
  diffMed: number | null;
  mismatched: number;
  answers: Record<"lying_awake" | "took_off" | "not_sure", number>;
}

export function watchComparison(nights: Night[]): WatchComparison {
  // Only nights where both the watch and the diary give a total sleep time.
  const withWatch = nights.filter((n) => n.watchTstMin != null && nightMetrics(n).tstMin != null);
  const answers = { lying_awake: 0, took_off: 0, not_sure: 0 };
  for (const n of withWatch) if (n.watchAnswer) answers[n.watchAnswer]++;
  return {
    nightsWithWatch: withWatch.length,
    watchTstMed: median(withWatch.map((n) => n.watchTstMin!)),
    diaryTstMed: median(withWatch.map((n) => nightMetrics(n).tstMin!)),
    diffMed: median(withWatch.map((n) => n.watchTstMin! - nightMetrics(n).tstMin!)),
    mismatched: withWatch.filter(isWatchMismatch).length,
    answers,
  };
}
