// Wearable sources (WEAR-02). Screens only see this interface, so real sources
// (Oura, Apple Health, Google Health) can be added later without touching them.

import type { DiaryEntry } from "@/core/schema";
import { nightMetrics } from "@/core/metrics";

export interface WearableSource {
  name: string;
  /** Watch total sleep (minutes) for the night, or null if there's no data. */
  totalSleepFor(date: string, diary: DiaryEntry): Promise<number | null>;
}

/**
 * Simulated watch (WEAR-01). Like real consumer watches in insomnia, it counts lying
 * still as sleep, so it overestimates most on nights with long time awake.
 */
export const simulatedWatch: WearableSource = {
  name: "Consumer watch (simulated)",
  async totalSleepFor(_date, diary) {
    const { tstMin } = nightMetrics(diary);
    if (tstMin == null) return null; // nothing to compare against
    const lyingStill = Math.round(((diary.solMin ?? 0) + (diary.wasoMin ?? 0)) * 0.7);
    return tstMin + Math.max(10, lyingStill);
  },
};
