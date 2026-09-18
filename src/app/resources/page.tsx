import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatFeeCents } from "@/lib/services-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources",
  description: "Downloadable guides and resources.",
};

export default async function ResourcesPage() {
  const resources = await prisma.digitalResource.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="wrap section booking-section">
      <div className="big-title">
        <small>Resources</small>
        <h1 className="serif">Guides &amp; downloads.</h1>
      </div>

      {resources.length === 0 ? (
        <p>No resources are available right now — check back soon.</p>
      ) : (
        <div className="choice-list">
          {resources.map((r) => (
            <Link key={r.id} href={`/resources/${r.id}`} className="choice-row">
              <span>
                <b className="serif">{r.title}</b>
                <small>{r.description}</small>
              </span>
              <span className="choice-row-fee">{formatFeeCents(r.priceCents, r.currency)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
