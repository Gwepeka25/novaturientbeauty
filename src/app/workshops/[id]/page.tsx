import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatLocalDateTime } from "@/lib/timezone";
import { formatFeeCents } from "@/lib/services-data";
import { isStripeConfigured } from "@/lib/stripe";
import { WorkshopRegistrationForm } from "@/components/workshop-registration-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const workshop = await prisma.workshop.findUnique({ where: { id } });
  return { title: workshop?.title ?? "Workshop" };
}

export default async function WorkshopDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const { paid } = await searchParams;

  const workshop = await prisma.workshop.findUnique({
    where: { id },
    include: { _count: { select: { registrations: { where: { status: "confirmed" } } } } },
  });
  if (!workshop || !workshop.active) notFound();

  const spotsRemaining = Math.max(0, workshop.capacity - workshop._count.registrations);

  return (
    <section className="wrap section booking-section">
      <div className="big-title">
        <small>Group session</small>
        <h1 className="serif">{workshop.title}</h1>
      </div>

      {paid === "1" && (
        <p className="cash" style={{ marginBottom: 16 }}>
          Payment received — thanks! You&rsquo;re all set for this workshop.
        </p>
      )}

      <p>{workshop.description}</p>
      <dl className="review-summary">
        <div>
          <dt>When</dt>
          <dd>{formatLocalDateTime(workshop.startsAt)} (Brussels time)</dd>
        </div>
        <div>
          <dt>Format</dt>
          <dd>{workshop.format === "in_person" ? "In person" : "Online"}</dd>
        </div>
        {workshop.location && (
          <div>
            <dt>Location</dt>
            <dd>{workshop.location}</dd>
          </div>
        )}
        <div>
          <dt>Price</dt>
          <dd>{formatFeeCents(workshop.priceCents, workshop.currency)} per person</dd>
        </div>
        <div>
          <dt>Spots</dt>
          <dd>{spotsRemaining > 0 ? `${spotsRemaining} of ${workshop.capacity} remaining` : "Fully booked"}</dd>
        </div>
      </dl>

      <WorkshopRegistrationForm
        workshopId={workshop.id}
        stripeEnabled={isStripeConfigured()}
        soldOut={spotsRemaining <= 0}
      />
    </section>
  );
}
