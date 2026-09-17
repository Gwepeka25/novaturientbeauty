import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatLocalDateTime } from "@/lib/timezone";
import { formatFeeCents } from "@/lib/services-data";
import { getAnalyticsAppointments, totalRevenueCents } from "@/lib/analytics";
import { resolveReportRange } from "@/lib/report-range";

export default async function AdminDashboardPage() {
  await requireAdminSession();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [todayAppointments, upcomingCount, pendingReviewsCount, unpaidCashCount, monthAppointments] =
    await Promise.all([
      prisma.appointment.findMany({
        where: {
          startsAt: { gte: todayStart, lt: todayEnd },
          status: { in: ["pending", "confirmed"] },
        },
        include: { service: true },
        orderBy: { startsAt: "asc" },
      }),
      prisma.appointment.count({
        where: {
          startsAt: { gte: todayEnd, lt: weekEnd },
          status: { in: ["pending", "confirmed"] },
        },
      }),
      prisma.review.count({ where: { status: "pending" } }),
      prisma.appointment.count({
        where: { format: "in_person", status: "completed", cashPaid: false },
      }),
      getAnalyticsAppointments(resolveReportRange("this_month")),
    ]);
  const monthRevenueCents = totalRevenueCents(monthAppointments);

  return (
    <>
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-subtitle">A quick look at today and what needs attention.</p>

      <div className="admin-grid" style={{ marginBottom: 28 }}>
        <div className="admin-stat">
          <b>{todayAppointments.length}</b>
          <span>Appointments today</span>
        </div>
        <div className="admin-stat">
          <b>{upcomingCount}</b>
          <span>Upcoming this week</span>
        </div>
        <div className="admin-stat">
          <b>{pendingReviewsCount}</b>
          <span>Reviews awaiting moderation</span>
        </div>
        <div className="admin-stat">
          <b>{formatFeeCents(monthRevenueCents)}</b>
          <span>
            Revenue this month · <Link href="/admin/finances">Finances →</Link>
          </span>
        </div>
      </div>

      {unpaidCashCount > 0 && (
        <div className="admin-card">
          <h2>Pending actions</h2>
          <p>
            {unpaidCashCount} completed in-person appointment{unpaidCashCount === 1 ? "" : "s"} not
            yet marked as paid.{" "}
            <Link href="/admin/appointments?cashPaid=unpaid">Review appointments</Link>
          </p>
        </div>
      )}

      <div className="admin-card">
        <h2>Today&rsquo;s appointments</h2>
        {todayAppointments.length === 0 ? (
          <p className="admin-empty">Nothing booked for today.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Client</th>
                <th>Service</th>
                <th>Format</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {todayAppointments.map((a) => (
                <tr key={a.id}>
                  <td>{formatLocalDateTime(a.startsAt).split(" at ")[1]}</td>
                  <td>{a.clientName}</td>
                  <td>{a.service.name}</td>
                  <td>{a.format === "in_person" ? "In person" : "Online"}</td>
                  <td>
                    <span className={`admin-badge status-${a.status}`}>{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ marginTop: 16 }}>
          <Link href="/admin/appointments">View all appointments →</Link>
        </p>
      </div>
    </>
  );
}
