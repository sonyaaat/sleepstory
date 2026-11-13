import Link from "next/link";
import { CalendarDays, Keyboard, ListChecks, Lock, Mic, Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo, MoonMark, PatientShell, SoftCard, WeekDots } from "@/components/brand";
import { MorningNotification } from "@/components/checkin/morning-notification";
import { dayStreak, weekMornings } from "@/core/checkin";
import { addDays, daysBetween, formatClock12, formatDateLong } from "@/core/time";
import { mainPatient, requireSession } from "@/db/queries";

export default async function PatientHome() {
  const session = await requireSession();
  const main = await mainPatient(session.id);
  if (!main) {
    return <p className="p-8 text-center text-muted-foreground">Onboarding comes in the next prototype.</p>;
  }
  const { patient, nights } = main;
  const lastNight = addDays(session.today, -1);
  const logged = nights.some((n) => n.date === lastNight);
  const week = weekMornings(nights.map((n) => n.date), session.today);
  const daysToVisit = daysBetween(session.today, patient.visitDate);
  const firstName = patient.name.split(" ")[0];
  const streak = dayStreak(nights.map((n) => n.date), session.today);

  return (
    <PatientShell>
      {!logged && (
        <MorningNotification
          firstName={firstName}
          time={formatClock12(patient.usualDay?.reminderTime ?? "07:30")}
          streakDays={streak.days}
        />
      )}
      <Logo />

      {!logged ? (
        <>
          <p className="mt-10 text-[17px] text-muted-foreground">Good morning, {firstName}</p>
          <h1 className="mt-1.5 font-display text-[40px] leading-[1.1]">How did you sleep?</h1>

          <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10">
            <Link
              href="/patient/checkin?mode=voice"
              aria-label="Start talking about your night"
              className="flex size-[132px] items-center justify-center rounded-full bg-brand text-brand-foreground shadow-[0_0_0_14px_var(--card),0_0_0_28px_var(--surface-2)] transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Mic className="size-12" strokeWidth={2.2} />
            </Link>
            <div className="mt-4 text-center">
              <p className="font-semibold">Tap and talk for about 15 seconds</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" size="lg" className="h-14 rounded-2xl text-base">
              <Link href="/patient/checkin?mode=type">
                <Keyboard /> Type it
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 rounded-2xl text-base">
              <Link href="/patient/checkin?mode=quick">
                <ListChecks /> Tap answers
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <MoonMark className="mt-12 size-14" />
          <h1 className="mt-6 font-display text-[36px] leading-[1.1]">Last night is saved, {firstName}.</h1>
          <div className="mt-8 space-y-3">
            <WeekDots week={week} streak={streak.days} />
            <Button asChild variant="ghost" size="lg" className="w-full">
              <Link href="/patient/checkin?mode=type">
                <Pencil /> Change last night&apos;s entry
              </Link>
            </Button>
          </div>
        </>
      )}

      <div className="mt-8 space-y-3">
        {!logged && <WeekDots week={week} streak={streak.days} />}
        {logged && (
          <SoftCard className="flex gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="text-[15px] leading-relaxed">
              <p>
                Visit with your primary care provider{" "}
                <strong>
                  {daysToVisit > 0
                    ? `in ${daysToVisit} day${daysToVisit === 1 ? "" : "s"}`
                    : daysToVisit === 0
                      ? "today"
                      : "done"}
                </strong>
                , {formatDateLong(patient.visitDate)}.
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Send className="size-3.5" />
                {patient.sharedAt
                  ? "You approved sharing your Sleep Snapshot."
                  : "Not shared yet. You approve every share."}
              </p>
            </div>
          </SoftCard>
        )}
        <Button asChild variant="link" className="w-full text-muted-foreground">
          <Link href="/patient/privacy">
            <Lock /> Privacy &amp; your data
          </Link>
        </Button>
      </div>
    </PatientShell>
  );
}
