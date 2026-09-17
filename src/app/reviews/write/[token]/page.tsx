import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ReviewSubmitForm } from "@/components/review-submit-form";

export const metadata: Metadata = {
  title: "Share a review",
  robots: { index: false, follow: false },
};

export default async function WriteReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await prisma.reviewInvite.findUnique({ where: { token } });

  const isValid = invite && !invite.usedAt && invite.tokenExp > new Date();

  return (
    <section className="wrap section booking-section">
      <div className="big-title">
        <small>Share a review</small>
        <h1 className="serif">Your experience, in your words.</h1>
      </div>

      {isValid ? (
        <ReviewSubmitForm token={token} />
      ) : (
        <p>
          This review link is invalid, has expired, or has already been used. If you&rsquo;d
          still like to share feedback, please get in touch directly.
        </p>
      )}
    </section>
  );
}
