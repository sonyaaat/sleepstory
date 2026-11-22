// Reads the morning story in the phone demo. A public page can't hold the AI gateway key, so the app's
// own rule-based reader (src/adapters/llm/fallback.ts) reads the story right here in the browser. The
// result goes through the same validation as the model's output (AI-02, AI-04) and the review screen
// shows it the same way it shows the model's answers.

import { z } from "zod";
import { fallbackRaw } from "@/adapters/llm/fallback";
import type { ExtractionResult } from "@/adapters/llm/types";
import { validateExtraction } from "@/adapters/llm/validate";
import { currentSession } from "./session";

/** About as long as the model takes, so "Reading your story…" shows like it does in the app. */
const READING_MS = 1200;

export async function readStory(story: string): Promise<ExtractionResult> {
  const start = Date.now();
  const raw = fallbackRaw(story);
  await new Promise((resolve) => setTimeout(resolve, READING_MS));
  return validateExtraction(raw, story, Date.now() - start);
}

// Same request rules as src/app/api/extract/route.ts.
const Body = z.object({ story: z.string().trim().min(1).max(2000) });

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/**
 * There's no server behind the demo, so the check-in's POST /api/extract is answered here, in the
 * browser. Every other request goes out as usual.
 */
export function installExtractRoute() {
  const w = window as Window & { __sleepstoryExtract?: boolean };
  if (w.__sleepstoryExtract) return;
  w.__sleepstoryExtract = true;
  const send = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (method !== "POST" || url.origin !== window.location.origin || !url.pathname.endsWith("/api/extract")) {
      return send(input, init);
    }
    if (!(await currentSession())) return json(401, { error: "No demo session" });
    let story: unknown = null;
    try {
      story = JSON.parse(String(init?.body ?? "")).story;
    } catch {
      // not JSON: rejected below
    }
    const parsed = Body.safeParse({ story });
    if (!parsed.success) return json(400, { error: "Please describe your night first." });
    return json(200, await readStory(parsed.data.story));
  };
}
