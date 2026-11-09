import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatClock12, formatDuration, isClock, nightMinutes } from "@/core/time";

describe("time", () => {
  it("maps clock times onto a noon-based timeline", () => {
    expect(nightMinutes("12:00")).toBe(0);
    expect(nightMinutes("23:00")).toBe(660);
    expect(nightMinutes("00:30")).toBe(750);
    expect(nightMinutes("08:15")).toBe(1215);
  });
  it("validates clock strings", () => {
    expect(isClock("07:05")).toBe(true);
    expect(isClock("24:00")).toBe(false);
    expect(isClock("7.05")).toBe(false);
    expect(isClock(705)).toBe(false);
  });
  it("formats", () => {
    expect(formatClock12("00:30")).toBe("12:30 am");
    expect(formatClock12("13:05")).toBe("1:05 pm");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(325)).toBe("5 h 25");
    expect(formatDuration(null)).toBe("–");
  });
  it("does date arithmetic across months", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(daysBetween("2026-10-01", "2026-11-08")).toBe(38);
  });
});
