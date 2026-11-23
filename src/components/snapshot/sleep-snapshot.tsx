// The Sleep Snapshot (PRV-02 to PRV-11): one page a primary care provider can read in about two minutes.
// Top to bottom: the answer, what to act on, a typical night, week by week, medicines and the patient's own
// words, then context (what bad nights follow, watch vs diary). Every number comes from core/snapshot.ts and
// core/snapshot-summary.ts; this file only draws it.

import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, MessageCircle, Minus, Moon, Pill, Watch } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PeriodStats } from "@/core/metrics";
import { ISI_BAND_LABELS, type IsiBand } from "@/core/questionnaires";
import type { Snapshot } from "@/core/snapshot";
import { diaryRows, nightsPerWeek, overallTrend, type DiaryRow, type Trend } from "@/core/snapshot-summary";
import { formatClock, formatClock12, formatDate, formatDateLong, formatDuration } from "@/core/time";

const fmtMin = (v: number | null) => (v == null ? "–" : formatDuration(v));
const fmtPct = (v: number | null) => (v == null ? "–" : `${v.toFixed(0)}%`);
/** Minutes after noon (as in PeriodStats) to "12:30 am". */
const fmtClock = (v: number) => formatClock12(formatClock(v + 720));

const VERDICT: Record<Trend, string> = {
  better: "Sleep is getting better",
  worse: "Sleep is getting worse",
  same: "Sleep is about the same",
};

/** The four diary measures, with the goal line drawn on their weekly bars. */
const MEASURES: Record<
  DiaryRow["key"],
  { label: string; hint?: string; goal: string; get: (p: PeriodStats) => number | null; fmt: (v: number | null) => string; max: number; goalAt: number }
> = {
  sol: { label: "Time to fall asleep", goal: "goal: under 30 min", get: (p) => p.solMed, fmt: fmtMin, max: 90, goalAt: 30 },
  waso: { label: "Awake during the night", goal: "goal: under 30 min", get: (p) => p.wasoMed, fmt: fmtMin, max: 90, goalAt: 30 },
  tst: { label: "Total sleep", goal: "goal: 7 h or more", get: (p) => p.tstMed, fmt: fmtMin, max: 540, goalAt: 420 },
  se: {
    label: "Sleep efficiency",
    hint: "time in bed spent asleep",
    goal: "goal: 85% or more",
    get: (p) => p.seMed,
    fmt: fmtPct,
    max: 100,
    goalAt: 85,
  },
};

function Section({
  title,
  icon: Icon,
  aside,
  children,
  className,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-3 py-4 print:break-inside-avoid print:gap-1.5 print:py-2", className)}>
      <CardHeader className="px-5 print:px-3">
        <CardTitle className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-base">
          <span className="flex items-center gap-2">
            {Icon && <Icon className="size-4 self-center text-muted-foreground" />}
            {title}
          </span>
          {aside && <span className="text-xs font-normal text-muted-foreground">{aside}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 print:px-3">{children}</CardContent>
    </Card>
  );
}

// ---- 1. The answer: overall direction and the Insomnia Severity Index ----

const ISI_BANDS: { band: IsiBand; label: string; from: number; to: number; tone: string }[] = [
  { band: "none", label: "None", from: 0, to: 7, tone: "bg-sev-1" },
  { band: "subthreshold", label: "Subthreshold", from: 8, to: 14, tone: "bg-sev-2" },
  { band: "moderate", label: "Moderate", from: 15, to: 21, tone: "bg-sev-3" },
  { band: "severe", label: "Severe", from: 22, to: 28, tone: "bg-sev-4" },
];
const bandName = (b: IsiBand) => (b === "none" ? "no insomnia" : `${ISI_BANDS.find((x) => x.band === b)!.label.toLowerCase()} insomnia`);
const isiPos = (score: number) => `${((score + 0.5) / 29) * 100}%`;

/** The 0–28 scale in its four bands, with a hollow dot for the start and a solid dot for now. */
function IsiChart({ start, now }: { start: number; now: number }) {
  const close = Math.abs(start - now) < 5;
  return (
    <div className="w-full" role="img" aria-label={`Insomnia Severity Index from ${start} to ${now} out of 28`}>
      <div className="relative h-4 text-[11px] leading-none text-muted-foreground">
        {close ? (
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: isiPos((start + now) / 2) }}>
            start {start} → now {now}
          </span>
        ) : (
          <>
            <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: isiPos(start) }}>
              start
            </span>
            <span className="absolute -translate-x-1/2 font-semibold whitespace-nowrap text-foreground" style={{ left: isiPos(now) }}>
              now
            </span>
          </>
        )}
      </div>
      <div className="relative py-1.5">
        <div className="flex h-3 gap-0.5">
          {ISI_BANDS.map((b) => (
            <div key={b.band} className={cn("rounded-[3px]", b.tone)} style={{ flex: b.to - b.from + 1 }} title={ISI_BAND_LABELS[b.band]} />
          ))}
        </div>
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-card"
          style={{ left: isiPos(start) }}
          title={`Start: ${start}`}
        />
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-card"
          style={{ left: isiPos(now) }}
          title={`Now: ${now}`}
        />
      </div>
      <div className="flex text-[10px] leading-tight text-muted-foreground">
        {ISI_BANDS.map((b) => (
          <span key={b.band} className="min-w-0" style={{ flex: b.to - b.from + 1 }}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Summary({ s }: { s: Snapshot }) {
  const rows = diaryRows(s);
  const t = overallTrend(rows);
  const { baseline, now } = s.isi;
  return (
    <Card className="border-none bg-brand-soft py-5 print:py-2.5">
      <CardContent className="grid gap-5 px-5 sm:grid-cols-[1fr_19rem] sm:items-center print:grid-cols-[1fr_19rem] print:px-3">
        <div className="space-y-1.5">
          <p className="font-display text-2xl leading-tight">{VERDICT[t.trend]}</p>
          <p className="text-sm text-muted-foreground">
            {t.better} of {t.total} sleep diary measures improved from weeks 1–4 to weeks 5–8.
          </p>
        </div>
        {baseline && now && (
          <div className="space-y-1">
            <p className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span>Insomnia Severity Index</span>
              <span>
                <span className="text-base font-semibold text-foreground tabular-nums">
                  {baseline.score} → {now.score}
                </span>{" "}
                of 28
              </span>
            </p>
            <IsiChart start={baseline.score} now={now.score} />
            <p className="text-xs">
              {bandName(baseline.band)} → <span className="font-semibold">{bandName(now.band)}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- 2. What to act on ----

function NeedsAttention({ s }: { s: Snapshot }) {
  const meds = s.medications.filter((m) => m.isNew || (m.weeksAbovePlan ?? 0) > 0);
  const clear = s.clearScreening.map((c) => c.replace(/ reported$/, "").replace(/ symptoms$/, ""));
  const count = s.flags.length + meds.length;
  return (
    <Section title={count ? "Needs attention" : "Nothing urgent"} icon={AlertTriangle}>
      {count === 0 ? (
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
                <span className="font-semibold">{f.label}.</span> {f.nextStep}.
              </span>
            </li>
          ))}
          {meds.map((m) => (
            <li key={m.name} className="flex items-start gap-2 rounded-md bg-warn px-3 py-2 text-sm text-warn-foreground print:py-1">
              <Pill className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-semibold">{m.name}:</span>{" "}
                {m.isNew
                  ? `new, started by the patient${m.firstUsed ? ` on ${formatDate(m.firstUsed)}` : ""}, not on their medicine list`
                  : `taken more often than planned (${m.planText}) in ${m.weeksAbovePlan} of ${m.weeks} weeks`}
                .
              </span>
            </li>
          ))}
        </ul>
      )}
      {clear.length > 0 && (
        <p className="mt-2.5 flex items-start gap-2 text-xs text-muted-foreground print:mt-1">
          <CheckCircle2 className="mt-px size-3.5 shrink-0 text-good" />
          <span>Also asked, all clear: {clear.join(" · ")}</span>
        </p>
      )}
    </Section>
  );
}

// ---- 3. A typical night, then and now ----

interface Segment {
  from: number;
  to: number;
  asleep: boolean;
}

/** In bed → falling asleep → asleep, with the time awake in the middle → awake before getting up. Approximate. */
function nightSegments(p: PeriodStats): Segment[] | null {
  const { inBedMed: a, lightsOutMed: l, solMed: sol, wasoMed: waso, finalWakeMed: e, outOfBedMed: f } = p;
  if (a == null || l == null || sol == null || waso == null || e == null || f == null) return null;
  const b = Math.max(a, l + sol);
  if (e <= b) return null;
  const w = Math.min(waso, (e - b) * 0.8);
  const mid = b + (e - b - w) / 2;
  return [
    { from: a, to: b, asleep: false },
    { from: b, to: mid, asleep: true },
    { from: mid, to: mid + w, asleep: false },
    { from: mid + w, to: e, asleep: true },
    { from: e, to: Math.max(e, f), asleep: false },
  ].filter((x) => x.to - x.from >= 1);
}

function TypicalNight({ s }: { s: Snapshot }) {
  const rows = [
    { label: "Weeks 1–4", p: s.periods.first, now: false },
    { label: "Weeks 5–8", p: s.periods.second, now: true },
  ]
    .map((r) => ({ ...r, seg: nightSegments(r.p) }))
    .filter((r) => r.seg != null);
  if (rows.length === 0) return null;
  const all = rows.flatMap((r) => r.seg!);
  const lo = Math.floor(Math.min(...all.map((x) => x.from)) / 60) * 60;
  const hi = Math.ceil(Math.max(...all.map((x) => x.to)) / 60) * 60;
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += 60) ticks.push(t);
  const step = ticks.length > 8 ? 2 : 1;

  return (
    <Section title="A typical night" icon={Moon} aside="median times from the diary">
      <div className="space-y-3 print:space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[6.5rem_minmax(0,1fr)_8.5rem] print:grid-cols-[6.5rem_minmax(0,1fr)_8.5rem]"
          >
            <div className="text-sm leading-tight">
              <span className={cn(r.now && "font-semibold")}>{r.label}</span>
              <span className="block text-[11px] text-muted-foreground tabular-nums">
                {fmtClock(r.p.inBedMed!)} – {fmtClock(r.p.outOfBedMed!)}
              </span>
            </div>
            <div
              className="relative order-last col-span-2 h-7 overflow-hidden rounded-md bg-muted sm:order-none sm:col-span-1 print:order-none print:col-span-1 print:h-5"
              role="img"
              aria-label={`${r.label}: in bed ${fmtClock(r.p.inBedMed!)} to ${fmtClock(r.p.outOfBedMed!)}, ${fmtMin(r.p.tstMed)} asleep`}
            >
              {r.seg!.map((g, i) => (
                <div
                  key={i}
                  className={cn("absolute inset-y-0", g.asleep ? "bg-chart-1" : "bg-brand")}
                  style={{ left: x(g.from), width: `calc(${x(g.to)} - ${x(g.from)})` }}
                />
              ))}
            </div>
            <p className="text-right text-sm sm:text-left print:text-left">
              <span className="font-semibold tabular-nums">{fmtMin(r.p.tstMed)}</span> asleep
              <span className="block text-[11px] text-muted-foreground tabular-nums">of {fmtMin(r.p.tibMed)} in bed</span>
            </p>
          </div>
        ))}
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-[6.5rem_minmax(0,1fr)_8.5rem] print:grid-cols-[6.5rem_minmax(0,1fr)_8.5rem]">
          <span className="hidden sm:block print:block" />
          <div className="relative h-4 text-[10px] text-muted-foreground">
            {ticks.map((t, i) =>
              i % step === 0 ? (
                <span
                  key={t}
                  className={cn("absolute whitespace-nowrap", i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2")}
                  style={{ left: x(t) }}
                >
                  {fmtClock(t).replace(":00", "")}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground print:mt-1">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-chart-1" /> asleep
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-brand" /> awake in bed (falling asleep, during the night, before getting up)
        </span>
      </p>
    </Section>
  );
}

// ---- 4. Each diary measure, week by week ----

function Change({ row }: { row: DiaryRow }) {
  if (row.better == null)
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="size-3.5" /> about the same
      </span>
    );
  const Arrow = row.now! < row.before! ? ArrowDown : ArrowUp;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", row.better ? "text-good" : "text-destructive")}>
      <Arrow className="size-3.5" /> {row.better ? "better" : "worse"}
    </span>
  );
}

/** Eight bars from zero, one per week; weeks 1–4 lighter, weeks 5–8 darker. Dashed line = the goal. */
function WeekBars({ s, k }: { s: Snapshot; k: DiaryRow["key"] }) {
  const m = MEASURES[k];
  const values = s.weeks.map(m.get);
  const max = Math.max(m.max, ...values.map((v) => v ?? 0));
  const pct = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className="relative h-11 border-b border-border print:h-7" role="img" aria-label={`${m.label}, week by week`}>
      <div className="absolute inset-x-0 border-t border-dashed border-muted-foreground/70" style={{ bottom: pct(m.goalAt) }} />
      <div className="absolute inset-0 flex items-end gap-1">
        {values.map((v, i) => (
          <div key={i} className="flex h-full flex-1 items-end" title={`Week ${i + 1} (from ${formatDate(s.weeks[i].from)}): ${m.fmt(v)}`}>
            {v != null && <div className={cn("w-full rounded-t-[3px]", i < 4 ? "bg-chart-1/40" : "bg-chart-1")} style={{ height: pct(v) }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekByWeek({ s }: { s: Snapshot }) {
  const rows = diaryRows(s);
  const grid = "sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1.1fr)] print:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1.1fr)]";
  return (
    <Section title="Week by week" aside="typical night each week">
      <div className={cn("hidden gap-4 pb-1 text-[11px] text-muted-foreground sm:grid print:grid", grid)}>
        <span />
        <span className="text-right">weeks 1–4 → 5–8</span>
        <span className="flex justify-between">
          <span>week 1</span>
          <span>week 8</span>
        </span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => {
          const m = MEASURES[r.key];
          return (
            <li
              key={r.key}
              className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 first:pt-1 print:gap-y-0 print:py-0.5", grid)}
            >
              <span className="text-sm leading-tight">
                {m.label}
                {m.hint && <span className="text-muted-foreground"> ({m.hint})</span>}
                <span className="block text-xs text-muted-foreground">{m.goal}</span>
              </span>
              <span className="text-right text-sm tabular-nums">
                <span className="text-muted-foreground">{m.fmt(r.before)} →</span> <span className="font-semibold">{m.fmt(r.now)}</span>
                <span className="block text-xs">
                  <Change row={r} />
                </span>
              </span>
              <div className="col-span-2 sm:col-span-1 print:col-span-1">
                <WeekBars s={s} k={r.key} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-chart-1/40" /> weeks 1–4
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-chart-1" /> weeks 5–8
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t border-dashed border-muted-foreground" /> goal
        </span>
      </p>
    </Section>
  );
}

// ---- 5. Medicines and the patient's own words ----

/** Nights a week as seven dots, so "2 → 0" reads at a glance. */
function NightDots({ n, label }: { n: number | null; label: string }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={`${label}: ${n ?? "no data"} nights a week`}>
      <span className="flex gap-0.5">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className={cn("size-2 rounded-full", n != null && i < n ? "bg-chart-1" : "bg-muted ring-1 ring-border")} />
        ))}
      </span>
      <span className="w-3 text-right font-semibold text-foreground tabular-nums">{n ?? "–"}</span>
    </span>
  );
}

function Medicines({ s }: { s: Snapshot }) {
  if (s.medications.length === 0) return null;
  return (
    <Section title="Sleep medicines" icon={Pill} aside="nights a week">
      <ul className="space-y-3 print:space-y-1.5">
        {s.medications.map((m) => (
          <li key={m.name} className="space-y-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-medium">{m.name}</span>
              {m.isNew && (
                <Badge variant="outline" className="border-warn-foreground/40 text-warn-foreground">
                  New
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {m.startedBy === "provider" ? "prescribed" : "self-started"}
                {m.planText && `, ${m.planText}`}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                weeks 1–4 <NightDots n={nightsPerWeek(m.firstPerWeek)} label="Weeks 1–4" />
              </span>
              <span className="flex items-center gap-2">
                weeks 5–8 <NightDots n={nightsPerWeek(m.secondPerWeek)} label="Weeks 5–8" />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function PatientWords({ s }: { s: Snapshot }) {
  const notes = s.providerNotes.slice(0, 3);
  if (!s.discuss && notes.length === 0) return null;
  return (
    <Section title="Patient wants to talk about" icon={MessageCircle}>
      <div className="space-y-3 print:space-y-1.5">
        {s.discuss && <blockquote className="border-l-4 border-brand pl-3 text-[15px] leading-snug">“{s.discuss}”</blockquote>}
        {notes.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Noted in morning check-ins</p>
            <ul className="mt-1 space-y-1">
              {notes.map((n, i) => (
                <li key={`${n.date}-${i}`} className="flex items-baseline gap-2 text-sm">
                  <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">{formatDate(n.date)}</span>
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}

// ---- 6. Context: what bad nights follow, and how far to trust the watch ----

function WorseNights({ s }: { s: Snapshot }) {
  const links = [...s.links].sort((a, b) => b.seDrop - a.seDrop);
  if (links.length === 0 && !s.wakeReason) return null;
  const max = Math.max(10, ...links.map((l) => l.seDrop));
  return (
    <Section title="Worse nights tend to follow">
      {links.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">Sleep efficiency on nights after it vs other nights</p>
          <ul className="mt-2 space-y-2 print:mt-1 print:space-y-1">
            {links.map((l) => (
              <li key={l.habit} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
                <span className="leading-tight">
                  {l.label}
                  <span className="block text-[11px] text-muted-foreground tabular-nums">
                    {l.nightsWith} nights · {Math.round(l.seWith)}% vs {Math.round(l.seWithout)}%
                  </span>
                </span>
                <span className="h-2.5 rounded-full bg-muted" title={`${Math.round(l.seWith)}% after it vs ${Math.round(l.seWithout)}% on other nights`}>
                  <span className="block h-full rounded-full bg-chart-1" style={{ width: `${(l.seDrop / max) * 100}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums">−{Math.round(l.seDrop)} pts</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {s.wakeReason && (
        <p className="mt-3 text-sm print:mt-1.5">
          Most often woken by <span className="font-semibold">{s.wakeReason.label.toLowerCase()}</span>{" "}
          <span className="text-muted-foreground">
            ({s.wakeReason.count} of {s.wakeReason.nights} nights)
          </span>
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Linked, not proof of cause.</p>
    </Section>
  );
}

function WatchVsDiary({ s }: { s: Snapshot }) {
  const w = s.watch;
  if (w.nightsWithWatch === 0 || w.diffMed == null || w.diaryTstMed == null) return null;
  // The watch bar is the diary plus the typical gap, so the bars and the sentence below always agree.
  const watch = w.diaryTstMed + w.diffMed;
  const max = Math.max(480, watch, w.diaryTstMed);
  const bars = [
    { label: "Diary", v: w.diaryTstMed, tone: "bg-chart-1" },
    { label: "Watch", v: watch, tone: "bg-muted-foreground/45" },
  ];
  return (
    <Section title="Watch vs diary" icon={Watch} aside={`total sleep, ${w.nightsWithWatch} nights with both`}>
      <ul className="space-y-1.5">
        {bars.map((b) => (
          <li key={b.label} className="grid grid-cols-[3rem_minmax(0,1fr)_3.75rem] items-center gap-3 text-sm">
            <span>{b.label}</span>
            <span className="h-3 rounded-full bg-muted">
              <span className={cn("block h-full rounded-full", b.tone)} style={{ width: `${(b.v / max) * 100}%` }} />
            </span>
            <span className="text-right font-semibold tabular-nums">{fmtMin(b.v)}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-3 space-y-1 text-sm print:mt-1.5">
        <li>
          The watch shows <span className="font-semibold tabular-nums">{fmtMin(Math.abs(w.diffMed))}</span>{" "}
          {w.diffMed >= 0 ? "more" : "less"} sleep on a typical night; {w.mismatched} of {w.nightsWithWatch} nights differ by 1 h or more.
        </li>
        {w.answers.lying_awake > 0 && (
          <li className="text-muted-foreground">
            Patient: &ldquo;lying awake but still&rdquo; on {w.answers.lying_awake} of those nights.
          </li>
        )}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Consumer watches tend to overestimate sleep in insomnia. Everything else on this page uses the diary.
      </p>
    </Section>
  );
}

// ---- The page ----

export function SleepSnapshot({ s }: { s: Snapshot }) {
  const c = s.completeness;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 print:max-w-none print:gap-1.5 print:[zoom:0.72]">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b pb-3 print:pb-1.5">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Sleep Snapshot</p>
          <h1 className="text-2xl font-semibold tracking-tight print:text-xl">
            {s.patient.name}, {s.patient.age}
          </h1>
          <p className="text-sm text-muted-foreground">
            Visit {formatDateLong(s.patient.visitDate)} · sleep diary {formatDate(s.from)} – {formatDate(s.to)} (8 weeks) ·{" "}
            {c.logged} of {c.days} nights logged
          </p>
        </div>
      </header>

      <Summary s={s} />
      <NeedsAttention s={s} />
      <TypicalNight s={s} />
      <WeekByWeek s={s} />

      <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-1.5">
        <Medicines s={s} />
        <PatientWords s={s} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-1.5">
        <WorseNights s={s} />
        <WatchVsDiary s={s} />
      </div>

      <footer className="border-t pt-2 text-[11px] text-muted-foreground">
        From the patient&apos;s own sleep diary (Consensus Sleep Diary), confirmed each morning · typical = median · linked
        does not mean caused · not a diagnosis · generated {formatDate(s.generatedOn)} by SleepSnap · course prototype,
        made-up data
      </footer>
    </div>
  );
}
