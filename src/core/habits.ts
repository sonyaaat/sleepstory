// "What seems linked to bad nights" (HAB-06, PRV-08).
// Associations only, never causes (principle 7): always shown with night counts.

import type { HabitKey, Night } from "./schema";
import { HABITS } from "./schema";
import { median, nightMetrics } from "./metrics";

/** Minimum number of nights on each side before a comparison is shown. */
export const MIN_NIGHTS_EACH_SIDE = 5;
/** Ignore differences in median sleep efficiency smaller than this (percentage points). */
export const MIN_SE_DIFF = 3;

export interface HabitLink {
  habit: HabitKey;
  label: string;
  nightsWith: number;
  nightsWithout: number;
  seWith: number;
  seWithout: number;
  solWith: number;
  solWithout: number;
  /** seWithout − seWith: how many points lower sleep efficiency is after this habit. */
  seDrop: number;
}

export function habitComparisons(nights: Night[]): HabitLink[] {
  const out: HabitLink[] = [];
  for (const h of HABITS) {
    const withH = nights.filter((n) => n.habits.includes(h.key));
    const without = nights.filter((n) => !n.habits.includes(h.key));
    if (withH.length < MIN_NIGHTS_EACH_SIDE || without.length < MIN_NIGHTS_EACH_SIDE) continue;
    const seWith = median(withH.map((n) => nightMetrics(n).sePct))!;
    const seWithout = median(without.map((n) => nightMetrics(n).sePct))!;
    out.push({
      habit: h.key,
      label: h.short,
      nightsWith: withH.length,
      nightsWithout: without.length,
      seWith,
      seWithout,
      solWith: median(withH.map((n) => n.solMin))!,
      solWithout: median(without.map((n) => n.solMin))!,
      seDrop: seWithout - seWith,
    });
  }
  return out;
}

/** The habits linked to worse nights, largest drop first, at most `limit`. */
export function linkedToBadNights(nights: Night[], limit = 3): HabitLink[] {
  return habitComparisons(nights)
    .filter((l) => l.seDrop >= MIN_SE_DIFF)
    .sort((a, b) => b.seDrop - a.seDrop)
    .slice(0, limit);
}
