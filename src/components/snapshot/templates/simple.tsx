// Simple layout (default): one verdict, one table, one chart, and only what needs action.
// Every number comes from core/snapshot.ts and core/snapshot-summary.ts.

import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, MessageCircle, Minus, Pill } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ISI_BAND_LABELS } from "@/core/questionnaires";
import type { Snapshot } from "@/core/snapshot";
import { diaryRows, nightsPerWeek, overallTrend, type DiaryRow, type Trend } from "@/core/snapshot-summary";
import { formatDate } from "@/core/time";
import { fmtMin, fmtPct } from "../viz";
import { medicationChanges, METRICS, SnapshotHeader } from "./parts";

const VERDICT: Record<Trend, string> = {
  better: "Sleep is getting better",
  worse: "Sleep is getting worse",
  same: "Sleep is about the same",
};

const shortBand = (label: string) => label.replace(" clinical insomnia", "").replace(" insomnia", "").toLowerCase();

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("gap-3 py-4 print:break-inside-avoid print:py-2", className)}>
      <CardHeader className="px-5 print:px-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-5 print:px-3">{children}</CardContent>
    </Card>
  );
}

function Change({ row }: { row: DiaryRow }) {
  if (row.better == null)
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="size-3.5" /> same
      </span>
    );
  const Arrow = row.now! < row.before! ? ArrowDown : ArrowUp;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", row.better ? "text-good" : "text-destructive")}>
      <Arrow className="size-3.5" /> {row.better ? "better" : "worse"}
    </span>
  );
}

const CHART_METRIC = { solMed: METRICS.sol, wasoMed: METRICS.waso, tstMed: METRICS.tst, seMed: METRICS.se } as const;

/** The measure that changed most, week by week (8 bars from zero), with its reference line. */
function WeeklyChart({ s }: { s: Snapshot }) {
  const m = CHART_METRIC[s.biggestChange?.metric ?? "tstMed"];
  const values = s.weeks.map((w) => m.get(w));
  const max = Math.max(m.domain[1], ...values.map((v) => v ?? 0));
  const pct = (v: number) => `${(v / max) * 100}%`;
  const labelled = new Set([0, values.length - 1]);
  return (
    <figure className="space-y-2">
      <div className="relative h-36 border-b border-border">
        {m.refMark && (
          <div className="absolute inset-x-0 border-t border-dashed border-muted-foreground/70" style={{ bottom: pct(m.refMark.value) }} />
        )}
        <div className="absolute inset-0 flex items-end gap-2 px-1">
          {values.map((v, i) => (
            <div
              key={i}
              className="group relative flex h-full flex-1 items-end"
              title={`Week ${i + 1} (from ${formatDate(s.weeks[i].from)}): ${v == null ? "no data" : m.fmt(v)}`}
            >
              {v != null && (
                <div className="w-full rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80" style={{ height: pct(v) }} />
              )}
              {labelled.has(i) && v != null && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold tabular-nums"
                  style={{ bottom: `calc(${pct(v)} + 2px)` }}
                >
                  {m.fmt(v)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 px-1 text-center text-[11px] text-muted-foreground tabular-nums">
        {values.map((_, i) => (
          <span key={i} className="flex-1">
            {i + 1}
          </span>
        ))}
      </div>
      <figcaption className="space-y-0.5 text-xs text-muted-foreground">
        <p>Weeks 1 → 8 · typical night each week</p>
        {m.refMark && (
          <p className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-muted-foreground" /> {m.refMark.label}
          </p>
        )}
      </figcaption>
    </figure>
  );
}

export function SimpleView({ s }: { s: Snapshot }) {
  const rows = diaryRows(s);
  const t = overallTrend(rows);
  const { baseline, now } = s.isi;
  const medIssues = medicationChanges(s).filter((m) => m.isNew || (m.weeksAbovePlan ?? 0) > 0);
  const attention = s.flags.length + medIssues.length;
  const notes = s.providerNotes.slice(0, 3);
  const fmt = (r: DiaryRow, v: number | null) => (r.key === "se" ? fmtPct(v) : fmtMin(v));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <SnapshotHeader s={s} />

      {/* 1. The answer in one line */}
      <Card className="gap-1 border-none bg-brand-soft py-5 print:py-3">
        <CardContent className="space-y-1 px-5">
          <p className="font-display text-2xl leading-tight">{VERDICT[t.trend]}</p>
          <p className="text-sm text-muted-foreground">
            {t.better} of {t.total} diary measures improved since the first 4 weeks
            {baseline && now && (
              <>
                {" · "}Insomnia Severity Index{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {baseline.score} → {now.score}
                </span>{" "}
                ({shortBand(ISI_BAND_LABELS[baseline.band])} → {shortBand(ISI_BAND_LABELS[now.band])})
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {/* 2. Needs attention: only items to act on */}
      <Section title={attention ? "Needs attention" : "Nothing urgent"}>
        {attention === 0 ? (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-good" /> No red flags and no medicine concerns.
          </p>
        ) : (
          <ul className="space-y-2">
            {s.flags.map((f) => (
              <li
                key={f.key}
                className={cn(
                  "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
                  f.urgent ? "bg-destructive/10 text-destructive" : "bg-warn text-warn-foreground",
                )}
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-medium">{f.label}.</span> {f.nextStep}.
                </span>
              </li>
            ))}
            {medIssues.map((m) => (
              <li key={m.name} className="flex items-start gap-2 rounded-md bg-warn px-3 py-2 text-sm text-warn-foreground">
                <Pill className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-medium">{m.name}:</span>{" "}
                  {m.isNew
                    ? "new, started by the patient"
                    : `taken more often than planned in ${m.weeksAbovePlan} of ${m.weeks} weeks`}
                  .
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 3. Diary numbers + one chart */}
      <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
        <Section title="Sleep diary">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-0" />
                <TableHead className="text-right">First 4 wk</TableHead>
                <TableHead className="text-right">Last 4 wk</TableHead>
                <TableHead className="pr-0 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="whitespace-normal pl-0">{r.label}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{fmt(r, r.before)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{fmt(r, r.now)}</TableCell>
                  <TableCell className="pr-0 text-right text-xs">
                    <Change row={r} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">Typical night (median) in each period.</p>
        </Section>

        <Section title={`${CHART_METRIC[s.biggestChange?.metric ?? "tstMed"].label}, week by week`}>
          <WeeklyChart s={s} />
        </Section>
      </div>

      {/* 4. Medicines */}
      {s.medications.length > 0 && (
        <Section title="Sleep medicines (nights a week)">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-0" />
                <TableHead className="text-right">First 4 wk</TableHead>
                <TableHead className="text-right">Last 4 wk</TableHead>
                <TableHead className="pr-0">Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.medications.map((m) => (
                <TableRow key={m.name}>
                  <TableCell className="pl-0 font-medium">
                    {m.name}
                    {m.isNew && (
                      <Badge variant="outline" className="ml-2 border-warn-foreground/40 text-warn-foreground">
                        New
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {nightsPerWeek(m.firstPerWeek) ?? "–"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{nightsPerWeek(m.secondPerWeek) ?? "–"}</TableCell>
                  <TableCell className="whitespace-normal pr-0 text-xs text-muted-foreground">
                    {m.startedBy === "provider" ? "Prescribed" : "Self-started"}
                    {m.planText && `, ${m.planText}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {/* 5. In the patient's words */}
      {(s.discuss || notes.length > 0) && (
        <Section title="Patient wants to talk about">
          <div className="space-y-3">
            {s.discuss && (
              <blockquote className="flex gap-2 border-l-4 border-brand pl-3 text-base">“{s.discuss}”</blockquote>
            )}
            {notes.length > 0 && (
              <ul className="space-y-1.5">
                {notes.map((n, i) => (
                  <li key={`${n.date}-${i}`} className="flex items-start gap-2 text-sm">
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>
                      {n.text} <span className="text-xs text-muted-foreground">· {formatDate(n.date)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}

      {/* 6. Possible triggers */}
      {(s.links.length > 0 || s.wakeReason) && (
        <Section title="Worse nights tend to follow">
          <div className="flex flex-wrap gap-1.5">
            {s.links.map((l) => (
              <Badge key={l.habit} variant="secondary" className="text-sm font-normal">
                {l.label}
              </Badge>
            ))}
          </div>
          {s.wakeReason && (
            <p className="mt-2 text-sm text-muted-foreground">
              Most often woken by <span className="font-medium text-foreground">{s.wakeReason.label.toLowerCase()}</span>.
            </p>
          )}
        </Section>
      )}

      <footer className="border-t pt-2 text-[11px] text-muted-foreground">
        From the patient&apos;s own sleep diary, confirmed each morning · linked does not mean caused · not a diagnosis ·
        course prototype, made-up data
      </footer>
    </div>
  );
}
