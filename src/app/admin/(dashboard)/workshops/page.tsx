import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatFeeCents } from "@/lib/services-data";
import { formatLocalDateTime } from "@/lib/timezone";
import {
  createWorkshop,
  unpublishWorkshop,
  toggleRegistrationCashPaid,
  cancelRegistrationAsAdmin,
} from "./actions";

export default async function AdminWorkshopsPage() {
  await requireAdminSession();

  const workshops = await prisma.workshop.findMany({
    orderBy: { startsAt: "desc" },
    include: { registrations: { orderBy: { registeredAt: "asc" } } },
  });

  return (
    <>
      <h1 className="admin-page-title">Workshops</h1>
      <p className="admin-page-subtitle">
        Create a group session with a fixed number of spots. Clients register from the public
        workshops page; payment is cash/bank transfer by default (mark it received below), or online
        automatically once Stripe is configured.
      </p>

      <div className="admin-card">
        <h2>Create a new workshop</h2>
        <form action={createWorkshop}>
          <div className="admin-row">
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Title</label>
              <input type="text" name="title" required />
            </div>
            <div className="admin-field">
              <label>Format</label>
              <select name="format" defaultValue="in_person">
                <option value="in_person">In person</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>
          <div className="admin-row">
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Description</label>
              <textarea name="description" rows={3} required />
            </div>
          </div>
          <div className="admin-row">
            <div className="admin-field">
              <label>Date</label>
              <input type="date" name="date" required />
            </div>
            <div className="admin-field">
              <label>Start time</label>
              <input type="time" name="startTime" required />
            </div>
            <div className="admin-field">
              <label>End time</label>
              <input type="time" name="endTime" required />
            </div>
            <div className="admin-field">
              <label>Capacity</label>
              <input type="number" name="capacity" min={1} step={1} required defaultValue={8} />
            </div>
            <div className="admin-field">
              <label>Price per person (€)</label>
              <input type="number" name="priceEuros" min={0} step="0.01" required />
            </div>
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Location or meeting link (optional)</label>
              <input type="text" name="location" placeholder="e.g. Rue Amélie Gomand 45, Jette" />
            </div>
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn" type="submit">
              Create workshop
            </button>
          </div>
        </form>
      </div>

      {workshops.length === 0 ? (
        <div className="admin-card">
          <p className="admin-empty">No workshops created yet.</p>
        </div>
      ) : (
        workshops.map((w) => {
          const confirmed = w.registrations.filter((r) => r.status === "confirmed");
          return (
            <div className="admin-card" key={w.id}>
              <h2>
                {w.title} {!w.active && <small style={{ color: "var(--muted)" }}>(unpublished)</small>}
              </h2>
              <p style={{ color: "var(--muted)" }}>
                {formatLocalDateTime(w.startsAt)} · {w.format === "in_person" ? "In person" : "Online"} ·{" "}
                {formatFeeCents(w.priceCents, w.currency)} per person · {confirmed.length} of {w.capacity} spots
                filled
              </p>

              {w.registrations.length === 0 ? (
                <p className="admin-empty">No registrations yet.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Status</th>
                      <th>Paid</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {w.registrations.map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.clientName}
                          <br />
                          <small style={{ color: "var(--muted)" }}>{r.clientEmail}</small>
                        </td>
                        <td>{r.status === "confirmed" ? "Confirmed" : "Cancelled"}</td>
                        <td>
                          {r.paidOnlineAt ? (
                            "Paid online"
                          ) : r.status === "confirmed" ? (
                            <form action={toggleRegistrationCashPaid}>
                              <input type="hidden" name="registrationId" value={r.id} />
                              <input type="hidden" name="cashPaid" value={String(!r.cashPaid)} />
                              <button className="admin-btn admin-btn-outline" type="submit">
                                {r.cashPaid ? "Cash received ✓" : "Mark cash received"}
                              </button>
                            </form>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          {r.status === "confirmed" && (
                            <form action={cancelRegistrationAsAdmin}>
                              <input type="hidden" name="registrationId" value={r.id} />
                              <button className="admin-btn admin-btn-outline" type="submit">
                                Cancel
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {w.active && (
                <form action={unpublishWorkshop} style={{ marginTop: 12 }}>
                  <input type="hidden" name="workshopId" value={w.id} />
                  <button className="admin-btn admin-btn-outline" type="submit">
                    Unpublish
                  </button>
                </form>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
