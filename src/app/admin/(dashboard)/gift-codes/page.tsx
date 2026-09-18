import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatFeeCents } from "@/lib/services-data";
import { createGiftCode, voidGiftCode } from "./actions";

export default async function AdminGiftCodesPage() {
  await requireAdminSession();

  const giftCodes = await prisma.giftCode.findMany({
    orderBy: { issuedAt: "desc" },
  });

  return (
    <>
      <h1 className="admin-page-title">Gift codes</h1>
      <p className="admin-page-subtitle">
        Issue a gift code after someone has paid you directly (cash or bank transfer) — there&rsquo;s
        no online payment on this site. Give the code to whoever will redeem it; they enter it at
        booking and the session is covered in full.
      </p>

      <div className="admin-card">
        <h2>Issue a new gift code</h2>
        <form action={createGiftCode}>
          <div className="admin-row">
            <div className="admin-field">
              <label>Amount paid (€)</label>
              <input type="number" name="amountEuros" min={1} step="0.01" required />
            </div>
            <div className="admin-field">
              <label>Purchaser name (optional)</label>
              <input type="text" name="purchaserName" />
            </div>
            <div className="admin-field">
              <label>Purchaser email (optional)</label>
              <input type="email" name="purchaserEmail" />
            </div>
            <div className="admin-field">
              <label>Expires (optional)</label>
              <input type="date" name="expiresAt" />
            </div>
            <div className="admin-field" style={{ flex: 1 }}>
              <label>Note for recipient (optional)</label>
              <input type="text" name="recipientNote" placeholder="e.g. Happy birthday!" />
            </div>
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn" type="submit">
              Issue gift code
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2>All gift codes</h2>
        {giftCodes.length === 0 ? (
          <p className="admin-empty">No gift codes issued yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Amount</th>
                <th>Purchaser</th>
                <th>Issued</th>
                <th>Expires</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {giftCodes.map((g) => (
                <tr key={g.id}>
                  <td>
                    <code>{g.code}</code>
                  </td>
                  <td>{formatFeeCents(g.amountCents, g.currency)}</td>
                  <td>
                    {g.purchaserName ?? "—"}
                    {g.purchaserEmail && (
                      <>
                        <br />
                        <small style={{ color: "var(--muted)" }}>{g.purchaserEmail}</small>
                      </>
                    )}
                  </td>
                  <td>{g.issuedAt.toISOString().slice(0, 10)}</td>
                  <td>{g.expiresAt ? g.expiresAt.toISOString().slice(0, 10) : "—"}</td>
                  <td>
                    {!g.active
                      ? "Voided"
                      : g.redeemedAt
                        ? `Redeemed ${g.redeemedAt.toISOString().slice(0, 10)}`
                        : g.expiresAt && g.expiresAt < new Date()
                          ? "Expired"
                          : "Active"}
                  </td>
                  <td>
                    {g.active && !g.redeemedAt && (
                      <form action={voidGiftCode}>
                        <input type="hidden" name="giftCodeId" value={g.id} />
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
