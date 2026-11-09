// Questionnaire scoring and red-flag rules (SAFE-01 to SAFE-03, SAFE-08).
// Wording rule: "consider" / "worth discussing", never "detects" or "diagnoses".

import { z } from "zod";

// ---- Insomnia Severity Index (ISI): 7 items, each 0-4, total 0-28 ----

export const ISI_ITEMS = [
  { text: "Difficulty falling asleep", scale: "severity" },
  { text: "Difficulty staying asleep", scale: "severity" },
  { text: "Problems waking up too early", scale: "severity" },
  { text: "How satisfied or dissatisfied are you with your current sleep pattern?", scale: "satisfaction" },
  { text: "How noticeable to others is your sleep problem in terms of impairing your quality of life?", scale: "noticeable" },
  { text: "How worried or distressed are you about your current sleep problem?", scale: "worried" },
  { text: "To what extent does your sleep problem interfere with your daily functioning (e.g. energy, concentration, mood)?", scale: "interfere" },
] as const;

export const ISI_SCALES: Record<(typeof ISI_ITEMS)[number]["scale"], string[]> = {
  severity: ["None", "Mild", "Moderate", "Severe", "Very severe"],
  satisfaction: ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very dissatisfied"],
  noticeable: ["Not at all", "A little", "Somewhat", "Much", "Very much"],
  worried: ["Not at all", "A little", "Somewhat", "Much", "Very much"],
  interfere: ["Not at all", "A little", "Somewhat", "Much", "Very much"],
};

export const IsiAnswersSchema = z.array(z.number().int().min(0).max(4)).length(7);
export type IsiAnswers = z.infer<typeof IsiAnswersSchema>;

export type IsiBand = "none" | "subthreshold" | "moderate" | "severe";

export const ISI_BAND_LABELS: Record<IsiBand, string> = {
  none: "No clinically significant insomnia",
  subthreshold: "Subthreshold insomnia",
  moderate: "Moderate clinical insomnia",
  severe: "Severe clinical insomnia",
};

export function isiScore(answers: IsiAnswers): number {
  return IsiAnswersSchema.parse(answers).reduce((a, b) => a + b, 0);
}

export function isiBand(score: number): IsiBand {
  if (score <= 7) return "none";
  if (score <= 14) return "subthreshold";
  if (score <= 21) return "moderate";
  return "severe";
}

// ---- PHQ-2: 2 items, each 0-3, positive at 3 or more ----

export const PHQ2_ITEMS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
] as const;
export const PHQ2_OPTIONS = ["Not at all", "Several days", "More than half the days", "Nearly every day"];
export const PHQ2_POSITIVE = 3;

export const Phq2AnswersSchema = z.array(z.number().int().min(0).max(3)).length(2);
export type Phq2Answers = z.infer<typeof Phq2AnswersSchema>;

export function phq2Score(answers: Phq2Answers): number {
  return Phq2AnswersSchema.parse(answers).reduce((a, b) => a + b, 0);
}

// ---- Safety screening and red flags ----

export const ScreeningSchema = z.object({
  snoringOrApnea: z.boolean(), // loud snoring, or someone noticed you stop breathing
  restlessLegs: z.boolean(), // urge to move legs in the evening that gets better when moving
  drowsyDriving: z.boolean(), // dozed off or nearly dozed off while driving
  phq2: Phq2AnswersSchema,
});
export type Screening = z.infer<typeof ScreeningSchema>;

export const SCREENING_QUESTIONS = {
  snoringOrApnea: "Do you snore loudly, or has anyone noticed you stop breathing during sleep?",
  restlessLegs: "In the evening, do you get an urge to move your legs that feels better when you move?",
  drowsyDriving: "In the past month, have you dozed off or nearly dozed off while driving?",
} as const;

export interface RedFlag {
  key: "apnea" | "rls" | "drowsy_driving" | "mood";
  label: string;
  nextStep: string;
  urgent: boolean;
}

/** Screening items that came back clear, so the provider knows they were asked (PRV-07). */
export function clearScreening(s: Screening): string[] {
  const out: string[] = [];
  if (!s.drowsyDriving) out.push("No drowsy driving reported");
  if (!s.snoringOrApnea) out.push("No loud snoring or stopped breathing reported");
  if (!s.restlessLegs) out.push("No restless legs symptoms reported");
  if (phq2Score(s.phq2) < PHQ2_POSITIVE) out.push(`PHQ-2 negative (${phq2Score(s.phq2)} of 6)`);
  return out;
}

export function redFlags(s: Screening): RedFlag[] {
  const flags: RedFlag[] = [];
  if (s.drowsyDriving) {
    flags.push({
      key: "drowsy_driving",
      label: "Dozing while driving",
      nextStep: "Urgent: discuss driving safety",
      urgent: true,
    });
  }
  if (s.snoringOrApnea) {
    flags.push({
      key: "apnea",
      label: "Loud snoring or stopped breathing reported",
      nextStep: "Consider a sleep apnea assessment",
      urgent: false,
    });
  }
  if (s.restlessLegs) {
    flags.push({
      key: "rls",
      label: "Restless legs symptoms reported",
      nextStep: "Consider a restless legs assessment",
      urgent: false,
    });
  }
  const phq2 = phq2Score(s.phq2);
  if (phq2 >= PHQ2_POSITIVE) {
    flags.push({
      key: "mood",
      label: `PHQ-2 positive (${phq2} of 6)`,
      nextStep: "Consider PHQ-9",
      urgent: false,
    });
  }
  return flags;
}
