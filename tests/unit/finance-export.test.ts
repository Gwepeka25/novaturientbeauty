import { describe, it, expect } from "vitest";
import {
  buildFinancialReportCsv,
  type RevenueRow,
  type ExpenseRow,
  type PackageSaleRow,
  type GiftCodeSaleRow,
  type WorkshopRegistrationRevenueRow,
} from "@/lib/finance-export";

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

function packageSaleRow(overrides: Partial<PackageSaleRow> = {}): PackageSaleRow {
  return {
    date: "2026-06-02",
    reference: "pkg_abc123",
    serviceName: "Individual session",
    clientName: "Jamie Client",
    totalSessions: 5,
    amountCents: 30000,
    currency: "EUR",
    ...overrides,
  };
}

function giftCodeSaleRow(overrides: Partial<GiftCodeSaleRow> = {}): GiftCodeSaleRow {
  return {
    date: "2026-06-04",
    reference: "gift_xyz789",
    purchaserName: "Sam Purchaser",
    amountCents: 10000,
    currency: "EUR",
    ...overrides,
  };
}

function workshopRow(overrides: Partial<WorkshopRegistrationRevenueRow> = {}): WorkshopRegistrationRevenueRow {
  return {
    date: "2026-06-06",
    reference: "wreg_abc123",
    workshopTitle: "Intro to Mindful Intimacy",
    clientName: "Robin Client",
    amountCents: 4500,
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

  it("renders a package sale as a positive revenue row", () => {
    const csv = buildFinancialReportCsv([], [], [packageSaleRow()]);
    const [, row] = csv.split("\r\n");
    expect(row).toBe(
      "2026-06-02,Revenue,Package: 5x Individual session — Jamie Client,pkg_abc123,300.00,EUR",
    );
  });

  it("sorts package sales alongside appointment revenue and expenses", () => {
    const csv = buildFinancialReportCsv(
      [revenueRow({ date: "2026-06-15" })],
      [expenseRow({ date: "2026-06-20" })],
      [packageSaleRow({ date: "2026-06-01" })],
    );
    const dates = csv.split("\r\n").slice(1).map((line) => line.split(",")[0]);
    expect(dates).toEqual(["2026-06-01", "2026-06-15", "2026-06-20"]);
  });

  it("renders a gift code sale as a positive revenue row", () => {
    const csv = buildFinancialReportCsv([], [], [], [giftCodeSaleRow()]);
    const [, row] = csv.split("\r\n");
    expect(row).toBe("2026-06-04,Revenue,Gift code — Sam Purchaser,gift_xyz789,100.00,EUR");
  });

  it("renders a gift code sale without a purchaser name", () => {
    const csv = buildFinancialReportCsv([], [], [], [giftCodeSaleRow({ purchaserName: "" })]);
    const [, row] = csv.split("\r\n");
    expect(row).toBe("2026-06-04,Revenue,Gift code,gift_xyz789,100.00,EUR");
  });

  it("sorts gift code sales alongside everything else", () => {
    const csv = buildFinancialReportCsv(
      [revenueRow({ date: "2026-06-15" })],
      [expenseRow({ date: "2026-06-20" })],
      [packageSaleRow({ date: "2026-06-10" })],
      [giftCodeSaleRow({ date: "2026-06-01" })],
    );
    const dates = csv.split("\r\n").slice(1).map((line) => line.split(",")[0]);
    expect(dates).toEqual(["2026-06-01", "2026-06-10", "2026-06-15", "2026-06-20"]);
  });

  it("renders a workshop registration as a positive revenue row", () => {
    const csv = buildFinancialReportCsv([], [], [], [], [workshopRow()]);
    const [, row] = csv.split("\r\n");
    expect(row).toBe(
      "2026-06-06,Revenue,Workshop: Intro to Mindful Intimacy — Robin Client,wreg_abc123,45.00,EUR",
    );
  });

  it("sorts workshop registrations alongside everything else", () => {
    const csv = buildFinancialReportCsv(
      [revenueRow({ date: "2026-06-15" })],
      [expenseRow({ date: "2026-06-20" })],
      [packageSaleRow({ date: "2026-06-10" })],
      [giftCodeSaleRow({ date: "2026-06-05" })],
      [workshopRow({ date: "2026-06-01" })],
    );
    const dates = csv.split("\r\n").slice(1).map((line) => line.split(",")[0]);
    expect(dates).toEqual(["2026-06-01", "2026-06-05", "2026-06-10", "2026-06-15", "2026-06-20"]);
  });
});
