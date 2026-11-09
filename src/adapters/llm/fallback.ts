// Rule-based fallback extractor (AI-03). Used when there's no API key, the model is slow,
// or its output is invalid. Deliberately simple: it handles common phrasings and leaves
// the rest for the patient to fill in on the review screen.

import { detectHabits } from "@/core/habit-detect";
import type { DiaryFieldKey } from "@/core/schema";
import { formatClock } from "@/core/time";
import type { Ambiguity, ExtractedFields, ExtractionResult } from "./types";
import { validateExtraction } from "./validate";

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, once: 1, two: 2, twice: 2, three: 3, thrice: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45, fifty: 50,
};
const NUM = String.raw`(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty-five|forty|fifty)`;

function toNumber(s: string): number {
  const n = Number(s);
  return Number.isNaN(n) ? NUMBER_WORDS[s.toLowerCase()] ?? NaN : n;
}

/** "an hour", "1.5 hours", "45 min", "half an hour", "an hour and a half" -> minutes. */
export function parseDuration(text: string): number | null {
  const t = text.toLowerCase();
  if (/half an hour/.test(t)) return 30;
  let m = new RegExp(String.raw`${NUM}\s*(?:hours?|hrs?|h)\s*(?:and\s*)?(?:(a half)|${NUM}\s*(?:minutes?|mins?|m)\b)?`).exec(t);
  if (m) {
    const h = toNumber(m[1]);
    const extra = m[2] ? 30 : m[3] ? toNumber(m[3]) : 0;
    if (!Number.isNaN(h)) return Math.round(h * 60 + extra);
  }
  m = new RegExp(String.raw`${NUM}\s*(?:minutes?|mins?|m)\b`).exec(t);
  if (m) {
    const n = toNumber(m[1]);
    if (!Number.isNaN(n)) return Math.round(n);
  }
  return null;
}

type ClockRole = "evening" | "morning";

/**
 * "12:30", "11:30 pm", "8", "8:15am", "midnight" -> "HH:MM".
 * Without am/pm, evening times 6-11 are pm and 12 is midnight; morning times 4-11 are am.
 */
export function parseClockPhrase(raw: string, role: ClockRole): string | null {
  const t = raw.toLowerCase().trim();
  if (t === "midnight") return "00:00";
  if (t === "noon") return "12:00";
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/.exec(t);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  const suffix = m[3]?.startsWith("p") ? "pm" : m[3]?.startsWith("a") ? "am" : null;
  if (suffix === "pm" && h < 12) h += 12;
  else if (suffix === "am" && h === 12) h = 0;
  else if (!suffix && h <= 12) {
    if (role === "evening") h = h === 12 ? 0 : h >= 6 ? h + 12 : h;
    else h = h === 12 ? 12 : h <= 3 ? h + 12 : h;
  }
  return formatClock(h * 60 + min);
}

const CLOCK = String.raw`(midnight|noon|\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)`;

function findClock(story: string, triggers: string[], role: ClockRole): { value: string; approx: boolean } | null {
  for (const trig of triggers) {
    const re = new RegExp(String.raw`${trig}[^.,;!?\d]{0,25}?(around|about|at|by|maybe|like|~)?\s*${CLOCK}`, "i");
    const m = re.exec(story);
    if (m) {
      const value = parseClockPhrase(m[2], role);
      if (value) return { value, approx: /around|about|maybe|like|~/i.test(m[1] ?? "") };
    }
  }
  return null;
}

const NOTE_PATTERN =
  /pain|ache|migraine|sick|fever|flu|cough|nause|vomit|medic|pill|prescri|dose|doctor|pharmac|panic|nightmare|snor|stopped breathing|choking|legs|cramp|period|heart|chest|dizz|breath|depress|hopeless|cry|alcohol|weed|cannabis/i;

export function fallbackRaw(story: string) {
  const s = story.replace(/\s+/g, " ");
  const fields: Record<string, { value: string | number; confidence: "high" | "medium" | "low"; assumed: boolean }> = {};
  const put = (key: DiaryFieldKey, value: string | number | null, approx: boolean, assumed = false) => {
    if (value == null || fields[key]) return;
    fields[key] = { value, confidence: assumed ? "low" : approx ? "medium" : "high", assumed };
  };

  const inBed = findClock(s, ["(?:went|got|go|get) (?:in)?to bed", "in bed (?:at|around|by)", "hit the (?:hay|sack)", "bed (?:at|around)"], "evening");
  const lightsOut = findClock(s, ["tried to (?:fall )?sleep", "lights (?:went )?out", "turned off the lights?"], "evening");
  const finalWake = findClock(s, ["woke up (?:for good|finally)", "(?:my )?alarm (?:went off|rang)", "woke up at", "woke at", "awake for good"], "morning");
  const outOfBed = findClock(s, ["got (?:out of bed|up)", "out of bed", "rolled out"], "morning");

  put("inBed", inBed?.value ?? lightsOut?.value ?? null, inBed?.approx ?? false, !inBed && !!lightsOut);
  put("lightsOut", lightsOut?.value ?? inBed?.value ?? null, lightsOut?.approx ?? false, !lightsOut && !!inBed);
  put("finalWake", finalWake?.value ?? outOfBed?.value ?? null, finalWake?.approx ?? false, !finalWake && !!outOfBed);
  put("outOfBed", outOfBed?.value ?? finalWake?.value ?? null, outOfBed?.approx ?? false, !outOfBed && !!finalWake);

  // Time to fall asleep: "took (about) an hour to fall asleep", "fell asleep after 20 min".
  const solMatch =
    /(?:took|taking|needed)\s+(?:me\s+)?(?:about|around|like|maybe|roughly|over)?\s*([^.,;]{1,30}?)\s+to\s+(?:fall\s+)?(?:asleep|sleep|drift off|nod off)/i.exec(s) ??
    /fell asleep (?:after|in)\s+(?:about|around|like)?\s*([^.,;]{1,30})/i.exec(s);
  if (solMatch) put("solMin", parseDuration(solMatch[1]), /about|around|like|maybe|roughly|over/i.test(solMatch[0]));
  if (/fell asleep (?:right away|immediately|quickly|instantly)|out like a light/i.test(s)) put("solMin", 5, true);

  // Awakenings: "woke up twice", "woke up 3 times", "didn't wake up".
  const aw = new RegExp(String.raw`woke (?:up )?(twice|once|thrice)|woke (?:up )?${NUM}\s*times?`, "i").exec(s);
  if (aw) put("awakenings", toNumber(aw[1] ?? aw[2]), false);
  else if (/(?:didn't|did not|never) wake|slept through/i.test(s)) {
    put("awakenings", 0, false);
    put("wasoMin", 0, false);
  }

  // Time awake: "for about 40 minutes", "awake for an hour", "40 min in total".
  const waso =
    /(?:awake|up) for\s+(?:about|around|like|maybe)?\s*([^.,;]{1,25})/i.exec(s) ??
    /woke[^.]{0,40}?\bfor\s+(?:about|around|like|maybe)?\s*([^.,;]{1,25})/i.exec(s) ??
    /([^.,;]{1,20})\s+(?:in total|total) awake/i.exec(s);
  if (waso) put("wasoMin", parseDuration(waso[1]), /about|around|like|maybe/i.test(waso[0]));

  // Quality: check the strongest words first.
  const q: [RegExp, number][] = [
    [/great|amazing|excellent|very good|slept like a baby/i, 5],
    [/terrible|awful|horrible|worst|very (?:bad|poor)|barely slept/i, 1],
    [/\b(bad|poor|rough|restless) (?:night|sleep)|slept (?:badly|poorly)/i, 2],
    [/\b(ok|okay|alright|so-so|not great|fine)\b/i, 3],
    [/\b(good|decent|better)\b|slept well/i, 4],
  ];
  for (const [re, val] of q) if (re.test(s)) { put("quality", val, true); break; }

  // Ambiguity: "around 2" with no am/pm/hours.
  let ambiguity: Ambiguity | null = null;
  const vague = /(?:woke|awake|up)[^.]{0,20}?around\s+(\d{1,2})(?!\s*(?::|am|pm|a\.m|p\.m|hours?|hrs?|h\b|min))/i.exec(s);
  if (vague && !fields.wasoMin) {
    const n = Number(vague[1]);
    if (n >= 1 && n <= 6) {
      ambiguity = {
        field: "wasoMin",
        question: `You said "around ${n}". Did you mean a time or how long you were awake?`,
        options: [
          { label: `At ${n}:00 am (a time)`, value: `${String(n).padStart(2, "0")}:00` },
          { label: `For ${n} hour${n > 1 ? "s" : ""} (awake time)`, value: n * 60 },
        ],
      };
    }
  }

  const { habits, sleepAid } = detectHabits(s);

  // Quote: the sentence that sounds most like how the night felt.
  const sentences = story.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length >= 15 && x.length <= 160);
  const feeling = sentences.find((x) => /felt|feel|mind|thinking|worr|wired|exhausted|tired|lying|anxious|frustrat|couldn't/i.test(x));

  // Notes for the provider: sentences about health, medicines or big events, kept word for word.
  const notes = story
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 8 && x.length <= 200 && NOTE_PATTERN.test(x))
    .slice(0, 3)
    .map((x) => ({ fact: x, evidence: x }));

  return { fields, habits, sleepAid, ambiguity, quote: feeling ?? null, notes };
}

export function fallbackExtract(story: string, reason: ExtractionResult["fallbackReason"], ms = 0): ExtractionResult {
  const start = Date.now();
  const result = validateExtraction(fallbackRaw(story), story, 0);
  // Fallback confidence is never "high": a regex can misread a story.
  const fields: ExtractedFields = {};
  for (const [k, f] of Object.entries(result.fields)) {
    (fields as Record<string, unknown>)[k] = { ...f, confidence: f!.confidence === "high" ? "medium" : f!.confidence };
  }
  return { ...result, fields, mode: "fallback", fallbackReason: reason, ms: ms + (Date.now() - start) };
}
