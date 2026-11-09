// Plain-language summary for the simple Snapshot layout. Pure; built only from core/snapshot.ts output.

import type { PeriodStats } from "./metrics";
import type { Snapshot } from "./snapshot";

export interface DiaryRow {
  key: "sol" | "waso" | "tst" | "se";
  label: string;
  before: number | null;
  now: number | null;
  /** null = no data or a change too small to call. */
  better: boolean | null;
}

const ROWS: { key: DiaryRow["key"]; label: string; get: (p: PeriodStats) => number | null; lowerIsBetter: boolean; minChange: number }[] = [
  { key: "sol", label: "Time to fall asleep", get: (p) => p.solMed, lowerIsBetter: true, minChange: 5 },
  { key: "waso", label: "Awake during the night", get: (p) => p.wasoMed, lowerIsBetter: true, minChange: 5 },
  { key: "tst", label: "Total sleep", get: (p) => p.tstMed, lowerIsBetter: false, minChange: 10 },
  { key: "se", label: "Time in bed spent asleep", get: (p) => p.seMed, lowerIsBetter: false, minChange: 2 },
];

/** First 4 weeks vs last 4 weeks, one row per diary measure. Small changes count as "no change". */
export function diaryRows(s: Snapshot): DiaryRow[] {
  return ROWS.map((r) => {
    const before = r.get(s.periods.first);
    const now = r.get(s.periods.second);
    const better =
      before == null || now == null || Math.abs(now - before) < r.minChange
        ? null
        : r.lowerIsBetter
          ? now < before
          : now > before;
    return { key: r.key, label: r.label, before, now, better };
  });
}

export type Trend = "better" | "worse" | "same";

/** Overall direction: more diary measures better than worse → "better", and the reverse. */
export function overallTrend(rows: DiaryRow[]): { trend: Trend; better: number; worse: number; total: number } {
  const better = rows.filter((r) => r.better === true).length;
  const worse = rows.filter((r) => r.better === false).length;
  const total = rows.filter((r) => r.before != null && r.now != null).length;
  return { trend: better > worse ? "better" : worse > better ? "worse" : "same", better, worse, total };
}

/** Medicine use rounded to whole nights a week, so the page never shows "1.9 nights". */
export const nightsPerWeek = (v: number | null) => (v == null ? null : Math.round(v));
