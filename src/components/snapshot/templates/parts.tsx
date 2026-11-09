// Pieces shared by the Snapshot layouts (header, footer, red flags, metric definitions).

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Moon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { PeriodStats } from "@/core/metrics";
import type { Snapshot } from "@/core/snapshot";
import { formatDate, formatDateLong } from "@/core/time";
import { fmtMin, fmtNum, fmtPct } from "../viz";

export interface MetricDef {
  key: string;
  label: string;
  get: (p: PeriodStats) => number | null;
  fmt: (v: number | null) => string;
  /** Formats the size of a change, e.g. "6 pts" or "20 min". */
  deltaFmt: (v: number) => string;
  /** null = no better direction (time in bed). */
  lowerIsBetter: boolean | null;
  domain: [number, number];
  refMark?: { value: number; label: string };
}

export const METRICS: Record<"se" | "sol" | "waso" | "tst" | "tib" | "awakenings" | "poor", MetricDef> = {
  se: {
    key: "se",
    label: "Sleep efficiency",
    get: (p) => p.seMed,
    fmt: fmtPct,
    deltaFmt: (v) => `${v.toFixed(0)} pts`,
    lowerIsBetter: false,
    domain: [50, 100],
    refMark: { value: 85, label: "85%: below this counts as a poor night" },
  },
  sol: {
    key: "sol",
    label: "Time to fall asleep",
    get: (p) => p.solMed,
    fmt: fmtMin,
    deltaFmt: (v) => fmtMin(v),
    lowerIsBetter: true,
    domain: [0, 90],
    refMark: { value: 30, label: "30 min: common insomnia cut-off" },
  },
  waso: {
    key: "waso",
    label: "Awake at night",
    get: (p) => p.wasoMed,
    fmt: fmtMin,
    deltaFmt: (v) => fmtMin(v),
    lowerIsBetter: true,
    domain: [0, 90],
    refMark: { value: 30, label: "30 min: common insomnia cut-off" },
  },
  tst: {
    key: "tst",
    label: "Total sleep",
    get: (p) => p.tstMed,
    fmt: fmtMin,
    deltaFmt: (v) => fmtMin(v),
    lowerIsBetter: false,
    domain: [240, 540],
    refMark: { value: 420, label: "7 h: recommended for adults" },
  },
  tib: {
    key: "tib",
    label: "Time in bed",
    get: (p) => p.tibMed,
    fmt: fmtMin,
    deltaFmt: (v) => fmtMin(v),
    lowerIsBetter: null,
    domain: [300, 600],
  },
  awakenings: {
    key: "awakenings",
    label: "Awakenings",
    get: (p) => p.awakeningsMed,
    fmt: (v) => fmtNum(v),
    deltaFmt: (v) => fmtNum(v),
    lowerIsBetter: true,
    domain: [0, 6],
  },
  poor: {
    key: "poor",
    label: "Poor nights / week",
    get: (p) => p.poorPerWeek,
    fmt: (v) => (v == null ? "–" : `${fmtNum(v)} of 7`),
    deltaFmt: (v) => fmtNum(v),
    lowerIsBetter: true,
    domain: [0, 7],
  },
};

/** Where the last 4 weeks start on the chart (the first logged night on or after that date). */
export function splitFor(s: Snapshot) {
  const date = s.series.find((p) => p.date >= s.periods.second.from)?.date ?? s.periods.second.from;
  return { date, firstMed: s.periods.first.seMed, secondMed: s.periods.second.seMed };
}

export function SnapshotHeader({ s, children }: { s: Snapshot; children?: React.ReactNode }) {
  const c = s.completeness;
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b pb-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sleep Snapshot</p>
        <h1 className="text-2xl font-semibold tracking-tight print:text-xl">
          {s.patient.name}, {s.patient.age}
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(s.from)} – {formatDate(s.to)} · {c.logged}/{c.days} nights logged · visit {formatDateLong(s.patient.visitDate)}
        </p>
      </div>
      {children}
    </header>
  );
}

export function SnapshotFooter({ s }: { s: Snapshot }) {
  return (
    <footer className="border-t pt-2 text-[11px] text-muted-foreground">
      Patient-reported sleep diary (Consensus Sleep Diary), confirmed by the patient · medians · consumer watches tend to
      overestimate sleep in insomnia · linked ≠ caused · not a diagnosis · generated {formatDate(s.generatedOn)} (course
      prototype, made-up data)
    </footer>
  );
}

export function FlagList({ s, compact = false }: { s: Snapshot; compact?: boolean }) {
  const clear =
    s.clearScreening.length > 0 ? (
      <p className="text-xs text-muted-foreground">
        <CheckCircle2 className="mr-1 inline size-3.5 text-good" />
        {s.clearScreening.join(" · ")}
      </p>
    ) : null;
  if (s.flags.length === 0) {
    return (
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 text-good" /> No red flags in the safety questions
        </p>
        {clear}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <ul className="space-y-1.5">
        {s.flags.map((f) => (
          <li
            key={f.key}
            className={cn(
              "flex items-start gap-2 rounded-md px-2.5 py-1.5 text-sm",
              f.urgent ? "bg-destructive/10 text-destructive" : "bg-warn text-warn-foreground",
            )}
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-medium">{f.label}</span>
              {compact ? " → " : <br />}
              <span className={compact ? "" : "text-xs"}>{f.nextStep}</span>
            </span>
          </li>
        ))}
      </ul>
      {clear}
    </div>
  );
}

/** "Usually woken by: racing thoughts (14 of 31 nights)". */
export function WakeReasonLine({ s, className }: { s: Snapshot; className?: string }) {
  const w = s.wakeReason;
  if (!w) return null;
  return (
    <p className={cn("flex items-start gap-2 text-sm", className)}>
      <Moon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span>
        Usually woken by <span className="font-medium">{w.label.toLowerCase()}</span>{" "}
        <span className="text-muted-foreground">
          ({w.count} of {w.nights} nights)
        </span>
      </span>
    </p>
  );
}

/** Sleep aids whose use changed by at least one night a week between the periods. */
export function aidChanges(s: Snapshot) {
  const { first, second } = s.periods;
  const LABEL = { melatonin: "Melatonin", otc: "Over-the-counter aid", prescription: "Prescription sleep aid" } as const;
  return (Object.keys(LABEL) as (keyof typeof LABEL)[])
    .map((k) => ({ key: k, label: LABEL[k], from: first.aidPerWeek[k] ?? 0, to: second.aidPerWeek[k] ?? 0 }))
    .filter((a) => a.from > 0 || a.to > 0);
}

export const VIEWS = [
  { key: "brief", label: "A · 30-second brief" },
  { key: "dashboard", label: "B · Dashboard" },
  { key: "calendar", label: "C · Calendar" },
  { key: "original", label: "Original" },
] as const;
export type ViewKey = (typeof VIEWS)[number]["key"];

export function ViewSwitcher({ id, view }: { id: string; view: ViewKey }) {
  return (
    <div className="flex flex-wrap items-center gap-1 print:hidden">
      <span className="mr-1 text-xs text-muted-foreground">Layout</span>
      {VIEWS.map((v) => (
        <Button key={v.key} asChild size="sm" variant={v.key === view ? "default" : "outline"}>
          <Link href={`/provider/snapshot/${id}?view=${v.key}`} scroll={false}>
            {v.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
