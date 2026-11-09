// The first Snapshot layout, kept for comparison with the new ones.

import { AlertTriangle, CheckCircle2, Quote, Watch } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeChart } from "../se-chart";
import { ISI_BAND_LABELS } from "@/core/questionnaires";
import { SLEEP_AIDS } from "@/core/schema";
import type { Snapshot } from "@/core/snapshot";
import type { PeriodStats } from "@/core/metrics";
import { formatDate, formatDateLong, formatDuration } from "@/core/time";

const min = (v: number | null) => (v == null ? "–" : formatDuration(v));
const pct = (v: number | null) => (v == null ? "–" : `${v.toFixed(0)}%`);
const num = (v: number | null, d = 1) => (v == null ? "–" : v.toFixed(d).replace(/\.0$/, ""));

const ROWS: { label: string; get: (p: PeriodStats) => number | null; fmt: (v: number | null) => string; lowerIsBetter: boolean }[] = [
  { label: "Time to fall asleep", get: (p) => p.solMed, fmt: min, lowerIsBetter: true },
  { label: "Awake during the night", get: (p) => p.wasoMed, fmt: min, lowerIsBetter: true },
  { label: "Total sleep", get: (p) => p.tstMed, fmt: min, lowerIsBetter: false },
  { label: "Time in bed", get: (p) => p.tibMed, fmt: min, lowerIsBetter: false },
  { label: "Sleep efficiency", get: (p) => p.seMed, fmt: pct, lowerIsBetter: false },
  { label: "Awakenings", get: (p) => p.awakeningsMed, fmt: (v) => num(v), lowerIsBetter: true },
  { label: "Poor nights per week", get: (p) => p.poorPerWeek, fmt: (v) => num(v), lowerIsBetter: true },
];

export function OriginalView({ s }: { s: Snapshot }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 print:gap-2">
      <Header s={s} />
      <Headline s={s} />

      <div className="grid gap-4 md:grid-cols-5 print:grid-cols-5 print:gap-2">
        <div className="flex flex-col gap-4 md:col-span-3 print:col-span-3 print:gap-2">
          <MetricsTable s={s} />
          <Card className="print:break-inside-avoid print:py-2">
            <CardHeader className="print:px-3">
              <CardTitle className="text-sm">Sleep efficiency, night by night</CardTitle>
            </CardHeader>
            <CardContent className="print:px-3">
              <SeChart data={s.series} />
            </CardContent>
          </Card>
          <SleepAids s={s} />
        </div>
        <div className="flex flex-col gap-4 md:col-span-2 print:col-span-2 print:gap-2">
          <Flags s={s} />
          <Linked s={s} />
          <WatchCard s={s} />
          <Words s={s} />
        </div>
      </div>

      <footer className="border-t pt-3 text-xs text-muted-foreground">
        Method: patient-reported Consensus Sleep Diary entries, confirmed by the patient; values are medians. Watch data
        from a consumer device, which tends to overestimate sleep in insomnia. Associations are not causes. This summary
        is not a diagnosis. Generated {formatDateLong(s.generatedOn)} by SleepStory (course prototype, made-up data).
      </footer>
    </div>
  );
}

function Header({ s }: { s: Snapshot }) {
  const c = s.completeness;
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b pb-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sleep Snapshot</p>
        <h1 className="text-2xl font-semibold tracking-tight print:text-xl">
          {s.patient.name}, {s.patient.age}
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(s.from)} – {formatDate(s.to)} · {c.logged} of {c.days} nights logged
          {c.late > 0 && `, ${c.late} late`} · {s.watchSource}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">Visit {formatDateLong(s.patient.visitDate)}</p>
    </div>
  );
}

function Headline({ s }: { s: Snapshot }) {
  const { baseline, now } = s.isi;
  const ch = s.biggestChange;
  const fmt = (metric: string, v: number) => (metric === "seMed" ? `${v.toFixed(0)}%` : formatDuration(v));
  return (
    <div className="grid gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
      <Card className="print:py-2">
        <CardContent className="print:px-3">
          <p className="text-xs text-muted-foreground">Insomnia Severity Index</p>
          <p className="text-2xl font-semibold print:text-lg">
            {baseline?.score ?? "–"} → {now?.score ?? "–"}
            <span className="text-sm font-normal text-muted-foreground"> / 28</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {baseline ? ISI_BAND_LABELS[baseline.band] : "No baseline"} → {now ? ISI_BAND_LABELS[now.band] : "not retaken"}
          </p>
        </CardContent>
      </Card>
      <Card className="print:py-2">
        <CardContent className="print:px-3">
          <p className="text-xs text-muted-foreground">Biggest change (first vs last 4 weeks)</p>
          {ch ? (
            <>
              <p className="text-2xl font-semibold print:text-lg">
                {fmt(ch.metric, ch.from)} → {fmt(ch.metric, ch.to)}
              </p>
              <p className="text-xs text-muted-foreground">
                {ch.label}, {ch.better ? "improved" : "worse"}
              </p>
            </>
          ) : (
            <p className="text-lg font-medium">No large change</p>
          )}
        </CardContent>
      </Card>
      <Card className="print:py-2">
        <CardContent className="print:px-3">
          <p className="text-xs text-muted-foreground">Screening</p>
          <p className="flex items-center gap-2 text-2xl font-semibold print:text-lg">
            {s.flags.length ? (
              <>
                <AlertTriangle className="size-5 text-destructive" /> {s.flags.length} to discuss
              </>
            ) : (
              <>
                <CheckCircle2 className="size-5 text-primary" /> No red flags
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground">Details below</p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricsTable({ s }: { s: Snapshot }) {
  const { first, second } = s.periods;
  return (
    <Card className="print:py-2">
      <CardHeader className="print:px-3">
        <CardTitle className="text-sm">How sleep changed (medians)</CardTitle>
      </CardHeader>
      <CardContent className="print:px-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead className="text-right">
                First 4 weeks<span className="block text-xs font-normal">{first.nightsLogged} nights</span>
              </TableHead>
              <TableHead className="text-right">
                Last 4 weeks<span className="block text-xs font-normal">{second.nightsLogged} nights</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((r) => {
              const a = r.get(first);
              const b = r.get(second);
              const better = a != null && b != null && a !== b && (r.lowerIsBetter ? b < a : b > a);
              return (
                <TableRow key={r.label}>
                  <TableCell className="py-1.5">{r.label}</TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">{r.fmt(a)}</TableCell>
                  <TableCell className={`py-1.5 text-right tabular-nums ${better ? "font-semibold" : ""}`}>
                    {r.fmt(b)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SleepAids({ s }: { s: Snapshot }) {
  const { first, second } = s.periods;
  return (
    <Card className="print:py-2">
      <CardHeader className="print:px-3">
        <CardTitle className="text-sm">Sleep aids (nights per week)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2 text-sm print:px-3">
        {SLEEP_AIDS.map((a) => (
          <div key={a.key}>
            <p className="text-xs text-muted-foreground">{a.label}</p>
            <p className="tabular-nums">
              {num(first.aidPerWeek[a.key])} → <span className="font-medium">{num(second.aidPerWeek[a.key])}</span>
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Flags({ s }: { s: Snapshot }) {
  return (
    <Card className="print:py-2">
      <CardHeader className="print:px-3">
        <CardTitle className="text-sm">Screening and red flags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 print:px-3">
        {s.flags.length === 0 && <p className="text-sm text-muted-foreground">Nothing flagged in the safety questions.</p>}
        {s.flags.map((f) => (
          <Alert key={f.key} variant={f.urgent ? "destructive" : "default"} className="py-2">
            <AlertTriangle />
            <AlertTitle>{f.label}</AlertTitle>
            <AlertDescription>{f.nextStep}</AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}

function Linked({ s }: { s: Snapshot }) {
  return (
    <Card className="print:py-2">
      <CardHeader className="print:px-3">
        <CardTitle className="text-sm">What seems linked to worse nights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm print:px-3">
        {s.links.length === 0 && <p className="text-muted-foreground">Not enough nights yet to compare.</p>}
        {s.links.map((l) => (
          <div key={l.habit} className="flex items-baseline justify-between gap-2">
            <span>
              <span className="font-medium">{l.label}</span>
              <span className="block text-xs text-muted-foreground">
                {l.nightsWith} nights with vs {l.nightsWithout} without
              </span>
            </span>
            <span className="text-right tabular-nums">
              {l.seWith.toFixed(0)}% vs {l.seWithout.toFixed(0)}%
              <span className="block text-xs text-muted-foreground">sleep efficiency</span>
            </span>
          </div>
        ))}
        {s.links.length > 0 && <Badge variant="outline">Linked, not proof</Badge>}
      </CardContent>
    </Card>
  );
}

function WatchCard({ s }: { s: Snapshot }) {
  const w = s.watch;
  if (w.nightsWithWatch === 0) return null;
  const explained = w.answers.lying_awake + w.answers.took_off + w.answers.not_sure;
  return (
    <Card className="print:py-2">
      <CardHeader className="print:px-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Watch className="size-4" /> Watch vs diary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm print:px-3">
        <p>
          Total sleep: watch <span className="font-medium tabular-nums">{min(w.watchTstMed)}</span>, diary{" "}
          <span className="font-medium tabular-nums">{min(w.diaryTstMed)}</span> (medians)
        </p>
        <p className="text-muted-foreground">
          Differed by an hour or more on {w.mismatched} of {w.nightsWithWatch} nights.
        </p>
        {explained > 0 && (
          <p className="text-muted-foreground">
            Patient&apos;s explanation: lying awake but still {w.answers.lying_awake}×, watch off {w.answers.took_off}×,
            not sure {w.answers.not_sure}×.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Words({ s }: { s: Snapshot }) {
  return (
    <Card className="print:py-2">
      <CardHeader className="print:px-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Quote className="size-4" /> In their words
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm print:px-3">
        {s.quotes.map((q) => (
          <blockquote key={q.date} className="border-l-2 pl-3 italic">
            “{q.text}”<span className="block text-xs not-italic text-muted-foreground">{formatDate(q.date)}</span>
          </blockquote>
        ))}
        {s.dayNotes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Other things they noted about their days</p>
            <ul className="space-y-1">
              {s.dayNotes.map((n) => (
                <li key={n.date}>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatDate(n.date)}</span> {n.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        {s.discuss && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Wants to discuss</p>
            <p>{s.discuss}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
