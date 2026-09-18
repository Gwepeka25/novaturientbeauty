import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatLocalDateTime } from "@/lib/timezone";
import { formatFeeCents } from "@/lib/services-data";
import { deleteClientData } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled_by_client: "Cancelled by client",
  cancelled_by_practitioner: "Cancelled by practitioner",
  no_show: "No-show",
};

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const email = params.email?.trim().toLowerCase();

  const appointments = email
    ? await prisma.appointment.findMany({
        where: { clientEmail: email },
        include: { service: true },
        orderBy: { startsAt: "desc" },
      })
    : [];

  const totalSpentCents = appointments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + (a.priceCentsAtBooking ?? a.service.priceCents), 0);

  return (
    <>
      <h1 className="admin-page-title">Clients</h1>
      <p className="admin-page-subtitle">
        Look up everything stored about a client by email — their session history, or to fulfil an
        access, export or erasure request.
      </p>

      <div className="admin-card">
        <form method="get" className="admin-row">
          <input type="email" name="email" placeholder="client@example.com" defaultValue={email ?? ""} required />
          <button className="admin-btn" type="submit">
            Look up
          </button>
        </form>
      </div>

      {params.deleted && <p className="form-error" style={{ color: "var(--teal)" }}>All data for that client has been deleted.</p>}
      {params.error === "confirm_mismatch" && (
        <p className="form-error">Type the client&rsquo;s email exactly to confirm deletion.</p>
      )}

      {email && (
        <div className="admin-card">
          <h2>{email}</h2>

          {appointments.length === 0 ? (
            <p className="admin-empty">No appointments found for this email.</p>
          ) : (
            <>
              <p style={{ color: "var(--muted)", marginBottom: 16, fontSize: 14 }}>
                {appointments[0].clientName} · {appointments.length} appointment
                {appointments.length === 1 ? "" : "s"} on record · {formatFeeCents(totalSpentCents)}{" "}
                spent on completed sessions
              </p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Service</th>
                    <th>Format</th>
                    <th>Status</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id}>
                      <td>{formatLocalDateTime(a.startsAt)}</td>
                      <td>{a.service.name}</td>
                      <td>{a.format === "in_person" ? "In person" : "Online"}</td>
                      <td>{STATUS_LABEL[a.status] ?? a.status}</td>
                      <td>{a.publicCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="admin-form-actions" style={{ marginTop: 20 }}>
            <a className="admin-btn admin-btn-outline" href={`/api/admin/clients/export?email=${encodeURIComponent(email)}`}>
              Export data (JSON)
            </a>
          </div>

          <details style={{ marginTop: 24 }}>
            <summary style={{ cursor: "pointer", color: "#b3413a" }}>Delete all data for this client</summary>
            <div style={{ marginTop: 12, padding: 16, border: "1px solid #b3413a", borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                Permanently deletes every appointment, review and portal login request tied to this
                email. This cannot be undone. Type the email address below to confirm.
              </p>
              <form action={deleteClientData} className="admin-row">
                <input type="hidden" name="email" value={email} />
                <input type="email" name="confirmEmail" placeholder="Retype the email to confirm" required />
                <button className="admin-btn" type="submit" style={{ background: "#b3413a" }}>
                  Permanently delete
                </button>
              </form>
            </div>
          </details>
        </div>
      )}
    </>
  );
}
