import { DateTime } from "luxon";
import { localToUtc, todayLocalISO, TIMEZONE } from "@/lib/timezone";

export const REPORT_RANGE_PRESETS = ["this_month", "last_3_months", "this_year", "all_time"] as const;
export type ReportRangePreset = (typeof REPORT_RANGE_PRESETS)[number];

export function isReportRangePreset(value: string | undefined): value is ReportRangePreset {
  return !!value && (REPORT_RANGE_PRESETS as readonly string[]).includes(value);
}

const PRESET_LABELS: Record<ReportRangePreset, string> = {
  this_month: "This month",
  last_3_months: "Last 3 months",
  this_year: "This year",
  all_time: "All time",
};

export function reportRangeLabel(preset: ReportRangePreset): string {
  return PRESET_LABELS[preset];
}

/** Resolves a preset into a concrete UTC [from, to] instant range, as of "now" in Brussels time. */
export function resolveReportRange(preset: ReportRangePreset): { from: Date; to: Date } {
  const today = todayLocalISO();
  const now = DateTime.fromISO(today, { zone: TIMEZONE });
  const to = localToUtc(today, 24 * 60);

  switch (preset) {
    case "this_month": {
      const from = now.startOf("month").toISODate()!;
      return { from: localToUtc(from, 0), to };
    }
    case "last_3_months": {
      const from = now.minus({ months: 2 }).startOf("month").toISODate()!;
      return { from: localToUtc(from, 0), to };
    }
    case "this_year": {
      const from = now.startOf("year").toISODate()!;
      return { from: localToUtc(from, 0), to };
    }
    case "all_time":
      return { from: new Date(0), to };
  }
}

/** Same range, as local "YYYY-MM-DD" strings — for filtering Expense.date. */
export function resolveReportRangeLocalDates(preset: ReportRangePreset): { from: string; to: string } {
  const today = todayLocalISO();
  const now = DateTime.fromISO(today, { zone: TIMEZONE });

  switch (preset) {
    case "this_month":
      return { from: now.startOf("month").toISODate()!, to: today };
    case "last_3_months":
      return { from: now.minus({ months: 2 }).startOf("month").toISODate()!, to: today };
    case "this_year":
      return { from: now.startOf("year").toISODate()!, to: today };
    case "all_time":
      return { from: "0000-01-01", to: today };
  }
}
