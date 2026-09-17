import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatLocalTime, todayLocalISO, addDaysLocalISO, localWeekday } from "@/lib/timezone";
import { StatusSelect } from "@/components/admin/status-select";

function startOfWeekISO(dateISO: string): string {
  const weekday = localWeekday(dateISO); // 0=Sun..6=Sat
  const offset = weekday === 0 ? -6 : 1 - weekday; // shift to Monday
  return addDaysLocalISO(dateISO, offset);
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const anchor = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayLocalISO();
  const weekStart = startOfWeekISO(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDaysLocalISO(weekStart, i));

  const rangeStart = new Date(`${days[0]}T00:00:00Z`);
  const rangeEnd = new Date(`${addDaysLocalISO(days[6], 1)}T00:00:00Z`);

  const appointments = await prisma.appointment.findMany({
    where: {
      startsAt: { gte: rangeStart, lt: rangeEnd },
      status: { in: ["pending", "confirmed", "completed", "no_show"] },
    },
    include: { service: true },
    orderBy: { startsAt: "asc" },
  });

  const byDay = new Map<string, typeof appointments>();
  for (const day of days) byDay.set(day, []);
  for (const appt of appointments) {
    const dayKey = days.find((d) => {
      const dayStart = new Date(`${d}T00:00:00Z`);
      const dayEnd = new Date(`${addDaysLocalISO(d, 1)}T00:00:00Z`);
      return appt.startsAt >= dayStart && appt.startsAt < dayEnd;
    });
    if (dayKey) byDay.get(dayKey)!.push(appt);
  }

  const prevWeek = addDaysLocalISO(weekStart, -7);
  const nextWeek = addDaysLocalISO(weekStart, 7);

  return (
    <>
      <h1 className="admin-page-title">Calendar</h1>
      <p className="admin-page-subtitle">Week of {days[0]} – {days[6]}</p>

      <div className="admin-row" style={{ marginBottom: 20 }}>
        <Link className="admin-btn admin-btn-outline" href={`/admin/calendar?date=${prevWeek}`}>
          ← Previous week
        </Link>
        <Link className="admin-btn admin-btn-outline" href={`/admin/calendar?date=${todayLocalISO()}`}>
          This week
        </Link>
        <Link className="admin-btn admin-btn-outline" href={`/admin/calendar?date=${nextWeek}`}>
          Next week →
        </Link>
        <Link className="admin-btn" href="/admin/availability">
          Manage availability / blocks
        </Link>
      </div>

      {days.map((day) => {
        const dayAppointments = byDay.get(day) ?? [];
        return (
          <div className="admin-card" key={day}>
            <h2>{day}</h2>
            {dayAppointments.length === 0 ? (
              <p className="admin-empty">No appointments.</p>
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
                  {dayAppointments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {formatLocalTime(a.startsAt)}–{formatLocalTime(a.endsAt)}
                      </td>
                      <td>{a.clientName}</td>
                      <td>{a.service.name}</td>
                      <td>{a.format === "in_person" ? "In person" : "Online"}</td>
                      <td>
                        <StatusSelect appointmentId={a.id} status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </>
  );
}
