import Link from "next/link";
import { ChevronRight, Lock, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand";
import { daysBetween, formatDateLong } from "@/core/time";
import { patientList, requireSession } from "@/db/queries";
import { PROVIDER_NAME } from "@/db/demo-data";

export default async function ProviderHome() {
  const session = await requireSession();
  const patients = await patientList(session.id);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-6 pt-8 pb-12">
      <Logo />
      <p className="mt-10 text-[15px] text-muted-foreground">{PROVIDER_NAME} · simulated provider account</p>
      <h1 className="mt-1 font-display text-[34px] leading-tight">Upcoming visits</h1>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Each Sleep Snapshot is one page you can read in under a minute. You only see what the patient approved.
      </p>

      <ul className="mt-8 space-y-3">
        {patients.map((p) => {
          const inDays = daysBetween(session.today, p.visitDate);
          const when = inDays === 0 ? "today" : inDays > 0 ? `in ${inDays} day${inDays === 1 ? "" : "s"}` : "past";
          const body = (
            <>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-lg">
                {p.name[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {p.name}
                  <span className="font-normal text-muted-foreground">, {p.age}</span>
                </span>
                <span className="block text-sm text-muted-foreground">
                  Visit {formatDateLong(p.visitDate)} · {when} · {p.nightCount} nights logged
                </span>
              </span>
              {p.sharedAt ? (
                <>
                  <Badge className="hidden bg-brand text-brand-foreground sm:inline-flex">
                    <Moon /> Snapshot shared
                  </Badge>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </>
              ) : (
                <Badge variant="outline" className="shrink-0">
                  <Lock /> Not shared yet
                </Badge>
              )}
            </>
          );
          const cls = "flex items-center gap-4 rounded-3xl bg-card p-4 ring-1 ring-border/60 sm:p-5";
          return (
            <li key={p.id}>
              {p.sharedAt ? (
                <Link
                  href={`/provider/snapshot/${p.id}`}
                  className={`${cls} transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none`}
                >
                  {body}
                </Link>
              ) : (
                <div className={`${cls} opacity-70`} aria-disabled="true">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
