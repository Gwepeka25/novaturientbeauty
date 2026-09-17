import { prisma } from "@/lib/prisma";
import { utcToLocalDateISO, localWeekday } from "@/lib/timezone";

/**
 * Business analytics: revenue, expenses, profit, and rule-based insights.
 *
 * Every calculation here is a plain function over already-fetched data
 * (never touching Prisma itself), so it can be unit tested without a
 * database — see tests/unit/analytics.test.ts. The thin Prisma-fetching
 * wrappers at the bottom of this file are the only part that talks to the
 * database, and they're deliberately kept small.
 *
 * Nothing here invents numbers: every metric is a direct aggregate of real
 * rows, and generateInsights() returns an explicit "not enough data yet"
 * result rather than speculating from a handful of appointments.
 */

export type AnalyticsAppointment = {
  id: string;
  startsAt: Date;
  status: string;
  format: string;
  serviceName: string;
  priceCents: number;
  clientEmail: string;
};

export type AnalyticsExpense = {
  date: string; // "YYYY-MM-DD"
  category: string;
  amountCents: number;
};

const REVENUE_STATUS = "completed";
const CANCELLED_STATUSES = ["cancelled_by_client", "cancelled_by_practitioner"];

export function totalRevenueCents(appointments: AnalyticsAppointment[]): number {
  return appointments
    .filter((a) => a.status === REVENUE_STATUS)
    .reduce((sum, a) => sum + a.priceCents, 0);
}

export function totalExpensesCents(expenses: AnalyticsExpense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountCents, 0);
}

export function profitCents(appointments: AnalyticsAppointment[], expenses: AnalyticsExpense[]): number {
  return totalRevenueCents(appointments) - totalExpensesCents(expenses);
}

export type ServiceBreakdown = { serviceName: string; revenueCents: number; sessionCount: number };

export function revenueByService(appointments: AnalyticsAppointment[]): ServiceBreakdown[] {
  const byService = new Map<string, ServiceBreakdown>();
  for (const a of appointments) {
    if (a.status !== REVENUE_STATUS) continue;
    const existing = byService.get(a.serviceName);
    if (existing) {
      existing.revenueCents += a.priceCents;
      existing.sessionCount += 1;
    } else {
      byService.set(a.serviceName, { serviceName: a.serviceName, revenueCents: a.priceCents, sessionCount: 1 });
    }
  }
  return [...byService.values()].sort((a, b) => b.revenueCents - a.revenueCents);
}

export type FormatBreakdown = {
  format: "in_person" | "online";
  revenueCents: number;
  sessionCount: number;
  cancelledCount: number;
  bookedCount: number;
};

export function revenueByFormat(appointments: AnalyticsAppointment[]): FormatBreakdown[] {
  const formats: Array<"in_person" | "online"> = ["in_person", "online"];
  return formats.map((format) => {
    const forFormat = appointments.filter((a) => a.format === format);
    return {
      format,
      revenueCents: totalRevenueCents(forFormat),
      sessionCount: forFormat.filter((a) => a.status === REVENUE_STATUS).length,
      cancelledCount: forFormat.filter((a) => CANCELLED_STATUSES.includes(a.status)).length,
      bookedCount: forFormat.length,
    };
  });
}

export type Funnel = {
  totalBooked: number;
  completed: number;
  cancelled: number;
  noShow: number;
  upcoming: number; // pending/confirmed, in the future — informational only
  cancellationRate: number | null; // null when there's nothing to divide by
  noShowRate: number | null;
};

export function appointmentFunnel(appointments: AnalyticsAppointment[], now = new Date()): Funnel {
  const completed = appointments.filter((a) => a.status === "completed").length;
  const cancelled = appointments.filter((a) => CANCELLED_STATUSES.includes(a.status)).length;
  const noShow = appointments.filter((a) => a.status === "no_show").length;
  const upcoming = appointments.filter(
    (a) => (a.status === "pending" || a.status === "confirmed") && a.startsAt > now,
  ).length;
  // The rate denominator is appointments whose outcome is already decided —
  // pending/confirmed future appointments haven't happened yet, so they'd
  // dilute the rate meaninglessly if included.
  const decided = completed + cancelled + noShow;

  return {
    totalBooked: appointments.length,
    completed,
    cancelled,
    noShow,
    upcoming,
    cancellationRate: decided > 0 ? cancelled / decided : null,
    noShowRate: decided > 0 ? noShow / decided : null,
  };
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function busiestWeekday(
  appointments: AnalyticsAppointment[],
): { name: string; count: number } | null {
  const counts = new Array(7).fill(0);
  for (const a of appointments) {
    if (a.status !== "completed" && a.status !== "confirmed") continue;
    const dateISO = utcToLocalDateISO(a.startsAt);
    counts[localWeekday(dateISO)] += 1;
  }
  const max = Math.max(...counts);
  if (max === 0) return null;
  const weekday = counts.indexOf(max);
  return { name: WEEKDAY_NAMES[weekday], count: max };
}

export type ClientMix = {
  newClientCount: number;
  returningClientCount: number;
  returningClientRevenueCents: number;
  newClientRevenueCents: number;
};

export function newVsReturningClients(appointments: AnalyticsAppointment[]): ClientMix {
  const completedByClient = new Map<string, AnalyticsAppointment[]>();
  for (const a of appointments) {
    if (a.status !== REVENUE_STATUS) continue;
    const list = completedByClient.get(a.clientEmail) ?? [];
    list.push(a);
    completedByClient.set(a.clientEmail, list);
  }

  let newClientCount = 0;
  let returningClientCount = 0;
  let newClientRevenueCents = 0;
  let returningClientRevenueCents = 0;

  for (const sessions of completedByClient.values()) {
    const revenue = sessions.reduce((sum, a) => sum + a.priceCents, 0);
    if (sessions.length === 1) {
      newClientCount += 1;
      newClientRevenueCents += revenue;
    } else {
      returningClientCount += 1;
      returningClientRevenueCents += revenue;
    }
  }

  return { newClientCount, returningClientCount, returningClientRevenueCents, newClientRevenueCents };
}

export type RevenuePoint = { label: string; revenueCents: number };

/** Groups completed-appointment revenue into calendar-month buckets (Brussels-local), oldest first. */
export function monthlyRevenueTrend(appointments: AnalyticsAppointment[]): RevenuePoint[] {
  const byMonth = new Map<string, number>();
  for (const a of appointments) {
    if (a.status !== REVENUE_STATUS) continue;
    const dateISO = utcToLocalDateISO(a.startsAt);
    const monthKey = dateISO.slice(0, 7); // "YYYY-MM"
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + a.priceCents);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, revenueCents]) => ({ label, revenueCents }));
}

export type Insight = { tone: "positive" | "neutral" | "warning"; text: string };

const MIN_COMPLETED_FOR_INSIGHTS = 5;

/**
 * Plain-language, rule-based observations from real data — never
 * speculative. Returns an explicit "not enough data yet" message below
 * MIN_COMPLETED_FOR_INSIGHTS completed sessions rather than drawing
 * conclusions from a handful of appointments.
 */
export function generateInsights(
  appointments: AnalyticsAppointment[],
  expenses: AnalyticsExpense[],
): Insight[] {
  const funnel = appointmentFunnel(appointments);
  if (funnel.completed < MIN_COMPLETED_FOR_INSIGHTS) {
    return [
      {
        tone: "neutral",
        text: `Insights need a bit more history — once you have ${MIN_COMPLETED_FOR_INSIGHTS}+ completed sessions (currently ${funnel.completed}), patterns will show up here.`,
      },
    ];
  }

  const insights: Insight[] = [];

  if (funnel.cancellationRate !== null && funnel.cancellationRate >= 0.2) {
    insights.push({
      tone: "warning",
      text: `${Math.round(funnel.cancellationRate * 100)}% of decided appointments were cancelled. If that keeps climbing, a firmer cancellation-notice policy or a reminder email closer to the appointment may help.`,
    });
  }

  if (funnel.noShowRate !== null && funnel.noShowRate >= 0.1) {
    insights.push({
      tone: "warning",
      text: `${Math.round(funnel.noShowRate * 100)}% of decided appointments were no-shows. A reminder email or SMS the day before tends to reduce this.`,
    });
  }

  const byFormat = revenueByFormat(appointments);
  const inPerson = byFormat.find((f) => f.format === "in_person")!;
  const online = byFormat.find((f) => f.format === "online")!;
  if (inPerson.bookedCount >= 3 && online.bookedCount >= 3) {
    const inPersonCancelRate = inPerson.cancelledCount / inPerson.bookedCount;
    const onlineCancelRate = online.cancelledCount / online.bookedCount;
    if (Math.abs(inPersonCancelRate - onlineCancelRate) >= 0.15) {
      const higher = inPersonCancelRate > onlineCancelRate ? "in-person" : "online";
      insights.push({
        tone: "neutral",
        text: `${higher === "in-person" ? "In-person" : "Online"} sessions are cancelled noticeably more often than the other format — worth a closer look at what's different about that experience.`,
      });
    }
  }

  const byService = revenueByService(appointments);
  if (byService.length >= 2) {
    const best = byService[0];
    const perSessionValues = byService.map((s) => ({ ...s, avg: s.revenueCents / s.sessionCount }));
    const highestAvg = [...perSessionValues].sort((a, b) => b.avg - a.avg)[0];
    insights.push({
      tone: "positive",
      text: `"${best.serviceName}" brings in the most total revenue. "${highestAvg.serviceName}" earns the most per session on average (€${(highestAvg.avg / 100).toFixed(0)}) — if you have room in your schedule, steering interested clients toward it is the highest-leverage use of an open slot.`,
    });
  }

  const busiest = busiestWeekday(appointments);
  if (busiest) {
    insights.push({
      tone: "neutral",
      text: `${busiest.name} is your busiest day. If it's consistently full, consider opening an extra slot that day, or nudging flexible clients toward quieter days.`,
    });
  }

  const clientMix = newVsReturningClients(appointments);
  const totalClients = clientMix.newClientCount + clientMix.returningClientCount;
  if (totalClients >= 5) {
    const returningShare = clientMix.returningClientCount / totalClients;
    insights.push({
      tone: returningShare >= 0.3 ? "positive" : "neutral",
      text: `${Math.round(returningShare * 100)}% of your clients have booked more than once. ${
        returningShare < 0.2
          ? "Most clients aren't returning yet — if that's unexpected, a gentle post-session follow-up might help."
          : "That's a healthy sign clients are getting value from returning."
      }`,
    });
  }

  const revenue = totalRevenueCents(appointments);
  const totalExpenses = totalExpensesCents(expenses);
  if (totalExpenses > 0) {
    const margin = (revenue - totalExpenses) / revenue;
    if (revenue > 0) {
      insights.push({
        tone: margin >= 0.5 ? "positive" : margin >= 0 ? "neutral" : "warning",
        text:
          margin >= 0
            ? `Profit margin is around ${Math.round(margin * 100)}% after logged expenses.`
            : `Logged expenses currently exceed revenue for this period — worth a look at what's driving that before it becomes a pattern.`,
      });
    }
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Prisma-fetching wrappers — the only part of this file that touches the DB.
// ---------------------------------------------------------------------------

export async function getAnalyticsAppointments(
  range?: { from: Date; to: Date },
): Promise<AnalyticsAppointment[]> {
  const rows = await prisma.appointment.findMany({
    where: range ? { startsAt: { gte: range.from, lte: range.to } } : undefined,
    include: { service: true },
    orderBy: { startsAt: "asc" },
  });
  return rows.map((a) => ({
    id: a.id,
    startsAt: a.startsAt,
    status: a.status,
    format: a.format,
    serviceName: a.service.name,
    priceCents: a.priceCentsAtBooking ?? a.service.priceCents,
    clientEmail: a.clientEmail,
  }));
}

export async function getAnalyticsExpenses(
  range?: { from: string; to: string },
): Promise<AnalyticsExpense[]> {
  const rows = await prisma.expense.findMany({
    where: range ? { date: { gte: range.from, lte: range.to } } : undefined,
    orderBy: { date: "asc" },
  });
  return rows.map((e) => ({ date: e.date, category: e.category, amountCents: e.amountCents }));
}
