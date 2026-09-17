import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BookingCTA } from "@/components/booking-cta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews",
  description: "What clients have shared, with their consent.",
};

export default async function ReviewsPage() {
  const reviews = await prisma.review.findMany({
    where: { status: "approved", consentPublic: true },
    orderBy: [{ isLegacy: "desc" }, { publishOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <section className="wrap section">
        <div className="big-title">
          <small>Reviews</small>
          <h1 className="serif">Shared with consent, never assumed.</h1>
        </div>
        <p style={{ color: "var(--muted)", maxWidth: "640px" }}>
          Only clients who completed a session and explicitly chose to
          publish a review appear here. Reviews never reveal appointment
          type, contact details, or anything that could identify who wrote
          them unless they chose to share their first name.
        </p>

        {reviews.length > 0 ? (
          <ul className="reviews-list">
            {reviews.map((review) => (
              <li className="review-card" key={review.id}>
                <blockquote className="serif">“{review.body}”</blockquote>
                <small>
                  {review.isLegacy
                    ? review.displayName
                    : `${review.displayName ?? "A client"} · Verified after a completed session`}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="review-empty">
            No reviews are published yet. Clients are invited to leave one
            after a completed session.
          </p>
        )}
      </section>

      <section id="leave-a-review" className="wrap section credentials-section">
        <div className="eyebrow">Leaving a review</div>
        <h2 className="serif">Reviews are by invitation only.</h2>
        <p style={{ color: "var(--muted)", maxWidth: "640px", marginTop: "10px" }}>
          After a completed appointment, you&rsquo;ll receive a private,
          single-use link to share feedback if you&rsquo;d like to. You choose
          whether it&rsquo;s published, and how you&rsquo;re identified — first
          name, initials, or fully anonymous. You can request to withdraw a
          published review at any time by replying to that email.
        </p>
      </section>

      <BookingCTA />
    </>
  );
}
