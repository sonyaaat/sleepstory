import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintButton, ViewTracker } from "@/components/snapshot/view-tracker";
import { BriefView } from "@/components/snapshot/templates/brief";
import { CalendarView } from "@/components/snapshot/templates/calendar";
import { DashboardView } from "@/components/snapshot/templates/dashboard";
import { OriginalView } from "@/components/snapshot/templates/original";
import { SimpleView } from "@/components/snapshot/templates/simple";
import { VIEWS, ViewSwitcher, type ViewKey } from "@/components/snapshot/templates/parts";
import { buildSnapshot } from "@/core/snapshot";
import { patientWithNights, requireSession } from "@/db/queries";

// Several layouts of the same Snapshot, so the team can pick one (?view=simple|brief|dashboard|calendar|original).
const LAYOUTS = { simple: SimpleView, brief: BriefView, dashboard: DashboardView, calendar: CalendarView, original: OriginalView };

export default async function SnapshotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view: v } = await searchParams;
  const view: ViewKey = VIEWS.some((x) => x.key === v) ? (v as ViewKey) : "simple";
  const session = await requireSession();
  const data = await patientWithNights(session.id, id);
  if (!data || !data.patient.sharedAt) notFound();
  const s = buildSnapshot(data.patient, data.nights, session.today);
  const Layout = LAYOUTS[view];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 print:max-w-none print:gap-2 print:p-0 print:text-[11px]">
      <ViewTracker patientId={id} />
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/provider">
            <ArrowLeft /> Patients
          </Link>
        </Button>
        <ViewSwitcher id={id} view={view} />
        <PrintButton />
      </div>
      <Layout s={s} />
    </main>
  );
}
