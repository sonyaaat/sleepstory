import Link from "next/link";
import { Moon, UserRound, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { currentSession } from "@/db/session";
import { startAsMaya } from "./actions";

export default async function StartPage() {
  const session = await currentSession();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Moon className="size-6" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">SleepStory</h1>
        <p className="text-muted-foreground">
          Tell us about your night in your own words. Your primary care provider gets a one-page summary before your
          visit.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Try as Maya
          </CardTitle>
          <CardDescription>
            Maya is 21, a third-year student with trouble sleeping. You get your own copy of her 8 weeks of made-up
            data, so you can log a night and see it on her Sleep Snapshot.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-2">
          <form action={startAsMaya} className="w-full">
            <Button size="lg" className="w-full">
              Start as Maya
            </Button>
          </form>
          {session && (
            <Button asChild variant="ghost" className="w-full">
              <Link href="/patient">Continue where you left off</Link>
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card className="opacity-70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-4" /> Start as myself <Badge variant="secondary">Coming soon</Badge>
          </CardTitle>
          <CardDescription>Go through onboarding with your own answers. Available in the next prototype.</CardDescription>
        </CardHeader>
      </Card>

      <CardContent className="px-0 text-center text-xs text-muted-foreground">
        Course prototype (CS497 / HLTH480). All data is made up. Not a medical device. Please don&apos;t enter real
        health information.
      </CardContent>
    </main>
  );
}
