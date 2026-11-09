// Builds the Sleep Snapshot (PRV-02 to PRV-11) from confirmed nights only (AI-05).
// Pure: no database, no AI. Every number on the page comes from here.

import { linkedToBadNights, type HabitLink } from "./habits";
import {
  comparePeriods,
  completeness,
  inRange,
  seSeries,
  watchComparison,
  type Completeness,
  type PeriodStats,
  type WatchComparison,
} from "./metrics";
import { isiBand, isiScore, redFlags, type IsiAnswers, type IsiBand, type RedFlag, type Screening } from "./questionnaires";
import type { Night } from "./schema";
import { addDays } from "./time";

export const SNAPSHOT_DAYS = 56;

export interface SnapshotInput {
  name: string;
  age: number;
  visitDate: string;
  providerName: string;
  isiBaseline: IsiAnswers | null;
  isiPrevisit: IsiAnswers | null;
  screening: Screening | null;
  discuss: string | null;
  watchConnected: boolean;
}

export interface ChangeSummary {
  metric: "solMed" | "wasoMed" | "tstMed" | "seMed";
  label: string;
  from: number;
  to: number;
  better: boolean;
}

export interface Snapshot {
  patient: Pick<SnapshotInput, "name" | "age" | "visitDate" | "providerName">;
  from: string;
  to: string;
  completeness: Completeness;
  watchSource: string;
  isi: { baseline: { score: number; band: IsiBand } | null; now: { score: number; band: IsiBand } | null };
  biggestChange: ChangeSummary | null;
  flags: RedFlag[];
  periods: { first: PeriodStats; second: PeriodStats };
  series: ReturnType<typeof seSeries>;
  links: HabitLink[];
  watch: WatchComparison;
  quotes: { date: string; text: string }[];
  discuss: string | null;
  generatedOn: string;
}

const CHANGE_METRICS: { metric: ChangeSummary["metric"]; label: string; higherIsBetter: boolean }[] = [
  { metric: "solMed", label: "Time to fall asleep", higherIsBetter: false },
  { metric: "wasoMed", label: "Awake during the night", higherIsBetter: false },
  { metric: "tstMed", label: "Total sleep", higherIsBetter: true },
  { metric: "seMed", label: "Sleep efficiency", higherIsBetter: true },
];

/** The metric with the largest relative change between the two periods. */
export function biggestChange(first: PeriodStats, second: PeriodStats): ChangeSummary | null {
  let best: ChangeSummary | null = null;
  let bestRel = 0;
  for (const m of CHANGE_METRICS) {
    const a = first[m.metric];
    const b = second[m.metric];
    if (a == null || b == null || a === 0) continue;
    const rel = Math.abs(b - a) / a;
    if (rel > bestRel) {
      bestRel = rel;
      best = { metric: m.metric, label: m.label, from: a, to: b, better: m.higherIsBetter ? b > a : b < a };
    }
  }
  return bestRel >= 0.05 ? best : null;
}

/** `today` is the simulated date; the Snapshot covers the 8 weeks of nights before it. */
export function buildSnapshot(p: SnapshotInput, nights: Night[], today: string): Snapshot {
  const to = addDays(today, -1);
  const from = addDays(to, -(SNAPSHOT_DAYS - 1));
  const list = inRange(nights, from, to);
  const periods = comparePeriods(list, to, SNAPSHOT_DAYS);
  const score = (a: IsiAnswers | null) => (a ? { score: isiScore(a), band: isiBand(isiScore(a)) } : null);

  return {
    patient: { name: p.name, age: p.age, visitDate: p.visitDate, providerName: p.providerName },
    from,
    to,
    completeness: completeness(list, from, to),
    watchSource: p.watchConnected ? "Consumer watch (simulated in this prototype)" : "No watch connected",
    isi: { baseline: score(p.isiBaseline), now: score(p.isiPrevisit) },
    biggestChange: biggestChange(periods.first, periods.second),
    flags: p.screening ? redFlags(p.screening) : [],
    periods,
    series: seSeries(list, from, to),
    links: linkedToBadNights(list),
    watch: watchComparison(list),
    quotes: list
      .filter((n) => n.quote)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2)
      .map((n) => ({ date: n.date, text: n.quote! })),
    discuss: p.discuss,
    generatedOn: today,
  };
}
