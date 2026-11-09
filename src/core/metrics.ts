// Sleep metrics. Every number on the Snapshot comes from this file (principle 2).
// Formulas follow the Consensus Sleep Diary conventions; see docs/ARCHITECTURE.md.

import type { DiaryFields, Night, SleepAid } from "./schema";
import { SLEEP_AID_KEYS } from "./schema";
import { addDays, daysBetween, nightMinutes } from "./time";

/** A night is "poor" when sleep efficiency is below this percentage. */
export const POOR_SE_THRESHOLD = 85;
/** Watch and diary total sleep differing by this much (min) counts as a mismatch. */
export const WATCH_MISMATCH_MIN = 60;

export interface NightMetrics {
  tibMin: number; // time in bed
  tstMin: number; // total sleep time
  sePct: number; // sleep efficiency
}

export function nightMetrics(f: DiaryFields): NightMetrics {
  const tibMin = nightMinutes(f.outOfBed) - nightMinutes(f.inBed);
  const sleepWindow = nightMinutes(f.finalWake) - nightMinutes(f.lightsOut);
  const tstMin = Math.max(0, sleepWindow - f.solMin - f.wasoMin);
  const sePct = tibMin > 0 ? Math.min(100, (tstMin / tibMin) * 100) : 0;
  return { tibMin, tstMin, sePct };
}

export function isPoorNight(f: DiaryFields): boolean {
  return nightMetrics(f).sePct < POOR_SE_THRESHOLD;
}

/** Problems that make a set of diary fields impossible. Empty array = consistent. */
export function consistencyIssues(f: DiaryFields): string[] {
  const issues: string[] = [];
  const inBed = nightMinutes(f.inBed);
  const lightsOut = nightMinutes(f.lightsOut);
  const finalWake = nightMinutes(f.finalWake);
  const outOfBed = nightMinutes(f.outOfBed);
  if (lightsOut < inBed) issues.push("You tried to sleep before getting into bed.");
  if (finalWake <= lightsOut) issues.push("Your final wake-up is before you tried to sleep.");
  if (outOfBed < finalWake) issues.push("You got out of bed before your final wake-up.");
  if (finalWake > lightsOut && f.solMin + f.wasoMin > finalWake - lightsOut) {
    issues.push("Time to fall asleep plus time awake is longer than the whole night.");
  }
  if (f.awakenings === 0 && f.wasoMin > 0) issues.push("Time awake is set, but no awakenings.");
  return issues;
}

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
  const perWeek = (count: number) => (n ? (count / n) * 7 : null);
  const aidPerWeek = Object.fromEntries(
    SLEEP_AID_KEYS.map((k) => [k, perWeek(list.filter((x) => x.sleepAid === k).length)]),
  ) as Record<SleepAid, number | null>;
  return {
    from,
    to,
    days: daysBetween(from, to) + 1,
    nightsLogged: n,
    solMed: median(list.map((x) => x.solMin)),
    wasoMed: median(list.map((x) => x.wasoMin)),
    tstMed: median(m.map((x) => x.tstMin)),
    tibMed: median(m.map((x) => x.tibMin)),
    seMed: median(m.map((x) => x.sePct)),
    awakeningsMed: median(list.map((x) => x.awakenings)),
    poorPerWeek: perWeek(m.filter((x) => x.sePct < POOR_SE_THRESHOLD).length),
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
}

export function completeness(nights: Night[], from: string, to: string): Completeness {
  const list = inRange(nights, from, to);
  return { days: daysBetween(from, to) + 1, logged: list.length, late: list.filter((n) => n.lateEntry).length };
}

/** Nightly SE series with a trailing 7-night average (over logged nights in the last 7 days). */
export function seSeries(nights: Night[], from: string, to: string) {
  const list = inRange(nights, from, to).sort((a, b) => a.date.localeCompare(b.date));
  return list.map((n) => {
    const windowStart = addDays(n.date, -6);
    const window = list.filter((x) => x.date >= windowStart && x.date <= n.date);
    const avg = window.reduce((s, x) => s + nightMetrics(x).sePct, 0) / window.length;
    return { date: n.date, se: nightMetrics(n).sePct, avg7: avg, sleepAid: n.sleepAid };
  });
}

export function isWatchMismatch(n: Pick<Night, "watchTstMin"> & DiaryFields): boolean {
  if (n.watchTstMin == null) return false;
  return Math.abs(n.watchTstMin - nightMetrics(n).tstMin) >= WATCH_MISMATCH_MIN;
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
  const withWatch = nights.filter((n) => n.watchTstMin != null);
  const answers = { lying_awake: 0, took_off: 0, not_sure: 0 };
  for (const n of withWatch) if (n.watchAnswer) answers[n.watchAnswer]++;
  return {
    nightsWithWatch: withWatch.length,
    watchTstMed: median(withWatch.map((n) => n.watchTstMin!)),
    diaryTstMed: median(withWatch.map((n) => nightMetrics(n).tstMin)),
    diffMed: median(withWatch.map((n) => n.watchTstMin! - nightMetrics(n).tstMin)),
    mismatched: withWatch.filter(isWatchMismatch).length,
    answers,
  };
}
