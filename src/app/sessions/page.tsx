import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatFeeCents } from "@/lib/services-data";
import { getContent } from "@/lib/content";
import { BookingCTA } from "@/components/booking-cta";
import { IconBanknote, IconMapPin, IconVideo } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sessions",
  description: "Session formats, fees, and what to expect.",
};

const WHAT_TO_EXPECT = [
  "Book online in a few minutes — choose in person or online, then a time that works for you.",
  "Receive a discreet confirmation with practical details. Nothing revealing appears in the subject line.",
  "Arrive (or log in) whenever you feel ready. There is no need to explain everything beforehand.",
  "Pay in cash at your in-person session, or agree an arrangement privately for online sessions.",
];

export default async function SessionsPage() {
  const [services, cashNote] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
    getContent("sessions.cash_note"),
  ]);

  return (
    <>
      <section className="wrap section">
        <div className="big-title">
          <small>Sessions</small>
          <h1 className="serif">Formats, fees, and what to expect.</h1>
        </div>

        <div className="formats-grid">
          <div className="format-card">
            <span className="eyebrow">In person</span>
            <h3 className="serif">Rue Amélie Gomand 45, Jette</h3>
            <p>
              <IconMapPin className="icon" /> A warm, private room, intentionally
              uncomplicated so the focus can remain on you.
            </p>
          </div>
          <div className="format-card">
            <span className="eyebrow">Online</span>
            <h3 className="serif">A private video session</h3>
            <p>
              <IconVideo className="icon" /> The secure meeting link is sent only
              to you, after your booking is confirmed.
            </p>
          </div>
        </div>
      </section>

      <section className="menu">
        <div className="wrap section menu-grid">
          <div className="menu-intro">
            <div className="eyebrow">Fees</div>
            <h2 className="serif">Time and care, clearly offered.</h2>
            <div className="cash">
              <IconBanknote className="icon" />
              {cashNote}
            </div>
          </div>
          <div className="fee-table">
            {services.map((service) => (
              <div className="fee" key={service.id}>
                <h3>{service.name}</h3>
                <b>{formatFeeCents(service.priceCents, service.currency)}</b>
                <p>{service.description}</p>
                <small>{service.durationMin} min</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="big-title">
          <small>What to expect</small>
          <h2 className="serif">A straightforward path to your first session.</h2>
        </div>
        <ol className="expect-list">
          {WHAT_TO_EXPECT.map((step) => (
            <li key={step}>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <BookingCTA />
    </>
  );
}
