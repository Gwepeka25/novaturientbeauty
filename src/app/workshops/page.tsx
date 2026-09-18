import type { Metadata } from "next";
import Link from "next/link";
import { getUpcomingWorkshopsWithSpots } from "@/lib/workshops";
import { formatLocalDateTime } from "@/lib/timezone";
import { formatFeeCents } from "@/lib/services-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workshops",
  description: "Upcoming group workshops — book your spot.",
};

export default async function WorkshopsPage() {
  const workshops = await getUpcomingWorkshopsWithSpots();

  return (
    <section className="wrap section booking-section">
      <div className="big-title">
        <small>Group sessions</small>
        <h1 className="serif">Upcoming workshops.</h1>
      </div>

      {workshops.length === 0 ? (
        <p>No workshops are scheduled right now — check back soon.</p>
      ) : (
        <div className="choice-list">
          {workshops.map((w) => (
            <Link key={w.id} href={`/workshops/${w.id}`} className="choice-row">
              <span>
                <b className="serif">{w.title}</b>
                <small>
                  {formatLocalDateTime(w.startsAt)} · {w.format === "in_person" ? "In person" : "Online"}
                </small>
              </span>
              <span className="choice-row-fee">
                {formatFeeCents(w.priceCents, w.currency)}
                <br />
                {w.spotsRemaining > 0 ? `${w.spotsRemaining} spots left` : "Fully booked"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
