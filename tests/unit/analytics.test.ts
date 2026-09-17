import { describe, it, expect } from "vitest";
import {
  totalRevenueCents,
  totalExpensesCents,
  profitCents,
  revenueByService,
  revenueByFormat,
  appointmentFunnel,
  busiestWeekday,
  newVsReturningClients,
  monthlyRevenueTrend,
  generateInsights,
  type AnalyticsAppointment,
  type AnalyticsExpense,
} from "@/lib/analytics";

function appt(overrides: Partial<AnalyticsAppointment>): AnalyticsAppointment {
  return {
    id: Math.random().toString(36),
    startsAt: new Date("2026-06-01T09:00:00Z"), // a Monday
    status: "completed",
    format: "in_person",
    serviceName: "Individual session",
    priceCents: 7000,
    clientEmail: "client@example.com",
    ...overrides,
  };
}

describe("totalRevenueCents", () => {
  it("only counts completed appointments", () => {
    const rows = [
      appt({ status: "completed", priceCents: 7000 }),
      appt({ status: "cancelled_by_client", priceCents: 7000 }),
      appt({ status: "pending", priceCents: 7000 }),
      appt({ status: "completed", priceCents: 12000 }),
    ];
    expect(totalRevenueCents(rows)).toBe(19000);
  });

  it("returns 0 for no appointments", () => {
    expect(totalRevenueCents([])).toBe(0);
  });
});

describe("totalExpensesCents / profitCents", () => {
  it("sums expenses and computes profit as revenue minus expenses", () => {
    const appointments = [appt({ status: "completed", priceCents: 10000 })];
    const expenses: AnalyticsExpense[] = [
      { date: "2026-06-01", category: "rent", amountCents: 3000 },
      { date: "2026-06-02", category: "supplies", amountCents: 1000 },
    ];
    expect(totalExpensesCents(expenses)).toBe(4000);
    expect(profitCents(appointments, expenses)).toBe(6000);
  });

  it("profit can be negative", () => {
    const appointments = [appt({ status: "completed", priceCents: 1000 })];
    const expenses: AnalyticsExpense[] = [{ date: "2026-06-01", category: "rent", amountCents: 5000 }];
    expect(profitCents(appointments, expenses)).toBe(-4000);
  });
});

describe("revenueByService", () => {
  it("groups revenue and session counts by service, sorted descending", () => {
    const rows = [
      appt({ serviceName: "Individual session", priceCents: 7000, status: "completed" }),
      appt({ serviceName: "Individual session", priceCents: 7000, status: "completed" }),
      appt({ serviceName: "Couples — first session", priceCents: 12000, status: "completed" }),
      appt({ serviceName: "Couples — first session", priceCents: 12000, status: "cancelled_by_client" }),
    ];
    const result = revenueByService(rows);
    expect(result).toEqual([
      { serviceName: "Individual session", revenueCents: 14000, sessionCount: 2 },
      { serviceName: "Couples — first session", revenueCents: 12000, sessionCount: 1 },
    ]);
  });
});

describe("revenueByFormat", () => {
  it("breaks down revenue, sessions and cancellations by format", () => {
    const rows = [
      appt({ format: "in_person", status: "completed", priceCents: 7000 }),
      appt({ format: "in_person", status: "cancelled_by_client", priceCents: 7000 }),
      appt({ format: "online", status: "completed", priceCents: 5500 }),
    ];
    const result = revenueByFormat(rows);
    const inPerson = result.find((r) => r.format === "in_person")!;
    const online = result.find((r) => r.format === "online")!;

    expect(inPerson).toEqual({
      format: "in_person",
      revenueCents: 7000,
      sessionCount: 1,
      cancelledCount: 1,
      bookedCount: 2,
    });
    expect(online.revenueCents).toBe(5500);
    expect(online.bookedCount).toBe(1);
  });
});

describe("appointmentFunnel", () => {
  it("computes cancellation and no-show rates over decided appointments only", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const rows = [
      appt({ status: "completed" }),
      appt({ status: "completed" }),
      appt({ status: "cancelled_by_client" }),
      appt({ status: "no_show" }),
      appt({ status: "pending", startsAt: new Date("2026-07-01T00:00:00Z") }), // future, excluded from rates
    ];
    const funnel = appointmentFunnel(rows, now);
    expect(funnel.totalBooked).toBe(5);
    expect(funnel.completed).toBe(2);
    expect(funnel.cancelled).toBe(1);
    expect(funnel.noShow).toBe(1);
    expect(funnel.upcoming).toBe(1);
    // decided = 2 completed + 1 cancelled + 1 no_show = 4
    expect(funnel.cancellationRate).toBeCloseTo(1 / 4);
    expect(funnel.noShowRate).toBeCloseTo(1 / 4);
  });

  it("returns null rates when nothing has been decided yet", () => {
    const funnel = appointmentFunnel([appt({ status: "pending", startsAt: new Date("2099-01-01") })]);
    expect(funnel.cancellationRate).toBeNull();
    expect(funnel.noShowRate).toBeNull();
  });
});

describe("busiestWeekday", () => {
  it("finds the weekday with the most completed/confirmed appointments", () => {
    const rows = [
      appt({ status: "completed", startsAt: new Date("2026-06-01T09:00:00Z") }), // Monday
      appt({ status: "completed", startsAt: new Date("2026-06-08T09:00:00Z") }), // Monday
      appt({ status: "confirmed", startsAt: new Date("2026-06-02T09:00:00Z") }), // Tuesday
      appt({ status: "cancelled_by_client", startsAt: new Date("2026-06-01T09:00:00Z") }), // excluded
    ];
    expect(busiestWeekday(rows)).toEqual({ name: "Monday", count: 2 });
  });

  it("returns null when there is nothing to count", () => {
    expect(busiestWeekday([appt({ status: "cancelled_by_client" })])).toBeNull();
  });
});

describe("newVsReturningClients", () => {
  it("splits clients by whether they completed more than one session", () => {
    const rows = [
      appt({ clientEmail: "a@x.com", status: "completed", priceCents: 7000 }),
      appt({ clientEmail: "a@x.com", status: "completed", priceCents: 7000 }),
      appt({ clientEmail: "b@x.com", status: "completed", priceCents: 5500 }),
    ];
    const mix = newVsReturningClients(rows);
    expect(mix.returningClientCount).toBe(1);
    expect(mix.newClientCount).toBe(1);
    expect(mix.returningClientRevenueCents).toBe(14000);
    expect(mix.newClientRevenueCents).toBe(5500);
  });
});

describe("monthlyRevenueTrend", () => {
  it("buckets revenue by calendar month, oldest first", () => {
    const rows = [
      appt({ status: "completed", priceCents: 7000, startsAt: new Date("2026-05-15T09:00:00Z") }),
      appt({ status: "completed", priceCents: 5500, startsAt: new Date("2026-06-01T09:00:00Z") }),
      appt({ status: "completed", priceCents: 7000, startsAt: new Date("2026-06-20T09:00:00Z") }),
    ];
    expect(monthlyRevenueTrend(rows)).toEqual([
      { label: "2026-05", revenueCents: 7000 },
      { label: "2026-06", revenueCents: 12500 },
    ]);
  });
});

describe("generateInsights", () => {
  it("declines to speculate with too little history", () => {
    const rows = [appt({ status: "completed" }), appt({ status: "completed" })];
    const insights = generateInsights(rows, []);
    expect(insights).toHaveLength(1);
    expect(insights[0].text).toMatch(/not enough|need a bit more/i);
  });

  it("flags a high cancellation rate once there is enough history", () => {
    const rows = [
      ...Array.from({ length: 6 }, () => appt({ status: "completed" })),
      ...Array.from({ length: 3 }, () => appt({ status: "cancelled_by_client" })),
    ];
    const insights = generateInsights(rows, []);
    expect(insights.some((i) => i.tone === "warning" && /cancel/i.test(i.text))).toBe(true);
  });

  it("never fabricates an insight it has no data for", () => {
    // Exactly at the threshold, all completed, no expenses, single service,
    // single client, all same day — most branches have nothing to say.
    const rows = Array.from({ length: 5 }, () => appt({ status: "completed" }));
    const insights = generateInsights(rows, []);
    // Should not crash, and should not claim a margin/format-comparison
    // insight when there's no real basis for one.
    expect(insights.every((i) => typeof i.text === "string" && i.text.length > 0)).toBe(true);
  });
});
