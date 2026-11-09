import { CheckinFlow } from "@/components/checkin/checkin-flow";
import { usualTimesFrom } from "@/core/checkin";
import { mainPatient, requireSession } from "@/db/queries";
import { redirect } from "next/navigation";

export default async function CheckinPage() {
  const session = await requireSession();
  const main = await mainPatient(session.id);
  if (!main) redirect("/patient");
  const u = main.patient.usualDay;
  const fallback = { inBed: u?.inBed ?? "23:30", lightsOut: u?.lightsOut ?? "23:45", finalWake: u?.finalWake ?? "07:30", outOfBed: u?.outOfBed ?? "07:45" };
  // CHK-10: the usual times the patient gave at onboarding; derived from past nights if missing.
  const usual = u ? fallback : usualTimesFrom(main.nights, fallback);
  const usualDayText = u ? `${u.caffeine.toLowerCase()}; alcohol: ${u.alcohol.toLowerCase()}` : null;
  return <CheckinFlow usual={usual} usualDayText={usualDayText} />;
}
