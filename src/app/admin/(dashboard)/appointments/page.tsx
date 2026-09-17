import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatLocalDateTime } from "@/lib/timezone";
import { StatusSelect } from "@/components/admin/status-select";
import { CashToggle } from "@/components/admin/cash-toggle";
import type { Prisma } from "@prisma/client";

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminSession();
  const params = await searchParams;

  const where: Prisma.AppointmentWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.format) where.format = params.format;
  if (params.cashPaid === "unpaid") {
    where.format = "in_person";
    where.cashPaid = false;
  }
  if (params.q) {
    where.OR = [
      { clientName: { contains: params.q } },
      { clientEmail: { contains: params.q } },
      { publicCode: { contains: params.q } },
    ];
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: { service: true },
    orderBy: { startsAt: "desc" },
    take: 100,
  });

  return (
    <>
      <h1 className="admin-page-title">Appointments</h1>
      <p className="admin-page-subtitle">{appointments.length} shown (most recent 100).</p>

      <form className="admin-card" method="get" style={{ marginBottom: 20 }}>
        <div className="admin-row">
          <input type="text" name="q" placeholder="Search name, email, reference…" defaultValue={params.q ?? ""} />
          <select name="status" defaultValue={params.status ?? ""}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled_by_client">Cancelled by client</option>
            <option value="cancelled_by_practitioner">Cancelled by practitioner</option>
            <option value="no_show">No-show</option>
          </select>
          <select name="format" defaultValue={params.format ?? ""}>
            <option value="">Any format</option>
            <option value="in_person">In person</option>
            <option value="online">Online</option>
          </select>
          <button className="admin-btn" type="submit">
            Filter
          </button>
        </div>
      </form>

      {appointments.length === 0 ? (
        <p className="admin-empty">No appointments match these filters.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Reference</th>
              <th>Client</th>
              <th>Service</th>
              <th>Format</th>
              <th>Cash</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id}>
                <td>{formatLocalDateTime(a.startsAt)}</td>
                <td>{a.publicCode}</td>
                <td>
                  {a.clientName}
                  <br />
                  <small style={{ color: "var(--muted)" }}>{a.clientEmail}</small>
                </td>
                <td>{a.service.name}</td>
                <td>{a.format === "in_person" ? "In person" : "Online"}</td>
                <td>
                  {a.format === "in_person" ? (
                    <CashToggle appointmentId={a.id} cashPaid={a.cashPaid} />
                  ) : (
                    <span style={{ color: "var(--muted)" }}>—</span>
                  )}
                </td>
                <td>
                  <StatusSelect appointmentId={a.id} status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
