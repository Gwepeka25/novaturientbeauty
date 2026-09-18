import { prisma } from "@/lib/prisma";
import { utcToLocalDateISO } from "@/lib/timezone";

/**
 * CSV export for the Finances admin page — a plain-text general ledger a
 * client can open in a spreadsheet or hand to a bookkeeper. Kept separate
 * from src/lib/analytics.ts because a real financial export needs fields
 * (client name, service, expense description, reference) that the
 * dashboard's own aggregate views deliberately don't carry.
 *
 * buildFinancialReportCsv() is a plain function over already-fetched rows,
 * same testability philosophy as analytics.ts — the two get*ForExport()
 * wrappers below are the only parts that touch Prisma.
 */

export type RevenueRow = {
  date: string; // "YYYY-MM-DD", Europe/Brussels local
  reference: string;
  serviceName: string;
  clientName: string;
  format: string;
  amountCents: number;
  currency: string;
};

export type ExpenseRow = {
  date: string; // "YYYY-MM-DD"
  category: string;
  description: string;
  amountCents: number;
  currency: string;
};

const CSV_HEADER = ["Date", "Type", "Description", "Reference", "Amount", "Currency"];

export function buildFinancialReportCsv(revenue: RevenueRow[], expenses: ExpenseRow[]): string {
  const lines: string[][] = [CSV_HEADER];

  const rows: { date: string; type: "Revenue" | "Expense"; description: string; reference: string; amountCents: number; currency: string }[] = [
    ...revenue.map((r) => ({
      date: r.date,
      type: "Revenue" as const,
      description: `${r.serviceName} — ${r.clientName} (${r.format === "in_person" ? "in person" : "online"})`,
      reference: r.reference,
      amountCents: r.amountCents,
      currency: r.currency,
    })),
    ...expenses.map((e) => ({
      date: e.date,
      type: "Expense" as const,
      description: `${e.category}: ${e.description}`,
      reference: "",
      amountCents: -e.amountCents, // negative — this is money out, not in
      currency: e.currency,
    })),
  ];

  rows.sort((a, b) => a.date.localeCompare(b.date));

  for (const row of rows) {
    lines.push([
      row.date,
      row.type,
      row.description,
      row.reference,
      (row.amountCents / 100).toFixed(2),
      row.currency,
    ]);
  }

  return lines.map((line) => line.map(csvEscape).join(",")).join("\r\n");
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function getRevenueRowsForExport(range: { from: Date; to: Date }): Promise<RevenueRow[]> {
  const rows = await prisma.appointment.findMany({
    where: { status: "completed", startsAt: { gte: range.from, lte: range.to } },
    include: { service: true },
    orderBy: { startsAt: "asc" },
  });
  return rows.map((a) => ({
    date: utcToLocalDateISO(a.startsAt),
    reference: a.publicCode,
    serviceName: a.service.name,
    clientName: a.clientName,
    format: a.format,
    amountCents: a.priceCentsAtBooking ?? a.service.priceCents,
    currency: a.service.currency,
  }));
}

export async function getExpenseRowsForExport(range: { from: string; to: string }): Promise<ExpenseRow[]> {
  const rows = await prisma.expense.findMany({
    where: { date: { gte: range.from, lte: range.to } },
    orderBy: { date: "asc" },
  });
  return rows.map((e) => ({
    date: e.date,
    category: e.category,
    description: e.description,
    amountCents: e.amountCents,
    currency: e.currency,
  }));
}
