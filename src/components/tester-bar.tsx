import { FlaskConical, RotateCcw, SunMedium, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testerNewTester, testerNextMorning, testerReset } from "@/app/actions";
import { formatDateLong } from "@/core/time";
import { TesterSwitch } from "./tester-switch";

/** Demo tools, not part of the product (DEMO-04 to DEMO-07). Hidden when printing. */
export function TesterBar({ today }: { today: string }) {
  return (
    <div className="sticky top-0 z-40 border-b bg-muted/80 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <FlaskConical className="size-4" /> Demo
        </span>
        <TesterSwitch />
        <span className="text-muted-foreground">Today: {formatDateLong(today)}</span>
        <div className="ml-auto flex flex-wrap gap-1">
          <form action={testerNextMorning}>
            <Button size="sm" variant="outline">
              <SunMedium /> Next morning
            </Button>
          </form>
          <form action={testerReset}>
            <Button size="sm" variant="ghost">
              <RotateCcw /> Reset
            </Button>
          </form>
          <form action={testerNewTester}>
            <Button size="sm" variant="ghost">
              <UserPlus /> New tester
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
