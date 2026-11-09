// Builds the Sleep Snapshot (PRV-02 to PRV-11) from confirmed nights only (AI-05).
// Pure: no database, no AI. Every number on the page comes from here.

import { linkedToBadNights, type HabitLink } from "./habits";
import { medicationUse, type Medication, type MedicationUse } from "./medications";
import {
  comparePeriods,
  completeness,
  inRange,
  nightMetrics,
  periodStats,
  seSeries,
  watchComparison,
  type Completeness,
  type PeriodStats,
  type WatchComparison,
} from "./metrics";
import { clearScreening, isiBand, isiScore, redFlags, type IsiAnswers, type IsiBand, type RedFlag, type Screening } from "./questionnaires";
import { WOKE_REASONS, type HabitKey, type Night, type SleepAid, type WokeReason } from "./schema";
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
  medications: Medication[];
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
  clearScreening: string[];
  /** Most common reason for waking, among nights where the patient said what woke them. */
  wakeReason: { key: WokeReason; label: string; count: number; nights: number } | null;
  periods: { first: PeriodStats; second: PeriodStats };
  series: ReturnType<typeof seSeries>;
  /** One entry per calendar day in the period, oldest first; null fields = not logged. */
  days: SnapshotDay[];
  /** Medians per 7-day week, oldest first (8 weeks). */
  weeks: PeriodStats[];
  links: HabitLink[];
  watch: WatchComparison;
  quotes: { date: string; text: string }[];
  /** Up to 3 recent "anything else different?" notes, newest first (HAB-09). */
  dayNotes: { date: string; text: string }[];
  /** Each medicine on the patient's list, plus new ones they reported (MED-03). */
  medications: MedicationUse[];
  /** Up to 5 recent "worth telling your provider" notes, newest first (CHK-15). */
  providerNotes: { date: string; text: string }[];
  discuss: string | null;
  generatedOn: string;
}

export interface SnapshotDay {
  date: string;
  logged: boolean;
  se: number | null;
  tst: number | null;
  sleepAid: SleepAid | null;
  habits: HabitKey[];
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

export function topWakeReason(nights: Night[]): Snapshot["wakeReason"] {
  const withReasons = nights.filter((n) => n.wokeReasons.some((r) => r !== "not_sure"));
  if (withReasons.length < 5) return null;
  const counts = new Map<WokeReason, number>();
  for (const n of withReasons) for (const r of n.wokeReasons) if (r !== "not_sure") counts.set(r, (counts.get(r) ?? 0) + 1);
  const [key, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { key, label: WOKE_REASONS.find((w) => w.key === key)!.label, count, nights: withReasons.length };
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
    clearScreening: p.screening ? clearScreening(p.screening) : [],
    wakeReason: topWakeReason(list),
    periods,
    series: seSeries(list, from, to),
    days: Array.from({ length: SNAPSHOT_DAYS }, (_, i) => {
      const date = addDays(from, i);
      const n = list.find((x) => x.date === date);
      const m = n ? nightMetrics(n) : null;
      return {
        date,
        logged: !!n,
        se: m?.sePct ?? null,
        tst: m?.tstMin ?? null,
        sleepAid: n?.sleepAid ?? null,
        habits: n?.habits ?? [],
      };
    }),
    weeks: Array.from({ length: SNAPSHOT_DAYS / 7 }, (_, i) =>
      periodStats(list, addDays(from, i * 7), addDays(from, i * 7 + 6)),
    ),
    links: linkedToBadNights(list),
    watch: watchComparison(list),
    quotes: list
      .filter((n) => n.quote)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2)
      .map((n) => ({ date: n.date, text: n.quote! })),
    dayNotes: list
      .filter((n) => n.dayNote)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .map((n) => ({ date: n.date, text: n.dayNote! })),
    medications: medicationUse(p.medications, list, from, SNAPSHOT_DAYS),
    providerNotes: [...list]
      .sort((a, b) => b.date.localeCompare(a.date))
      .flatMap((n) => n.providerNotes.map((text) => ({ date: n.date, text })))
      .slice(0, 5),
    discuss: p.discuss,
    generatedOn: today,
  };
}
