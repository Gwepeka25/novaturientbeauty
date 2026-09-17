import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatLocalDateTime } from "@/lib/timezone";
import { ReviewStatusSelect } from "@/components/admin/review-status-select";
import { updateLegacyTestimonial, sendManualReviewInvite } from "./actions";

export default async function AdminReviewsPage() {
  await requireAdminSession();

  const [reviews, legacy, completedWithoutInvite] = await Promise.all([
    prisma.review.findMany({
      where: { isLegacy: false },
      include: { reviewInvite: { include: { appointment: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.findFirst({ where: { isLegacy: true } }),
    prisma.appointment.findMany({
      where: { status: "completed", reviewInvite: null },
      orderBy: { startsAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <>
      <h1 className="admin-page-title">Reviews</h1>
      <p className="admin-page-subtitle">Moderate submitted reviews and manage the legacy testimonial.</p>

      <div className="admin-card">
        <h2>Verified reviews</h2>
        {reviews.length === 0 ? (
          <p className="admin-empty">No reviews submitted yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Review</th>
                <th>Display as</th>
                <th>Public consent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td>{formatLocalDateTime(r.createdAt)}</td>
                  <td style={{ maxWidth: 320 }}>{r.body}</td>
                  <td>{r.displayName}</td>
                  <td>{r.consentPublic ? "Yes" : "No"}</td>
                  <td>
                    <ReviewStatusSelect reviewId={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-card">
        <h2>Legacy testimonial</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
          Manually entered, shown labeled separately from verified post-appointment reviews.
        </p>
        {legacy && (
          <form action={updateLegacyTestimonial}>
            <input type="hidden" name="id" value={legacy.id} />
            <div className="admin-field">
              <label>Quote</label>
              <textarea name="body" defaultValue={legacy.body} required />
            </div>
            <div className="admin-field">
              <label>Attribution label</label>
              <input type="text" name="displayName" defaultValue={legacy.displayName ?? ""} />
            </div>
            <div className="admin-form-actions">
              <button className="admin-btn" type="submit">
                Save testimonial
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="admin-card">
        <h2>Send a review invite manually</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
          Invites are sent automatically when an appointment is marked completed. Use this only if
          you need to resend or send one that was skipped.
        </p>
        {completedWithoutInvite.length === 0 ? (
          <p className="admin-empty">No completed appointments are missing an invite.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {completedWithoutInvite.map((a) => (
                <tr key={a.id}>
                  <td>{formatLocalDateTime(a.startsAt)}</td>
                  <td>{a.clientName}</td>
                  <td>
                    <form action={sendManualReviewInvite}>
                      <input type="hidden" name="appointmentId" value={a.id} />
                      <button className="admin-btn admin-btn-outline" type="submit">
                        Send invite
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
