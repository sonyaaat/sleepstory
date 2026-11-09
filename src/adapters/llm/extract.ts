// Entry point for extraction: tries the model, falls back to rules (AI-03, AI-08).

import { fallbackExtract } from "./fallback";
import { EXTRACTION_TIMEOUT_MS, gatewayConfigured, gatewayExtract } from "./gateway";
import type { ExtractionResult } from "./types";
import { validateExtraction } from "./validate";

export type ModelCall = (story: string, signal: AbortSignal) => Promise<unknown>;

export async function extractNight(
  story: string,
  opts: { call?: ModelCall; configured?: boolean; timeoutMs?: number } = {},
): Promise<ExtractionResult> {
  const configured = opts.configured ?? gatewayConfigured();
  const call = opts.call ?? gatewayExtract;
  const timeoutMs = opts.timeoutMs ?? EXTRACTION_TIMEOUT_MS;
  const start = Date.now();

  if (!configured) return fallbackExtract(story, "no_key");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const raw = await Promise.race([
      call(story, controller.signal),
      new Promise<never>((_, reject) =>
        controller.signal.addEventListener("abort", () => reject(new Error("timeout"))),
      ),
    ]);
    try {
      return validateExtraction(raw, story, Date.now() - start);
    } catch {
      return fallbackExtract(story, "invalid_output", Date.now() - start);
    }
  } catch (err) {
    const reason = controller.signal.aborted ? "timeout" : err instanceof SyntaxError ? "invalid_output" : "error";
    if (process.env.NODE_ENV !== "test") console.warn(`[extract] falling back (${reason}):`, (err as Error).message);
    return fallbackExtract(story, reason, Date.now() - start);
  } finally {
    clearTimeout(timer);
  }
}
