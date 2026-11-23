// Simple layout (default): the one-minute read for a primary care provider.
// Order: the answer, what to act on, how each measure moved week by week, every night at a glance,
// medicines, the patient's own words, then context (what bad nights follow, watch vs diary).
// Every number comes from core/snapshot.ts and core/snapshot-summary.ts.

import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, MessageCircle, Minus, Pill, Watch } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ISI_BAND_LABELS } from "@/core/questionnaires";
import type { Snapshot } from "@/core/snapshot";
import { diaryRows, nightsPerWeek, overallTrend, type DiaryRow, type Trend } from "@/core/snapshot-summary";
import { formatDate } from "@/core/time";
import { NightCalendar, NightCalendarLegend } from "../night-calendar";
import { fmtMin, IsiScale } from "../viz";
import { medicationChanges, METRICS, SnapshotHeader, type MetricDef } from "./parts";

const VERDICT: Record<Trend, string> = {
  better: "Sleep is getting better",
  worse: "Sleep is getting worse",
  same: "Sleep is about the same",
};

const shortBand = (label: string) => label.replace(" clinical insomnia", "").replace(" insomnia", "").toLowerCase();

/** Diary rows in the order a provider asks about them, with the plain label and its metric. */
const ROW_METRIC: Record<DiaryRow["key"], MetricDef> = { sol: METRICS.sol, waso: METRICS.waso, tst: METRICS.tst, se: METRICS.se };
const ROW_LABEL: Record<DiaryRow["key"], string> = {
  sol: "Time to fall asleep",
  waso: "Awake during the night",
  tst: "Total sleep",
  se: "Sleep efficiency",
};

function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-3 py-4 print:break-inside-avoid print:gap-2 print:py-2", className)}>
      <CardHeader className="px-5 print:px-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          {title}
        </CardTitle>
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

/**
 * Eight small bars, one per week, starting at zero. The first four weeks are lighter and the last four
 * darker, matching the "first 4 wk → last 4 wk" numbers beside them. Dashed line = clinical cut-off.
 */
function WeekBars({ values, m, weeks }: { values: (number | null)[]; m: MetricDef; weeks: Snapshot["weeks"] }) {
  const max = Math.max(m.domain[1], ...values.map((v) => v ?? 0));
  const pct = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className="relative h-12 border-b border-border print:h-7" role="img" aria-label={`${m.label}, week by week`}>
      {m.refMark && (
        <div
          className="absolute inset-x-0 border-t border-dashed border-muted-foreground/70"
          style={{ bottom: pct(m.refMark.value) }}
          title={m.refMark.label}
        />
      )}
      <div className="absolute inset-0 flex items-end gap-1">
        {values.map((v, i) => (
          <div
            key={i}
            className="flex h-full flex-1 items-end"
            title={`Week ${i + 1} (from ${formatDate(weeks[i].from)}): ${v == null ? "no data" : m.fmt(v)}`}
          >
            {v != null && (
              <div className={cn("w-full rounded-t-[3px]", i < 4 ? "bg-chart-1/40" : "bg-chart-1")} style={{ height: pct(v) }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Nights a week as seven dots, so "2 → 0" reads at a glance. */
function NightDots({ n, label }: { n: number | null; label: string }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={`${label}: ${n ?? "no data"} nights a week`}>
      <span className="flex gap-0.5">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className={cn("size-2 rounded-full", n != null && i < n ? "bg-chart-1" : "bg-muted ring-1 ring-border")} />
        ))}
      </span>
      <span className="w-3 text-right font-semibold tabular-nums">{n ?? "–"}</span>
    </span>
  );
}

export function SimpleView({ s }: { s: Snapshot }) {
  const rows = diaryRows(s);
  const t = overallTrend(rows);
  const { baseline, now } = s.isi;
  const medIssues = medicationChanges(s).filter((m) => m.isNew || (m.weeksAbovePlan ?? 0) > 0);
  const attention = s.flags.length + medIssues.length;
  const notes = s.providerNotes.slice(0, 3);
  const w = s.watch;
  const showWatch = w.nightsWithWatch > 0 && w.diffMed != null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 print:max-w-none print:gap-1.5 print:[zoom:0.8]">
      <SnapshotHeader s={s} />

      {/* 1. The answer in one line, with the Insomnia Severity Index on its scale */}
      <Card className="gap-1 border-none bg-brand-soft py-5 print:py-2">
        <CardContent className="grid gap-4 px-5 sm:grid-cols-[1fr_16rem] sm:items-center print:grid-cols-[1fr_16rem]">
          <div className="space-y-1">
            <p className="font-display text-2xl leading-tight">{VERDICT[t.trend]}</p>
            <p className="text-sm text-muted-foreground">
              {t.better} of {t.total} diary measures improved, first 4 weeks vs last 4 weeks
            </p>
          </div>
          {baseline && now && (
            <div>
              <p className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                <span>Insomnia Severity Index</span>
                <span>
                  <span className="text-base font-semibold text-foreground tabular-nums">
                    {baseline.score} → {now.score}
                  </span>{" "}
                  / 28
                </span>
              </p>
              <IsiScale baseline={baseline} now={now} />
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {shortBand(ISI_BAND_LABELS[baseline.band])} → {shortBand(ISI_BAND_LABELS[now.band])}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Only items to act on */}
      <Section title={attention ? "Needs attention" : "Nothing urgent"}>
        {attention === 0 ? (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-good" /> No red flags and no medicine concerns.
          </p>
        ) : (
          <ul className="space-y-2 print:space-y-1">
            {s.flags.map((f) => (
              <li
                key={f.key}
                className={cn(
                  "flex items-start gap-2 rounded-md px-3 py-2 text-sm print:py-1",
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
              <li key={m.name} className="flex items-start gap-2 rounded-md bg-warn px-3 py-2 text-sm text-warn-foreground print:py-1">
                <Pill className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-medium">{m.name}:</span>{" "}
                  {m.isNew ? "new, started by the patient" : `taken more often than planned in ${m.weeksAbovePlan} of ${m.weeks} weeks`}.
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 3. Each diary measure: numbers and its 8-week trend side by side */}
      <Section title="Sleep diary, week by week">
        <div className="hidden grid-cols-[minmax(0,1fr)_9rem_minmax(0,1.1fr)] gap-4 pb-1 text-[11px] text-muted-foreground sm:grid print:grid">
          <span />
          <span className="text-right">first 4 wk → last 4 wk</span>
          <span className="flex justify-between">
            <span>week 1</span>
            <span>week 8</span>
          </span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const m = ROW_METRIC[r.key];
            return (
              <li
                key={r.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 first:pt-1 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1.1fr)] print:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1.1fr)] print:gap-y-0 print:py-0.5"
              >
                <span className="text-sm">
                  {ROW_LABEL[r.key]}
                  <span className="block text-xs text-muted-foreground print:hidden">{m.lowerIsBetter ? "lower is better" : "higher is better"}</span>
                </span>
                <span className="text-right text-sm tabular-nums">
                  <span className="text-muted-foreground">{m.fmt(r.before)} →</span>{" "}
                  <span className="font-semibold">{m.fmt(r.now)}</span>
                  <span className="block text-xs">
                    <Change row={r} />
                  </span>
                </span>
                <div className="col-span-2 sm:col-span-1 print:col-span-1">
                  <WeekBars values={s.weeks.map((wk) => m.get(wk))} m={m} weeks={s.weeks} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Typical night (median) each week</span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-[2px] bg-chart-1/40" /> first 4 weeks
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-[2px] bg-chart-1" /> last 4 weeks
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 border-t border-dashed border-muted-foreground" /> clinical cut-off (30 min, 7 h, 85%)
          </span>
        </p>
      </Section>

      {/* 4. Every night at a glance, next to sleep medicines */}
      <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2">
        <Section title="Every night, 8 weeks">
          <NightCalendar days={s.days} size="sm" />
          <div className="mt-3 print:mt-1">
            <NightCalendarLegend />
          </div>
        </Section>

        {s.medications.length > 0 && (
          <Section title="Sleep medicines" icon={Pill}>
            <ul className="space-y-3 print:space-y-1.5">
              {s.medications.map((m) => (
                <li key={m.name} className="space-y-1.5">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{m.name}</span>
                    {m.isNew && (
                      <Badge variant="outline" className="border-warn-foreground/40 text-warn-foreground">
                        New
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {m.startedBy === "provider" ? "Prescribed" : "Self-started"}
                      {m.planText && `, ${m.planText}`}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      first 4 wk <NightDots n={nightsPerWeek(m.firstPerWeek)} label="First 4 weeks" />
                    </span>
                    <span className="flex items-center gap-2">
                      last 4 wk <NightDots n={nightsPerWeek(m.secondPerWeek)} label="Last 4 weeks" />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Dots: nights a week the medicine was taken.</p>
          </Section>
        )}
      </div>

      {/* 5. In the patient's words */}
      {(s.discuss || notes.length > 0) && (
        <Section title="Patient wants to talk about" icon={MessageCircle}>
          <div className="space-y-3">
            {s.discuss && <blockquote className="border-l-4 border-brand pl-3 text-base">“{s.discuss}”</blockquote>}
            {notes.length > 0 && (
              <ul className="space-y-1.5">
                {notes.map((n, i) => (
                  <li key={`${n.date}-${i}`} className="flex items-baseline gap-2 text-sm">
                    <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">{formatDate(n.date)}</span>
                    <span>{n.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}

      {/* 6. Context: what bad nights follow, and how far to trust the watch */}
      {(s.links.length > 0 || s.wakeReason || showWatch) && (
        <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2">
          {(s.links.length > 0 || s.wakeReason) && (
            <Section title="Worse nights tend to follow">
              <ul className="space-y-2 print:space-y-0.5">
                {s.links.map((l) => (
                  <li key={l.habit} className="text-sm">
                    <span className="font-medium">{l.label}</span>{" "}
                    <span className="text-muted-foreground">· {l.nightsWith} nights</span>
                    <span className="block text-xs text-muted-foreground tabular-nums print:ml-1 print:inline">
                      sleep efficiency {Math.round(l.seWith)}% after it vs {Math.round(l.seWithout)}% on other nights
                    </span>
                  </li>
                ))}
              </ul>
              {s.wakeReason && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Most often woken by <span className="font-medium text-foreground">{s.wakeReason.label.toLowerCase()}</span> (
                  {s.wakeReason.count} of {s.wakeReason.nights} nights).
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Linked, not proof of cause.</p>
            </Section>
          )}

          {showWatch && (
            <Section title="Watch vs diary" icon={Watch}>
              <p className="text-sm">
                The watch shows{" "}
                <span className="font-semibold tabular-nums">
                  {fmtMin(Math.abs(w.diffMed!))} {w.diffMed! >= 0 ? "more" : "less"}
                </span>{" "}
                sleep than the diary on a typical night.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>
                  {w.mismatched} of {w.nightsWithWatch} nights differ by 1 hour or more
                </li>
                {w.answers.lying_awake > 0 && <li>Patient: &ldquo;lying awake but still&rdquo; on {w.answers.lying_awake} nights</li>}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Consumer watches tend to overestimate sleep in insomnia. Sleep times above come from the diary.
              </p>
            </Section>
          )}
        </div>
      )}

      <footer className="border-t pt-2 text-[11px] text-muted-foreground">
        From the patient&apos;s own sleep diary (Consensus Sleep Diary), confirmed each morning · medians · linked does not
        mean caused · not a diagnosis · generated {formatDate(s.generatedOn)} by SleepSnap · course prototype, made-up data
      </footer>
    </div>
  );
}
