import { describe, expect, it } from "vitest";
import { habitComparisons, linkedToBadNights } from "@/core/habits";
import { addDays } from "@/core/time";
import { night } from "../helpers";

const make = (count: number, habit: boolean, solMin: number, start: number) =>
  Array.from({ length: count }, (_, i) =>
    night({ date: addDays("2026-10-01", start + i), solMin, habits: habit ? ["caffeine_late"] : [] }),
  );

describe("habit links", () => {
  it("needs at least 5 nights on each side", () => {
    const nights = [...make(4, true, 90, 0), ...make(10, false, 20, 4)];
    expect(habitComparisons(nights)).toEqual([]);
  });
  it("finds a habit linked to worse nights, with night counts", () => {
    const nights = [...make(6, true, 90, 0), ...make(10, false, 20, 6)];
    const [link] = linkedToBadNights(nights);
    expect(link.habit).toBe("caffeine_late");
    expect(link.nightsWith).toBe(6);
    expect(link.nightsWithout).toBe(10);
    expect(link.solWith).toBe(90);
    expect(link.seDrop).toBeGreaterThan(10);
  });
  it("ignores tiny differences", () => {
    const nights = [...make(6, true, 25, 0), ...make(10, false, 20, 6)];
    expect(linkedToBadNights(nights)).toEqual([]);
  });
});
