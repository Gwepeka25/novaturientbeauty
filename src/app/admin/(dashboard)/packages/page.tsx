import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatFeeCents } from "@/lib/services-data";
import { createPackage, voidPackage } from "./actions";

export default async function AdminPackagesPage() {
  await requireAdminSession();

  const [packages, services] = await Promise.all([
    prisma.package.findMany({
      include: { service: true },
      orderBy: { purchasedAt: "desc" },
    }),
    prisma.service.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
  ]);

  return (
    <>
      <h1 className="admin-page-title">Session packages</h1>
      <p className="admin-page-subtitle">
        Record a package after a client has paid you directly (cash or bank transfer) — there&rsquo;s
        no online payment on this site. Once created, a matching booking automatically uses up one
        session instead of charging individually; cancelling a covered appointment gives the
        session back.
      </p>

      <div className="admin-card">
        <h2>Record a new package</h2>
        <form action={createPackage}>
          <div className="admin-row">
            <div className="admin-field">
              <label>Client email</label>
              <input type="email" name="clientEmail" required />
            </div>
            <div className="admin-field">
              <label>Client name</label>
              <input type="text" name="clientName" required />
            </div>
            <div className="admin-field">
              <label>Service</label>
              <select name="serviceId" defaultValue="">
                <option value="">Any service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label>Total sessions</label>
              <input type="number" name="totalSessions" min={1} step={1} required defaultValue={5} />
            </div>
            <div className="admin-field">
              <label>Amount paid (€)</label>
              <input type="number" name="priceEuros" min={0} step="0.01" required />
            </div>
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Note (optional)</label>
              <input type="text" name="note" placeholder="e.g. Paid by bank transfer, ref 12345" />
            </div>
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn" type="submit">
              Record package
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2>All packages</h2>
        {packages.length === 0 ? (
          <p className="admin-empty">No packages recorded yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Sessions</th>
                <th>Paid</th>
                <th>Purchased</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.clientName}
                    <br />
                    <small style={{ color: "var(--muted)" }}>{p.clientEmail}</small>
                  </td>
                  <td>{p.service?.name ?? "Any service"}</td>
                  <td>
                    {p.usedSessions} of {p.totalSessions}
                  </td>
                  <td>{formatFeeCents(p.priceCentsPaid, p.currency)}</td>
                  <td>{p.purchasedAt.toISOString().slice(0, 10)}</td>
                  <td>
                    {!p.active
                      ? "Voided"
                      : p.usedSessions >= p.totalSessions
                        ? "Used up"
                        : "Active"}
                  </td>
                  <td>
                    {p.active && (
                      <form action={voidPackage}>
                        <input type="hidden" name="packageId" value={p.id} />
                        <button className="admin-btn admin-btn-outline" type="submit">
                          Void
                        </button>
                      </form>
                    )}
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
