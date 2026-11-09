// Sleep medicines (bare minimum, MED-01 to MED-04).
// The patient's list is entered at registration (pre-filled for demo Maya); each morning they tap
// what they took. Code compares use with the plan. Facts only: never "non-compliant", never dose advice.

import { z } from "zod";
import { SLEEP_AID_KEYS, type Night } from "./schema";
import { addDays } from "./time";

export const MedicationSchema = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(SLEEP_AID_KEYS), // melatonin | otc | prescription
  startedBy: z.enum(["provider", "self"]),
  /** Only for medicines a provider prescribed: what the patient was told, in plain words. */
  plan: z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("as_needed"), maxPerWeek: z.number().int().min(1).max(7) }),
      z.object({ type: z.literal("nightly") }),
    ])
    .nullable(),
});
export type Medication = z.infer<typeof MedicationSchema>;

export const MEDICINE_SAFETY_LINE = "Questions about your medicine? Ask your provider or pharmacist.";

export function planText(m: Pick<Medication, "plan">): string | null {
  if (!m.plan) return null;
  if (m.plan.type === "nightly") return "every night";
  return `as needed, up to ${m.plan.maxPerWeek} night${m.plan.maxPerWeek === 1 ? "" : "s"} a week`;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export interface MedicationUse {
  name: string;
  startedBy: "provider" | "self" | "unknown";
  /** Not on the patient's list: they started something new. */
  isNew: boolean;
  planText: string | null;
  /** Nights per 7 logged nights, first 4 weeks and last 4 weeks. */
  firstPerWeek: number | null;
  secondPerWeek: number | null;
  nights: number;
  /** For "as needed, up to N a week": calendar weeks (of 8) with more nights than the plan. */
  weeksAbovePlan: number | null;
  weeks: number;
  firstUsed: string | null;
}

/**
 * Use of each medicine over the Snapshot period, split into two halves like the diary metrics.
 * Includes every medicine on the patient's list, plus any new one they reported.
 */
export function medicationUse(list: Medication[], nights: Night[], from: string, days = 56): MedicationUse[] {
  const to = addDays(from, days - 1);
  const inPeriod = nights.filter((n) => n.date >= from && n.date <= to);
  const half = addDays(from, Math.floor(days / 2));
  const firstHalf = inPeriod.filter((n) => n.date < half);
  const secondHalf = inPeriod.filter((n) => n.date >= half);
  const perWeek = (ns: Night[], name: string) =>
    ns.length ? (ns.filter((n) => n.medicines.some((m) => same(m, name))).length / ns.length) * 7 : null;

  const reported = [...new Set(inPeriod.flatMap((n) => n.medicines.map((m) => m.trim())))];
  const newNames = reported.filter((r) => !list.some((m) => same(m.name, r)));
  const weeks = Math.floor(days / 7);

  const use = (name: string, med: Medication | undefined): MedicationUse => {
    const used = inPeriod.filter((n) => n.medicines.some((m) => same(m, name))).sort((a, b) => a.date.localeCompare(b.date));
    let weeksAbovePlan: number | null = null;
    if (med?.plan?.type === "as_needed") {
      const max = med.plan.maxPerWeek;
      weeksAbovePlan = Array.from({ length: weeks }, (_, w) => {
        const start = addDays(from, w * 7);
        const end = addDays(start, 6);
        return used.filter((n) => n.date >= start && n.date <= end).length;
      }).filter((count) => count > max).length;
    }
    return {
      name: med?.name ?? name,
      startedBy: med?.startedBy ?? "unknown",
      isNew: !med,
      planText: med ? planText(med) : null,
      firstPerWeek: perWeek(firstHalf, name),
      secondPerWeek: perWeek(secondHalf, name),
      nights: used.length,
      weeksAbovePlan,
      weeks,
      firstUsed: used[0]?.date ?? null,
    };
  };

  return [...list.map((m) => use(m.name, m)), ...newNames.map((n) => use(n, undefined))];
}
