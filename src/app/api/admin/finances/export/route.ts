import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isReportRangePreset, resolveReportRange, resolveReportRangeLocalDates } from "@/lib/report-range";
import {
  buildFinancialReportCsv,
  getRevenueRowsForExport,
  getExpenseRowsForExport,
  getPackageSaleRowsForExport,
  getGiftCodeSaleRowsForExport,
} from "@/lib/finance-export";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rangeParam = new URL(request.url).searchParams.get("range") ?? undefined;
  const preset = isReportRangePreset(rangeParam) ? rangeParam : "last_3_months";

  const [revenue, expenses, packageSales, giftCodeSales] = await Promise.all([
    getRevenueRowsForExport(resolveReportRange(preset)),
    getExpenseRowsForExport(resolveReportRangeLocalDates(preset)),
    getPackageSaleRowsForExport(resolveReportRange(preset)),
    getGiftCodeSaleRowsForExport(resolveReportRange(preset)),
  ]);

  const csv = buildFinancialReportCsv(revenue, expenses, packageSales, giftCodeSales);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financial-report-${preset}.csv"`,
    },
  });
}
