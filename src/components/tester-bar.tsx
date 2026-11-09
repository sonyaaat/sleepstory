import { FlaskConical, RotateCcw, Sunrise, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testerNewTester, testerNextMorning, testerReset } from "@/app/actions";
import { formatDate } from "@/core/time";
import { TesterSwitch } from "./tester-switch";
import { ThemeToggle } from "./theme-toggle";

/** Demo tools, not part of the product (DEMO-04 to DEMO-07). Hidden when printing. */
export function TesterBar({ today }: { today: string }) {
  return (
    <div className="sticky top-0 z-40 border-b border-border/60 bg-deep/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-12 max-w-5xl items-center gap-2 px-3 text-sm">
        <span
          className="hidden items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:flex"
          title="Demo tools for testers, not part of the app"
        >
          <FlaskConical className="size-4" /> Demo
        </span>
        <TesterSwitch />
        <span className="hidden text-xs text-muted-foreground md:inline">Today: {formatDate(today)}</span>
        <div className="ml-auto flex items-center gap-0.5">
          <form action={testerNextMorning}>
            <Button size="sm" variant="ghost" aria-label="Next morning" title="Move the demo date to tomorrow">
              <Sunrise /> <span className="hidden sm:inline">Next morning</span>
            </Button>
          </form>
          <form action={testerReset}>
            <Button size="sm" variant="ghost" aria-label="Reset demo data" title="Restore Maya's original data">
              <RotateCcw /> <span className="hidden sm:inline">Reset</span>
            </Button>
          </form>
          <form action={testerNewTester}>
            <Button size="sm" variant="ghost" aria-label="New tester" title="Start fresh for the next person">
              <UserPlus /> <span className="hidden sm:inline">New tester</span>
            </Button>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
