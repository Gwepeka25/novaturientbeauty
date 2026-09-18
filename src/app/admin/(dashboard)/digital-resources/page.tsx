import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatFeeCents } from "@/lib/services-data";
import { isPurchaseUnlocked } from "@/lib/digital-resources";
import { createDigitalResource, unpublishDigitalResource, releasePurchaseAsAdmin } from "./actions";

export default async function AdminDigitalResourcesPage() {
  await requireAdminSession();

  const resources = await prisma.digitalResource.findMany({
    orderBy: { createdAt: "desc" },
    include: { purchases: { orderBy: { purchasedAt: "asc" } } },
  });

  return (
    <>
      <h1 className="admin-page-title">Digital resources</h1>
      <p className="admin-page-subtitle">
        Sell a downloadable file (a guide, worksheet, or similar). A cash/bank-transfer purchase
        stays locked until you mark it received below, which emails the client their download
        link; an online payment (once Stripe is configured) unlocks and emails automatically.
      </p>

      <div className="admin-card">
        <h2>Add a new resource</h2>
        <form action={createDigitalResource} encType="multipart/form-data">
          <div className="admin-row">
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Title</label>
              <input type="text" name="title" required />
            </div>
            <div className="admin-field">
              <label>Price (€)</label>
              <input type="number" name="priceEuros" min={0} step="0.01" required />
            </div>
          </div>
          <div className="admin-row">
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Description</label>
              <textarea name="description" rows={3} required />
            </div>
          </div>
          <div className="admin-row">
            <div className="admin-field" style={{ flex: 1 }}>
              <label>File (max 20MB)</label>
              <input type="file" name="file" required />
            </div>
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn" type="submit">
              Add resource
            </button>
          </div>
        </form>
      </div>

      {resources.length === 0 ? (
        <div className="admin-card">
          <p className="admin-empty">No digital resources added yet.</p>
        </div>
      ) : (
        resources.map((r) => (
          <div className="admin-card" key={r.id}>
            <h2>
              {r.title} {!r.active && <small style={{ color: "var(--muted)" }}>(unpublished)</small>}
            </h2>
            <p style={{ color: "var(--muted)" }}>
              {formatFeeCents(r.priceCents, r.currency)} · {r.fileName} ·{" "}
              {(r.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
            </p>

            {r.purchases.length === 0 ? (
              <p className="admin-empty">No purchases yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {r.purchases.map((p) => {
                    const unlocked = isPurchaseUnlocked(p);
                    return (
                      <tr key={p.id}>
                        <td>
                          {p.clientName}
                          <br />
                          <small style={{ color: "var(--muted)" }}>{p.clientEmail}</small>
                        </td>
                        <td>{p.purchasedAt.toISOString().slice(0, 10)}</td>
                        <td>{p.paidOnlineAt ? "Paid online" : unlocked ? "Cash received" : "Awaiting payment"}</td>
                        <td>
                          {!unlocked && (
                            <form action={releasePurchaseAsAdmin}>
                              <input type="hidden" name="purchaseId" value={p.id} />
                              <button className="admin-btn admin-btn-outline" type="submit">
                                Mark cash received &amp; send link
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {r.active && (
              <form action={unpublishDigitalResource} style={{ marginTop: 12 }}>
                <input type="hidden" name="resourceId" value={r.id} />
                <button className="admin-btn admin-btn-outline" type="submit">
                  Unpublish
                </button>
              </form>
            )}
          </div>
        ))
      )}
    </>
  );
}
