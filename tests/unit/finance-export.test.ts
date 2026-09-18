import { describe, it, expect } from "vitest";
import { buildFinancialReportCsv, type RevenueRow, type ExpenseRow } from "@/lib/finance-export";

function revenueRow(overrides: Partial<RevenueRow> = {}): RevenueRow {
  return {
    date: "2026-06-05",
    reference: "NB-ABCDEFG",
    serviceName: "Individual session",
    clientName: "Alex Client",
    format: "in_person",
    amountCents: 7000,
    currency: "EUR",
    ...overrides,
  };
}

function expenseRow(overrides: Partial<ExpenseRow> = {}): ExpenseRow {
  return {
    date: "2026-06-03",
    category: "rent",
    description: "Room rental, June",
    amountCents: 30000,
    currency: "EUR",
    ...overrides,
  };
}

describe("buildFinancialReportCsv", () => {
  it("includes a header row", () => {
    const csv = buildFinancialReportCsv([], []);
    expect(csv.split("\r\n")[0]).toBe("Date,Type,Description,Reference,Amount,Currency");
  });

  it("renders a revenue row with a positive amount and the appointment reference", () => {
    const csv = buildFinancialReportCsv([revenueRow()], []);
    const [, row] = csv.split("\r\n");
    expect(row).toBe(
      "2026-06-05,Revenue,Individual session — Alex Client (in person),NB-ABCDEFG,70.00,EUR",
    );
  });

  it("renders an expense row with a negative amount and no reference", () => {
    const csv = buildFinancialReportCsv([], [expenseRow({ description: "Room rental" })]);
    const [, row] = csv.split("\r\n");
    expect(row).toBe("2026-06-03,Expense,rent: Room rental,,-300.00,EUR");
  });

  it("sorts revenue and expense rows together by date", () => {
    const csv = buildFinancialReportCsv(
      [revenueRow({ date: "2026-06-10" })],
      [expenseRow({ date: "2026-06-01" }), expenseRow({ date: "2026-06-20" })],
    );
    const dates = csv.split("\r\n").slice(1).map((line) => line.split(",")[0]);
    expect(dates).toEqual(["2026-06-01", "2026-06-10", "2026-06-20"]);
  });

  it("quotes and escapes fields containing commas or quotes", () => {
    const csv = buildFinancialReportCsv(
      [],
      [expenseRow({ description: 'Chairs, desk & a "welcome" sign' })],
    );
    const [, row] = csv.split("\r\n");
    expect(row).toContain('"rent: Chairs, desk & a ""welcome"" sign"');
  });

  it("returns only the header for no data", () => {
    const csv = buildFinancialReportCsv([], []);
    expect(csv.split("\r\n")).toHaveLength(1);
  });
});
