import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatFeeCents } from "@/lib/services-data";
import {
  getAnalyticsAppointments,
  getAnalyticsExpenses,
  totalRevenueCents,
  totalExpensesCents,
  profitCents,
  revenueByService,
  revenueByFormat,
  appointmentFunnel,
  newVsReturningClients,
  monthlyRevenueTrend,
  generateInsights,
} from "@/lib/analytics";
import {
  REPORT_RANGE_PRESETS,
  isReportRangePreset,
  resolveReportRange,
  resolveReportRangeLocalDates,
  reportRangeLabel,
  type ReportRangePreset,
} from "@/lib/report-range";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { addExpense, deleteExpense } from "./actions";

const EXPENSE_CATEGORIES = ["rent", "supplies", "marketing", "software", "insurance", "training", "other"];

function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export default async function AdminFinancesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const preset: ReportRangePreset = isReportRangePreset(params.range) ? params.range : "last_3_months";

  const utcRange = resolveReportRange(preset);
  const dateRange = resolveReportRangeLocalDates(preset);

  const [appointments, expenses, recentExpenses] = await Promise.all([
    getAnalyticsAppointments(utcRange),
    getAnalyticsExpenses(dateRange),
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 20 }),
  ]);

  const revenue = totalRevenueCents(appointments);
  const totalExp = totalExpensesCents(expenses);
  const profit = profitCents(appointments, expenses);
  const byService = revenueByService(appointments);
  const byFormat = revenueByFormat(appointments);
  const funnel = appointmentFunnel(appointments);
  const clientMix = newVsReturningClients(appointments);
  const trend = monthlyRevenueTrend(appointments);
  const insights = generateInsights(appointments, expenses);

  return (
    <>
      <h1 className="admin-page-title">Finances</h1>
      <p className="admin-page-subtitle">
        Revenue counts completed sessions at the price charged when booked. Expenses are whatever
        you log below — there&rsquo;s no bank connection.
      </p>

      <div className="admin-row" style={{ marginBottom: 20 }}>
        {REPORT_RANGE_PRESETS.map((p) => (
          <Link
            key={p}
            href={`/admin/finances?range=${p}`}
            className={`admin-btn ${p === preset ? "" : "admin-btn-outline"}`}
          >
            {reportRangeLabel(p)}
          </Link>
        ))}
      </div>

      <div className="admin-grid" style={{ marginBottom: 24 }}>
        <div className="admin-stat">
          <b>{formatFeeCents(revenue)}</b>
          <span>Revenue ({funnel.completed} completed sessions)</span>
        </div>
        <div className="admin-stat">
          <b>{formatFeeCents(totalExp)}</b>
          <span>Expenses logged</span>
        </div>
        <div className="admin-stat">
          <b style={{ color: profit < 0 ? "#b3413a" : undefined }}>{formatFeeCents(profit)}</b>
          <span>Profit</span>
        </div>
      </div>

      <div className="admin-card">
        <h2>Revenue by month</h2>
        <RevenueChart data={trend} />
      </div>

      <div className="admin-card">
        <h2>Insights</h2>
        <ul style={{ display: "grid", gap: 12, listStyle: "none" }}>
          {insights.map((insight, i) => (
            <li
              key={i}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background:
                  insight.tone === "warning"
                    ? "rgba(179, 65, 58, 0.08)"
                    : insight.tone === "positive"
                      ? "rgba(14, 75, 66, 0.08)"
                      : "var(--bg)",
                borderLeft: `3px solid ${
                  insight.tone === "warning" ? "#b3413a" : insight.tone === "positive" ? "#0e4b42" : "#d7b36d"
                }`,
              }}
            >
              {insight.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-card">
        <h2>Booking outcomes</h2>
        <div className="admin-grid">
          <div className="admin-stat">
            <b>{funnel.totalBooked}</b>
            <span>Total booked</span>
          </div>
          <div className="admin-stat">
            <b>{pct(funnel.cancellationRate)}</b>
            <span>Cancellation rate</span>
          </div>
          <div className="admin-stat">
            <b>{pct(funnel.noShowRate)}</b>
            <span>No-show rate</span>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h2>Revenue by service</h2>
        {byService.length === 0 ? (
          <p className="admin-empty">No completed sessions in this period yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Sessions</th>
                <th>Revenue</th>
                <th>Avg. per session</th>
              </tr>
            </thead>
            <tbody>
              {byService.map((s) => (
                <tr key={s.serviceName}>
                  <td>{s.serviceName}</td>
                  <td>{s.sessionCount}</td>
                  <td>{formatFeeCents(s.revenueCents)}</td>
                  <td>{formatFeeCents(Math.round(s.revenueCents / s.sessionCount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-card">
        <h2>In person vs. online</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Format</th>
              <th>Booked</th>
              <th>Completed</th>
              <th>Cancelled</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {byFormat.map((f) => (
              <tr key={f.format}>
                <td>{f.format === "in_person" ? "In person" : "Online"}</td>
                <td>{f.bookedCount}</td>
                <td>{f.sessionCount}</td>
                <td>{f.cancelledCount}</td>
                <td>{formatFeeCents(f.revenueCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-card">
        <h2>Clients</h2>
        <div className="admin-grid">
          <div className="admin-stat">
            <b>{clientMix.newClientCount}</b>
            <span>New clients ({formatFeeCents(clientMix.newClientRevenueCents)})</span>
          </div>
          <div className="admin-stat">
            <b>{clientMix.returningClientCount}</b>
            <span>Returning clients ({formatFeeCents(clientMix.returningClientRevenueCents)})</span>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h2>Log an expense</h2>
        <form action={addExpense}>
          <div className="admin-row">
            <div className="admin-field">
              <label>Date</label>
              <input type="date" name="date" required defaultValue={dateRange.to} />
            </div>
            <div className="admin-field">
              <label>Category</label>
              <select name="category">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label>Amount (€)</label>
              <input type="number" name="amountEuros" min={0.01} step="0.01" required />
            </div>
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Description</label>
              <input type="text" name="description" required placeholder="e.g. Room rental, March" />
            </div>
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn" type="submit">
              Add expense
            </button>
          </div>
        </form>

        {recentExpenses.length === 0 ? (
          <p className="admin-empty">No expenses logged yet.</p>
        ) : (
          <table className="admin-table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.category}</td>
                  <td>{e.description}</td>
                  <td>{formatFeeCents(e.amountCents, e.currency)}</td>
                  <td>
                    <form action={deleteExpense.bind(null, e.id)}>
                      <button className="admin-btn admin-btn-outline" type="submit">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
