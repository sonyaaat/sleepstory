// Extractor that calls the self-hosted model on the OpenAI-compatible gateway (AI-01).

import OpenAI from "openai";
import { HABITS, SLEEP_AIDS } from "@/core/schema";

export const EXTRACTION_TIMEOUT_MS = 8000; // AI-08

const SYSTEM_PROMPT = `You turn a patient's description of last night into Consensus Sleep Diary fields.
Return ONLY a JSON object with this shape:
{
  "fields": {
    "inBed":      {"value": "HH:MM" | null, "confidence": "high"|"medium"|"low", "assumed": boolean},
    "lightsOut":  {...same, time they tried to fall asleep},
    "solMin":     {"value": minutes to fall asleep (integer) | null, ...},
    "awakenings": {"value": number of times woke up (integer) | null, ...},
    "wasoMin":    {"value": TOTAL minutes awake during the night after first falling asleep (integer) | null, ...},
    "finalWake":  {"value": "HH:MM" | null, ...},
    "outOfBed":   {"value": "HH:MM" | null, ...},
    "quality":    {"value": 1-5 (1 very poor, 5 very good) | null, ...}
  },
  "habits": [keys from: ${HABITS.map((h) => `"${h.key}" (${h.label})`).join(", ")}],
  "sleepAid": one of ${SLEEP_AIDS.map((a) => `"${a.key}"`).join(", ")} or null,
  "ambiguity": null or {"field": field name, "question": short question, "options": [{"label": text, "value": "HH:MM" or minutes}, ...2-3 options]},
  "quote": null or ONE short phrase copied EXACTLY, word for word, from the patient's text that shows how the night felt,
  "notes": up to 3 items [{"fact": "a short note in the patient's own voice, max 8 words", "evidence": "the exact words from the patient's text that say it"}]
}
Rules:
- Times are 24-hour "HH:MM". Bedtimes without am/pm are evening/night (12:30 -> "00:30", 11 -> "23:00"); wake times are morning.
- Use null when something is not mentioned and can't be reasonably derived. Never invent values.
- confidence: "high" if stated explicitly, "medium" if approximate ("around", "about"), "low" if guessed.
- assumed: true when a value is derived from another one (e.g. lightsOut = inBed if only bedtime is given; outOfBed = finalWake if only one wake time is given).
- If a phrase can mean two things (e.g. "woke up around 2": 2 am or 2 hours?), set the field to null and fill "ambiguity".
- Habits refer to the day before the night. Late caffeine means caffeine after 2 pm or an energy drink.
- "notes" are things a primary care provider would want to know that are NOT already covered by the diary fields, the habit list or the sleep aid: for example symptoms (pain, headache, nightmares, snoring), a new or changed medicine, illness, mood, or a big life event. Use [] if there are none. Write "fact" as the patient would jot it down, first person or a short phrase, never "Patient reports…" (e.g. "Bad headaches again", "Started a new allergy pill"). "evidence" must be copied word for word from the text. Never invent facts.
- Never add advice, diagnoses or commentary.`;

export function gatewayConfigured(): boolean {
  return Boolean(process.env.JANUS_API_KEY);
}

export class TruncatedOutputError extends Error {}

/** Returns the parsed JSON from the model. Throws on timeout, network errors or unparsable output. */
export async function gatewayExtract(story: string, signal?: AbortSignal): Promise<unknown> {
  const client = new OpenAI({
    apiKey: process.env.JANUS_API_KEY,
    baseURL: process.env.LLM_BASE_URL ?? "https://llm.intela.cloud/v1",
    maxRetries: 0,
    timeout: EXTRACTION_TIMEOUT_MS,
  });
  const body = {
    model: process.env.LLM_MODEL ?? "qwen3.6-35b-a3b",
    temperature: 0,
    max_tokens: 900,
    response_format: { type: "json_object" as const },
    chat_template_kwargs: { enable_thinking: false },
    messages: [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: story.slice(0, 2000) },
    ],
  };
  const res = await client.chat.completions.create(body as OpenAI.ChatCompletionCreateParamsNonStreaming, { signal });
  const choice = res.choices[0];
  if (choice?.finish_reason === "length") throw new TruncatedOutputError("Model output was cut off");
  const text = choice?.message?.content ?? "";
  // Some models wrap JSON in code fences despite JSON mode.
  const json = text.replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(json);
}
