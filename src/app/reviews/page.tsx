import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BookingCTA } from "@/components/booking-cta";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews",
  description: "What clients have shared, with their consent.",
};

export default async function ReviewsPage() {
  const locale = await getLocale();
  const reviews = await prisma.review.findMany({
    where: { status: "approved", consentPublic: true },
    orderBy: [{ isLegacy: "desc" }, { publishOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <section className="wrap section">
        <div className="big-title">
          <small>{t(locale, "reviews_small")}</small>
          <h1 className="serif">{t(locale, "reviews_h1")}</h1>
        </div>
        <p style={{ color: "var(--muted)", maxWidth: "640px" }}>{t(locale, "reviews_intro")}</p>

        {reviews.length > 0 ? (
          <ul className="reviews-list">
            {reviews.map((review) => (
              <li className="review-card" key={review.id}>
                <blockquote className="serif">“{review.body}”</blockquote>
                <small>
                  {review.isLegacy
                    ? review.displayName
                    : `${review.displayName ?? "A client"} · ${t(locale, "reviews_verified")}`}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="review-empty">{t(locale, "reviews_empty")}</p>
        )}
      </section>

      <section id="leave-a-review" className="wrap section credentials-section">
        <div className="eyebrow">{t(locale, "reviews_leave_eyebrow")}</div>
        <h2 className="serif">{t(locale, "reviews_leave_heading")}</h2>
        <p style={{ color: "var(--muted)", maxWidth: "640px", marginTop: "10px" }}>
          {t(locale, "reviews_leave_body")}
        </p>
      </section>

      <BookingCTA locale={locale} />
    </>
  );
}
