import Link from "next/link";
import { CalendarDays, CheckCircle2, Lock, Moon, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { forgivingStreak } from "@/core/checkin";
import { addDays, daysBetween, formatDateLong } from "@/core/time";
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
  const streak = forgivingStreak(nights.map((n) => n.date), session.today);
  const daysToVisit = daysBetween(session.today, patient.visitDate);
  const firstName = patient.name.split(" ")[0];

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <div>
        <p className="text-sm text-muted-foreground">{formatDateLong(session.today)}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Good morning, {firstName}</h1>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="size-5 text-primary" /> {logged ? "Last night is logged" : "How did you sleep?"}
          </CardTitle>
          <CardDescription>
            {logged
              ? "Thanks. You can still change it if something's not right."
              : "About a minute. Just tell us in your own words."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" className="h-12 w-full text-base" variant={logged ? "outline" : "default"}>
            <Link href="/patient/checkin">{logged ? "Edit last night" : "Log last night"}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="size-4 text-primary" /> {streak.logged} of the last {streak.window} days
          </CardTitle>
          <CardDescription>Every entry helps, even after a rough night. Missing a day is fine.</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={(streak.logged / streak.window) * 100} aria-label="Days logged this week" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-primary" />
            {daysToVisit > 0 ? `Visit in ${daysToVisit} day${daysToVisit === 1 ? "" : "s"}` : daysToVisit === 0 ? "Visit today" : "Visit done"}
          </CardTitle>
          <CardDescription>
            With {patient.providerName}, your primary care provider · {formatDateLong(patient.visitDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2 text-sm">
          {patient.sharedAt ? (
            <span className="flex items-center gap-2">
              <Send className="size-4 text-muted-foreground" /> Sleep Snapshot shared with your provider
            </span>
          ) : (
            <span className="text-muted-foreground">Not shared yet. You approve every share.</span>
          )}
          {patient.sharedAt && <Badge variant="secondary">Shared</Badge>}
        </CardContent>
      </Card>

      <Button asChild variant="link" className="self-center text-muted-foreground">
        <Link href="/patient/privacy">
          <Lock /> Privacy &amp; your data
        </Link>
      </Button>
    </main>
  );
}
