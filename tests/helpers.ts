import { NightSchema, type Night } from "@/core/schema";

/** A typical night: bed 23:30, asleep after 20 min, 1 awakening of 30 min, up at 07:30. */
export function night(overrides: Partial<Night> = {}): Night {
  return NightSchema.parse({
    date: "2026-11-01",
    inBed: "23:30",
    lightsOut: "23:30",
    solMin: 20,
    awakenings: 1,
    wasoMin: 30,
    finalWake: "07:30",
    outOfBed: "07:30",
    quality: 3,
    ...overrides,
  });
}
