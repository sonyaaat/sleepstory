import { describe, expect, it } from "vitest";
import { fallbackExtract, parseClockPhrase, parseDuration } from "@/adapters/llm/fallback";
import { validateExtraction, verifyQuote } from "@/adapters/llm/validate";
import { extractNight } from "@/adapters/llm/extract";

const MAYA_STORY =
  "Went to bed around 12:30 but it took me like an hour to fall asleep. I had an energy drink at 4pm for my midterm. " +
  "Woke up twice, for about 40 minutes in total. Got up at 8:15. Felt exhausted and kind of anxious all night.";

describe("fallback parser helpers", () => {
  it("parses durations", () => {
    expect(parseDuration("an hour")).toBe(60);
    expect(parseDuration("1.5 hours")).toBe(90);
    expect(parseDuration("an hour and a half")).toBe(90);
    expect(parseDuration("45 min")).toBe(45);
    expect(parseDuration("half an hour")).toBe(30);
    expect(parseDuration("forty minutes")).toBe(40);
    expect(parseDuration("a while")).toBeNull();
  });
  it("parses clock phrases with evening/morning defaults", () => {
    expect(parseClockPhrase("12:30", "evening")).toBe("00:30");
    expect(parseClockPhrase("11", "evening")).toBe("23:00");
    expect(parseClockPhrase("1:15", "evening")).toBe("01:15");
    expect(parseClockPhrase("8:15", "morning")).toBe("08:15");
    expect(parseClockPhrase("11:30 pm", "evening")).toBe("23:30");
    expect(parseClockPhrase("12 am", "evening")).toBe("00:00");
    expect(parseClockPhrase("midnight", "evening")).toBe("00:00");
  });
});

describe("fallback extraction", () => {
  it("handles the demo scenario story", () => {
    const r = fallbackExtract(MAYA_STORY, "no_key");
    expect(r.mode).toBe("fallback");
    expect(r.fields.inBed?.value).toBe("00:30");
    expect(r.fields.lightsOut?.value).toBe("00:30");
    expect(r.fields.lightsOut?.assumed).toBe(true);
    expect(r.fields.solMin?.value).toBe(60);
    expect(r.fields.awakenings?.value).toBe(2);
    expect(r.fields.wasoMin?.value).toBe(40);
    expect(r.fields.outOfBed?.value).toBe("08:15");
    expect(r.fields.finalWake?.assumed).toBe(true);
    expect(r.habits).toEqual(expect.arrayContaining(["caffeine_late", "stress"]));
    expect(r.quote).toBe("Felt exhausted and kind of anxious all night");
  });
  it("never marks fallback values as high confidence", () => {
    const r = fallbackExtract(MAYA_STORY, "no_key");
    for (const f of Object.values(r.fields)) expect(f!.confidence).not.toBe("high");
  });
  it("asks when 'around 2' could be a time or a duration", () => {
    const r = fallbackExtract("Slept badly, woke up around 2 and couldn't get back to sleep.", "no_key");
    expect(r.ambiguity?.field).toBe("wasoMin");
    expect(r.ambiguity?.options).toHaveLength(2);
    expect(r.fields.quality?.value).toBe(2);
  });
  it("lists missing fields for the patient to fill", () => {
    const r = fallbackExtract("Rough night.", "no_key");
    expect(r.missing).toEqual(expect.arrayContaining(["inBed", "solMin", "outOfBed"]));
  });
  it("detects sleep aids", () => {
    expect(fallbackExtract("Took a melatonin at 11.", "no_key").sleepAid).toBe("melatonin");
    expect(fallbackExtract("Took my zopiclone.", "no_key").sleepAid).toBe("prescription");
  });
});

describe("validation", () => {
  const good = {
    fields: {
      inBed: { value: "0:30", confidence: "medium", assumed: false },
      lightsOut: { value: "00:30", confidence: "low", assumed: true },
      solMin: { value: 60, confidence: "medium", assumed: false },
      awakenings: { value: "2", confidence: "high", assumed: false },
      wasoMin: { value: 9999, confidence: "high", assumed: false }, // out of range
      finalWake: { value: "8:15am", confidence: "high", assumed: false }, // malformed
      outOfBed: { value: "08:15", confidence: "high", assumed: false },
      quality: null,
    },
    habits: ["caffeine_late", "invented_habit", "caffeine_late"],
    sleepAid: "vodka",
    ambiguity: null,
    quote: "felt exhausted and kind of anxious",
  };

  it("keeps valid fields, normalises them, and drops invalid ones", () => {
    const r = validateExtraction(good, MAYA_STORY, 100);
    expect(r.fields.inBed?.value).toBe("00:30");
    expect(r.fields.awakenings?.value).toBe(2);
    expect(r.missing).toEqual(["wasoMin", "finalWake", "quality"]);
    expect(r.habits).toEqual(["caffeine_late"]);
    expect(r.sleepAid).toBeNull();
  });
  it("keeps a quote only if it appears word for word, returning the original text", () => {
    expect(validateExtraction(good, MAYA_STORY, 0).quote).toBe("Felt exhausted and kind of anxious");
    expect(verifyQuote("I felt terrible and anxious", MAYA_STORY)).toBeNull();
    expect(verifyQuote("ok", MAYA_STORY)).toBeNull();
  });
  it("rejects output with the wrong shape", () => {
    expect(() => validateExtraction({ nope: true }, MAYA_STORY, 0)).toThrow();
  });
});

describe("extractNight", () => {
  it("uses the fallback when there's no key", async () => {
    const r = await extractNight(MAYA_STORY, { configured: false });
    expect(r.mode).toBe("fallback");
    expect(r.fallbackReason).toBe("no_key");
  });
  it("uses the model output when it's valid", async () => {
    const r = await extractNight(MAYA_STORY, {
      configured: true,
      call: async () => ({ fields: { solMin: { value: 60, confidence: "high", assumed: false } }, habits: [], quote: null }),
    });
    expect(r.mode).toBe("ai");
    expect(r.fields.solMin?.value).toBe(60);
  });
  it("falls back on timeout", async () => {
    const r = await extractNight(MAYA_STORY, {
      configured: true,
      timeoutMs: 20,
      call: () => new Promise((res) => setTimeout(res, 500)),
    });
    expect(r.mode).toBe("fallback");
    expect(r.fallbackReason).toBe("timeout");
  });
  it("falls back on invalid output and on errors", async () => {
    const bad = await extractNight(MAYA_STORY, { configured: true, call: async () => "not json" });
    expect(bad.fallbackReason).toBe("invalid_output");
    const err = await extractNight(MAYA_STORY, {
      configured: true,
      call: async () => {
        throw new Error("502");
      },
    });
    expect(err.fallbackReason).toBe("error");
  });
});

describe("notes for the provider", () => {
  const story = "Went to bed at 11. Woke up twice. I had a really bad headache again. Started a new allergy pill yesterday.";
  it("keeps model notes only when their evidence is really in the story", () => {
    const r = validateExtraction(
      {
        fields: {},
        habits: [],
        quote: null,
        notes: [
          { fact: "Headache again", evidence: "I had a really bad headache again" },
          { fact: "New allergy medicine", evidence: "Started a new allergy pill yesterday" },
          { fact: "Chest pain", evidence: "my chest hurt" }, // not in the story: dropped
        ],
      },
      story,
      0,
    );
    expect(r.notes.map((n) => n.fact)).toEqual(["Headache again", "New allergy medicine"]);
  });
  it("finds health sentences with the fallback parser", () => {
    const r = fallbackExtract(story, "no_key");
    expect(r.notes.map((n) => n.fact)).toEqual(["I had a really bad headache again.", "Started a new allergy pill yesterday."]);
  });
  it("tolerates a model that returns no notes", () => {
    expect(validateExtraction({ fields: {}, habits: [], quote: null }, story, 0).notes).toEqual([]);
  });
});
