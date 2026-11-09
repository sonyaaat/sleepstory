// Validates extractor output field by field (AI-02) and checks quotes (AI-04).
// Anything out of range or malformed is dropped and marked missing, never saved.

import { FIELD_ORDER, type DiaryFieldKey } from "@/core/schema";
import {
  FieldValidators,
  HabitKeySchema,
  RawExtractionSchema,
  SleepAidSchema,
  type ExtractedFields,
  type ExtractionResult,
} from "./types";

function normalizeValue(key: DiaryFieldKey, value: unknown): unknown {
  if (value == null) return null;
  const kind = key === "inBed" || key === "lightsOut" || key === "finalWake" || key === "outOfBed" ? "clock" : "number";
  if (kind === "clock") {
    if (typeof value !== "string") return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    return m ? `${m[1].padStart(2, "0")}:${m[2]}` : value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return value;
}

const collapse = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

/**
 * Returns the quote exactly as it appears in the story, or null if it doesn't appear
 * word for word. Case, surrounding punctuation and whitespace differences are tolerated.
 */
export function verifyQuote(quote: string | null | undefined, story: string): string | null {
  if (!quote) return null;
  const q = collapse(quote).trim().replace(/^["'\s]+|["'\s.]+$/g, "").replace(/\s+/g, " ");
  if (q.length < 8) return null;
  const s = collapse(story);
  // Build a regex where any whitespace in the quote matches any whitespace in the story.
  const pattern = q
    .split(" ")
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const m = new RegExp(pattern, "i").exec(s);
  return m ? story.slice(m.index, m.index + m[0].length) : null;
}

/** Turns unknown model output into a safe ExtractionResult. Throws if the shape is unusable. */
export function validateExtraction(raw: unknown, story: string, ms: number): ExtractionResult {
  const parsed = RawExtractionSchema.parse(raw);
  const fields: ExtractedFields = {};
  const missing: DiaryFieldKey[] = [];

  for (const key of FIELD_ORDER) {
    const f = parsed.fields[key];
    const value = normalizeValue(key, f?.value);
    const ok = f && value != null && FieldValidators[key].safeParse(value).success;
    if (ok) {
      (fields as Record<string, unknown>)[key] = { value, confidence: f.confidence, assumed: f.assumed };
    } else {
      missing.push(key);
    }
  }

  const habits = [...new Set(parsed.habits.filter((h) => HabitKeySchema.safeParse(h).success))] as ExtractionResult["habits"];
  const aid = SleepAidSchema.safeParse(parsed.sleepAid);
  const amb = parsed.ambiguity;
  const ambiguity =
    amb && (FIELD_ORDER as string[]).includes(amb.field) ? { ...amb, field: amb.field as DiaryFieldKey } : null;

  const notes = parsed.notes
    .map((n) => ({ fact: n.fact.trim().slice(0, 160), evidence: verifyQuote(n.evidence, story) }))
    .filter((n): n is { fact: string; evidence: string } => n.fact.length > 2 && n.evidence !== null)
    .slice(0, 3);

  return {
    mode: "ai",
    notes,
    fields,
    missing,
    habits,
    sleepAid: aid.success ? aid.data : null,
    ambiguity,
    quote: verifyQuote(parsed.quote, story),
    ms,
  };
}
