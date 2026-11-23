// A mock home-screen widget for the demo (CHK-18). In a real app the widget sits on the phone's home
// screen, so the morning check-in starts with one tap. A web prototype can't add one, so the home page
// shows what it looks like.

import Link from "next/link";
import { Check, Flame, Mic } from "lucide-react";
import { MoonMark } from "@/components/brand";
import { cn } from "@/lib/utils";

export function HomeWidget({ streakDays, logged }: { streakDays: number; logged: boolean }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <MoonMark className="size-4" /> SleepSnap
        </span>
        <span className="mt-2 block font-display text-xl leading-tight">{logged ? "Last night saved" : "How did you sleep?"}</span>
        <span className="mt-1.5 flex items-center gap-1 text-sm font-semibold">
          <Flame className="size-4 fill-brand text-brand" aria-hidden="true" />
          {streakDays}-day streak
        </span>
      </span>
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
        {logged ? <Check className="size-7" strokeWidth={2.6} /> : <Mic className="size-7" strokeWidth={2.2} />}
      </span>
    </>
  );
  const frame = "flex items-center gap-4 rounded-[28px] bg-deep py-4 pr-4 pl-5 text-foreground shadow-lg ring-1 ring-border/60";
  return (
    <figure>
      {logged ? (
        <div className={frame}>{body}</div>
      ) : (
        <Link
          href="/patient/checkin?mode=voice"
          aria-label="Home-screen widget: start the morning check-in"
          className={cn(frame, "transition-transform active:scale-[0.98]")}
        >
          {body}
        </Link>
      )}
      <figcaption className="mt-1.5 text-center text-[11px] text-muted-foreground">Demo of the home-screen widget</figcaption>
    </figure>
  );
}
