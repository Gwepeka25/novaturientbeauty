import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { localToUtc, localWeekday, addDaysLocalISO } from "@/lib/timezone";

function lastSundayOfMonth(year: number, month: number): DateTime {
  let dt = DateTime.fromObject({ year, month, day: 1 }, { zone: "Europe/Brussels" }).endOf("month");
  while (dt.weekday !== 7) dt = dt.minus({ days: 1 });
  return dt.startOf("day");
}

describe("localToUtc — Europe/Brussels DST correctness", () => {
  it("uses CET (UTC+1) in winter", () => {
    const utc = localToUtc("2026-01-15", 10 * 60); // 10:00 local
    expect(utc.getUTCHours()).toBe(9);
  });

  it("uses CEST (UTC+2) in summer", () => {
    const utc = localToUtc("2026-07-15", 10 * 60); // 10:00 local
    expect(utc.getUTCHours()).toBe(8);
  });

  it("correctly shifts offset across the spring-forward transition", () => {
    const springForward = lastSundayOfMonth(2026, 3);
    const dayBefore = springForward.minus({ days: 1 }).toISODate()!;
    const dayAfter = springForward.plus({ days: 1 }).toISODate()!;

    const before = localToUtc(dayBefore, 10 * 60);
    const after = localToUtc(dayAfter, 10 * 60);

    expect(before.getUTCHours()).toBe(9); // CET
    expect(after.getUTCHours()).toBe(8); // CEST
  });

  it("correctly shifts offset across the fall-back transition", () => {
    const fallBack = lastSundayOfMonth(2026, 10);
    const dayBefore = fallBack.minus({ days: 1 }).toISODate()!;
    const dayAfter = fallBack.plus({ days: 1 }).toISODate()!;

    const before = localToUtc(dayBefore, 10 * 60);
    const after = localToUtc(dayAfter, 10 * 60);

    expect(before.getUTCHours()).toBe(8); // CEST
    expect(after.getUTCHours()).toBe(9); // CET
  });

  it("never throws for a 23-hour spring-forward day or 25-hour fall-back day", () => {
    const springForward = lastSundayOfMonth(2026, 3).toISODate()!;
    const fallBack = lastSundayOfMonth(2026, 10).toISODate()!;

    expect(() => localToUtc(springForward, 9 * 60)).not.toThrow();
    expect(() => localToUtc(springForward, 17 * 60)).not.toThrow();
    expect(() => localToUtc(fallBack, 9 * 60)).not.toThrow();
    expect(() => localToUtc(fallBack, 17 * 60)).not.toThrow();
  });
});

describe("localWeekday", () => {
  it("matches JS Date's getUTCDay convention (0=Sunday..6=Saturday)", () => {
    // 2026-09-21 is a Monday.
    expect(localWeekday("2026-09-21")).toBe(1);
    // 2026-09-20 is a Sunday.
    expect(localWeekday("2026-09-20")).toBe(0);
  });
});

describe("addDaysLocalISO", () => {
  it("adds days across a month boundary", () => {
    expect(addDaysLocalISO("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("adds days across the spring-forward DST boundary without skipping a day", () => {
    const springForward = lastSundayOfMonth(2026, 3).toISODate()!;
    const dayBefore = addDaysLocalISO(springForward, -1);
    const dayAfter = addDaysLocalISO(springForward, 1);
    expect(DateTime.fromISO(dayAfter).diff(DateTime.fromISO(dayBefore), "days").days).toBe(2);
  });
});
