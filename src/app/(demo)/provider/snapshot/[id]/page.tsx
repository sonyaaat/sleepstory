import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SleepSnapshot } from "@/components/snapshot/sleep-snapshot";
import { PrintButton, ViewTracker } from "@/components/snapshot/view-tracker";
import { buildSnapshot } from "@/core/snapshot";
import { patientWithNights, requireSession } from "@/db/queries";

export default async function SnapshotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const data = await patientWithNights(session.id, id);
  if (!data || !data.patient.sharedAt) notFound();
  const s = buildSnapshot(data.patient, data.nights, session.today);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 print:max-w-none print:gap-2 print:p-0 print:text-[11px]">
      <ViewTracker patientId={id} />
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/provider">
            <ArrowLeft /> Patients
          </Link>
        </Button>
        <PrintButton />
      </div>
      <SleepSnapshot s={s} />
    </main>
  );
}
