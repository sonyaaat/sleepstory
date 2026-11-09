import Link from "next/link";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
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

      <div className="mt-14 flex flex-col items-center space-y-4 text-center">
        <MoonMark className="size-16" />
        <h1 className="font-display text-[40px] leading-[1.08]">Tell your night. We&apos;ll do the diary.</h1>
        <ul className="space-y-2 pt-1 text-[17px] leading-snug text-muted-foreground">
          <li>
            <strong className="font-semibold text-foreground">1 minute</strong> each morning, by voice or text
          </li>
          <li>
            <strong className="font-semibold text-foreground">1-page summary</strong> for your provider
          </li>
          <li>
            Shared <strong className="font-semibold text-foreground">only when you approve</strong>
          </li>
        </ul>
      </div>

      <div className="mt-10 space-y-3">
        <form action={startAsMaya} className="space-y-3">
          <Button variant="brand" size="xl" name="next" value="onboarding">
            <Sparkles /> Try it as Maya, from sign-up
          </Button>
          <Button variant="outline" size="xl" name="next" value="morning" className="border-2">
            Skip to Maya&apos;s morning
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

      <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
        <Lock className="mr-1 inline size-3.5 align-[-2px]" />
        Course prototype (CS497 / HLTH480). All data is made up. Not a medical device. Please don&apos;t enter real
        health information.
      </p>
    </main>
  );
}
