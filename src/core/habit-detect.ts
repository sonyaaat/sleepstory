// Recognises habits and sleep aids in free text (HAB-04, HAB-09).
// Pure and instant, so it runs in the browser while the patient types, and in the fallback parser.

import type { HabitKey, SleepAid } from "./schema";

export const HABIT_PATTERNS: [HabitKey, RegExp][] = [
  ["caffeine_late", /energy drink|red bull|monster|celsius|(coffee|espresso|latte|tea|caffeine)[^.]{0,30}(afternoon|evening|night|after (?:lunch|2|3|4|5)|at (?:[2-9]|1[0-1])\s*(pm)?|late)/i],
  ["alcohol", /\b(beer|beers|wine|drinks|drank|alcohol|cocktail|shots?)\b/i],
  ["stress", /stress|anxious|worried|exam|midterm|deadline|assignment due|presentation/i],
  ["late_study", /stud(y|ied|ying)[^.]{0,20}(late|until|till)|pulled an all-nighter|cramm/i],
  ["screens_bed", /phone|tiktok|instagram|scroll|youtube|netflix|laptop in bed|screen/i],
  ["nap", /\bnap(ped|ping)?\b/i],
  ["exercise", /\b(gym|workout|worked out|run|ran|jog|exercis|swim|yoga|soccer|basketball)\w*/i],
];

export const AID_PATTERNS: [SleepAid, RegExp][] = [
  ["prescription", /zopiclone|trazodone|zolpidem|ambien|lorazepam|prescription|prescribed|sleeping pill/i],
  ["otc", /nytol|unisom|benadryl|diphenhydramine|zzzquil|sleep aid|antihistamine/i],
  ["melatonin", /melatonin/i],
];

export function detectHabits(text: string): { habits: HabitKey[]; sleepAid: SleepAid | null } {
  const t = text.replace(/\s+/g, " ");
  return {
    habits: HABIT_PATTERNS.filter(([, re]) => re.test(t)).map(([k]) => k),
    sleepAid: AID_PATTERNS.find(([, re]) => re.test(t))?.[0] ?? null,
  };
}
