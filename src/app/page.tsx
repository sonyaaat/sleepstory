import Link from "next/link";
import { ArrowRight, Lock, Sparkles, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo, MoonMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { currentSession } from "@/db/session";
import { startAsMaya } from "./actions";

export default async function StartPage() {
  const session = await currentSession();
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-8 pb-10">
      <div className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="mt-14 space-y-4">
        <MoonMark className="size-16" />
        <h1 className="font-display text-[40px] leading-[1.08]">Tell your night. We&apos;ll do the diary.</h1>
        <p className="text-[17px] leading-relaxed text-muted-foreground">
          A one-minute morning check-in by voice or text. Before your visit, your primary care provider gets a
          one-page Sleep Snapshot, and only if you approve it.
        </p>
      </div>

      <div className="mt-10 space-y-3">
        <form action={startAsMaya}>
          <Button variant="brand" size="xl">
            <Sparkles /> Try it as Maya
          </Button>
        </form>
        <p className="px-2 text-center text-sm text-muted-foreground">
          Maya is 21, a third-year student who has trouble sleeping. You get your own copy of her 8 weeks of made-up
          data.
        </p>
        {session && (
          <Button asChild variant="ghost" size="xl">
            <Link href="/patient">
              Continue where you left off <ArrowRight />
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-3xl bg-card p-4 opacity-80 ring-1 ring-border/60">
        <UserRound className="size-5 shrink-0 text-muted-foreground" />
        <div className="text-sm">
          <p className="font-semibold">
            Start as myself <Badge variant="secondary" className="ml-1">Coming soon</Badge>
          </p>
          <p className="text-muted-foreground">Onboarding with your own answers, in the next prototype.</p>
        </div>
      </div>

      <p className="mt-auto flex items-start gap-2 pt-10 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        Course prototype (CS497 / HLTH480). All data is made up. Not a medical device. Please don&apos;t enter real
        health information.
      </p>
    </main>
  );
}
