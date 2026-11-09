import { z } from "zod";
import { DiaryFieldsSchema, HABIT_KEYS, SLEEP_AID_KEYS, type DiaryFieldKey, type DiaryFields, type HabitKey, type SleepAid } from "@/core/schema";

export type Confidence = "high" | "medium" | "low";

export interface ExtractedField<K extends DiaryFieldKey = DiaryFieldKey> {
  value: DiaryFields[K];
  confidence: Confidence;
  /** True when the value wasn't said but derived (e.g. "tried to sleep" = "got into bed"). */
  assumed: boolean;
}

export type ExtractedFields = { [K in DiaryFieldKey]?: ExtractedField<K> };

export interface Ambiguity {
  field: DiaryFieldKey;
  question: string;
  options: { label: string; value: string | number }[];
}

export interface ExtractionResult {
  /** Which extractor produced the result; the review screen shows it (AI-03). */
  mode: "ai" | "fallback";
  /** Why the fallback was used, if it was. */
  fallbackReason?: "no_key" | "timeout" | "invalid_output" | "error";
  fields: ExtractedFields;
  /** Fields that couldn't be filled; the review screen asks for them. */
  missing: DiaryFieldKey[];
  habits: HabitKey[];
  sleepAid: SleepAid | null;
  ambiguity: Ambiguity | null;
  /** A short verbatim excerpt from the story, or null (AI-04). */
  quote: string | null;
  /**
   * Facts worth telling the provider that the diary questions don't capture (CHK-15).
   * Each one is backed by words that really appear in the story; unsupported facts are dropped.
   */
  notes: { fact: string; evidence: string }[];
  ms: number;
}

/** What we ask the model to return. Lenient on purpose: each field is validated separately. */
export const RawExtractionSchema = z.object({
  fields: z.record(
    z.string(),
    z
      .object({
        value: z.union([z.string(), z.number(), z.null()]),
        confidence: z.enum(["high", "medium", "low"]).catch("low"),
        assumed: z.boolean().catch(false),
      })
      .nullable(),
  ),
  habits: z.array(z.string()).catch([]),
  sleepAid: z.string().nullable().catch(null),
  ambiguity: z
    .object({
      field: z.string(),
      question: z.string(),
      options: z.array(z.object({ label: z.string(), value: z.union([z.string(), z.number()]) })).min(2).max(4),
    })
    .nullable()
    .catch(null),
  quote: z.string().nullable().catch(null),
  notes: z
    .array(z.object({ fact: z.string(), evidence: z.string() }))
    .catch([])
    .default([]),
});
export type RawExtraction = z.infer<typeof RawExtractionSchema>;

export const FieldValidators = DiaryFieldsSchema.shape;
export const HabitKeySchema = z.enum(HABIT_KEYS);
export const SleepAidSchema = z.enum(SLEEP_AID_KEYS);
