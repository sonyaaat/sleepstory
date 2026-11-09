// Layout C: calendar. Every night as one square (pattern, missing nights, sleep aids),
// next to a before -> after strip for each diary measure.

import { MessageCircle, ShieldAlert, Watch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NightCalendar, NightCalendarLegend } from "../night-calendar";
import type { Snapshot } from "@/core/snapshot";
import { ISI_BAND_LABELS } from "@/core/questionnaires";
import { DeltaChip, Dumbbell, DumbbellLegend, fmtMin, IsiScale } from "../viz";
import { FlagList, METRICS, SnapshotFooter, ProviderNotes, SnapshotHeader, WakeReasonLine } from "./parts";

export function CalendarView({ s }: { s: Snapshot }) {
  const { baseline, now } = s.isi;
  const { first, second } = s.periods;
  const rows = [METRICS.se, METRICS.sol, METRICS.waso, METRICS.tst, METRICS.tib, METRICS.awakenings, METRICS.poor];
  const w = s.watch;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
      <SnapshotHeader s={s}>
        <div className="w-full max-w-xs">
          <p className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
            <span>Insomnia Severity Index</span>
            <span>
              <span className="text-base font-semibold text-foreground tabular-nums">
                {baseline?.score ?? "–"} → {now?.score ?? "–"}
              </span>{" "}
              / 28
            </span>
          </p>
          <IsiScale baseline={baseline} now={now} />
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {baseline ? ISI_BAND_LABELS[baseline.band] : "–"} → {now ? ISI_BAND_LABELS[now.band] : "not retaken"}
          </p>
        </div>
      </SnapshotHeader>

      <div className="grid gap-3 md:grid-cols-5 print:grid-cols-5 print:gap-2">
        <Card className="gap-3 py-4 md:col-span-3 print:col-span-3 print:py-2">
          <CardHeader className="print:px-3">
            <CardTitle className="text-sm">Every night, 8 weeks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 print:px-3">
            <NightCalendar days={s.days} weekMedians={s.weeks.map((x) => x.seMed)} />
            <NightCalendarLegend />
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 md:col-span-2 print:col-span-2 print:py-2">
          <CardHeader className="print:px-3">
            <CardTitle className="text-sm">First 4 weeks → last 4 weeks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 print:px-3">
            {rows.map((m) => {
              const a = m.get(first);
              const b = m.get(second);
              return (
                <div key={m.key}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>{m.label}</span>
                    <span className="flex items-baseline gap-2 tabular-nums">
                      <span className="text-xs text-muted-foreground">{m.fmt(a)} →</span>
                      <span className="font-semibold">{m.fmt(b)}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <Dumbbell from={a} to={b} domain={m.domain} lowerIsBetter={m.lowerIsBetter} fmt={m.fmt} refMark={m.refMark} />
                    <DeltaChip from={a} to={b} lowerIsBetter={m.lowerIsBetter} fmt={m.deltaFmt} className="w-24 justify-end" />
                  </div>
                </div>
              );
            })}
            <DumbbellLegend />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3 print:grid-cols-3 print:gap-2">
        <Card className="gap-2 py-4 print:py-2">
          <CardHeader className="print:px-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="size-4 text-muted-foreground" /> Red flags
            </CardTitle>
          </CardHeader>
          <CardContent className="print:px-3">
            <FlagList s={s} />
          </CardContent>
        </Card>
        <Card className="gap-2 py-4 print:py-2">
          <CardHeader className="print:px-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Watch className="size-4 text-muted-foreground" /> Linked & watch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm print:px-3">
            {s.links.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {s.links.map((l) => (
                  <span key={l.habit} className="rounded-full bg-secondary px-2.5 py-0.5" title={`${l.nightsWith} nights with vs ${l.nightsWithout} without`}>
                    {l.label} <span className="text-xs text-muted-foreground">−{l.seDrop.toFixed(0)} pts</span>
                  </span>
                ))}
              </div>
            )}
            {w.nightsWithWatch > 0 && (
              <p className="text-muted-foreground">
                Watch {fmtMin(w.watchTstMed)} vs diary {fmtMin(w.diaryTstMed)} · off 1 h+ on {w.mismatched}/{w.nightsWithWatch} nights
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="gap-2 py-4 print:py-2">
          <CardHeader className="print:px-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="size-4 text-muted-foreground" /> Wants to discuss
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm print:px-3">
            <p>{s.discuss ? `“${s.discuss}”` : <span className="text-muted-foreground">Nothing added.</span>}</p>
            <WakeReasonLine s={s} />
            <ProviderNotes s={s} />
          </CardContent>
        </Card>
      </div>

      <SnapshotFooter s={s} />
    </div>
  );
}
