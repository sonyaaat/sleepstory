import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { ALCOHOL_OPTIONS, CAFFEINE_OPTIONS, EXERCISE_OPTIONS } from "@/core/onboarding";
import { mainPatient, requireSession } from "@/db/queries";

const pick = <T extends string>(options: readonly T[], value: string | undefined, fallback: T): T =>
  (options as readonly string[]).includes(value ?? "") ? (value as T) : fallback;

/** Onboarding for demo Maya: every answer pre-filled from her profile, all editable (ONB-01 to ONB-05). */
export default async function OnboardingPage() {
  const session = await requireSession();
  const main = await mainPatient(session.id);
  if (!main) redirect("/patient");
  const p = main.patient;
  const u = p.usualDay;
  return (
    <OnboardingFlow
      firstName={p.name.split(" ")[0]}
      providerName={p.providerName}
      initial={{
        visitDate: p.visitDate,
        reminderTime: u?.reminderTime ?? "07:30",
        watchConnected: p.watchConnected,
        usual: {
          inBed: u?.inBed ?? "23:30",
          outOfBed: u?.outOfBed ?? "07:45",
          caffeine: pick(CAFFEINE_OPTIONS, u?.caffeine, "Before 2 pm only"),
          alcohol: pick(ALCOHOL_OPTIONS, u?.alcohol, "Rarely"),
          exercise: pick(EXERCISE_OPTIONS, u?.exercise, "1–2 times a week"),
          other: u?.otherHabits ?? [],
        },
        medications: p.medications,
        isi: p.isiBaseline ?? [0, 0, 0, 0, 0, 0, 0],
        screening: p.screening ?? { snoringOrApnea: false, restlessLegs: false, drowsyDriving: false, phq2: [0, 0] },
      }}
    />
  );
}
