import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFeeCents } from "@/lib/services-data";
import { isStripeConfigured } from "@/lib/stripe";
import { DigitalResourcePurchaseForm } from "@/components/digital-resource-purchase-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const resource = await prisma.digitalResource.findUnique({ where: { id } });
  return { title: resource?.title ?? "Resource" };
}

export default async function DigitalResourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const { paid } = await searchParams;

  const resource = await prisma.digitalResource.findUnique({ where: { id } });
  if (!resource || !resource.active) notFound();

  return (
    <section className="wrap section booking-section">
      <div className="big-title">
        <small>Resource</small>
        <h1 className="serif">{resource.title}</h1>
      </div>

      {paid === "1" && (
        <p className="cash" style={{ marginBottom: 16 }}>
          Payment received — thanks! Check your email for the download link.
        </p>
      )}

      <p>{resource.description}</p>
      <p>
        <b>{formatFeeCents(resource.priceCents, resource.currency)}</b>
      </p>

      <DigitalResourcePurchaseForm resourceId={resource.id} stripeEnabled={isStripeConfigured()} />
    </section>
  );
}
