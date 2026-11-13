import { redirect } from "next/navigation";
import { CheckinFlow } from "@/components/checkin/checkin-flow";
import { usualTimesFrom } from "@/core/checkin";
import { planText } from "@/core/medications";
import { mainPatient, requireSession } from "@/db/queries";

export default async function CheckinPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const session = await requireSession();
  const main = await mainPatient(session.id);
  if (!main) redirect("/patient");
  const u = main.patient.usualDay;
  const fallback = {
    inBed: u?.inBed ?? "23:30",
    lightsOut: u?.lightsOut ?? "23:45",
    finalWake: u?.finalWake ?? "07:30",
    outOfBed: u?.outOfBed ?? "07:45",
  };
  // CHK-10: the usual times the patient gave at onboarding; derived from past nights if missing.
  const usual = u ? fallback : usualTimesFrom(main.nights, fallback);
  const initialMode = mode === "type" || mode === "quick" ? mode : "voice";
  return (
    <CheckinFlow
      initialMode={initialMode}
      usual={usual}
      firstName={main.patient.name.split(" ")[0]}
      medicines={main.patient.medications.map((m) => ({ name: m.name, kind: m.kind, planText: planText(m) }))}
    />
  );
}
