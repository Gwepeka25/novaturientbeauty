import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatLocalDateLabel } from "@/lib/timezone";
import { removeWaitlistEntry } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting",
  notified: "Notified",
  cancelled: "Removed",
};

export default async function AdminWaitlistPage() {
  await requireAdminSession();

  const entries = await prisma.waitlistEntry.findMany({
    where: { status: { in: ["pending", "notified"] } },
    include: { service: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <h1 className="admin-page-title">Waitlist</h1>
      <p className="admin-page-subtitle">
        Clients who asked to be told if a time opens up on a fully-booked date. They&rsquo;re
        emailed automatically the moment a matching appointment is cancelled.
      </p>

      <div className="admin-card">
        {entries.length === 0 ? (
          <p className="admin-empty">No one is currently on the waitlist.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Format</th>
                <th>Client</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatLocalDateLabel(entry.date)}</td>
                  <td>{entry.service.name}</td>
                  <td>{entry.format === "in_person" ? "In person" : "Online"}</td>
                  <td>
                    {entry.clientName}
                    <br />
                    <small style={{ color: "var(--muted)" }}>{entry.clientEmail}</small>
                  </td>
                  <td>{STATUS_LABEL[entry.status] ?? entry.status}</td>
                  <td>
                    <form action={removeWaitlistEntry.bind(null, entry.id)}>
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
