import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatFeeCents } from "@/lib/services-data";
import { getContentMany } from "@/lib/content";
import { Reveal } from "@/components/reveal";
import { BookingCTA } from "@/components/booking-cta";
import { IconMapPin, IconVideo, IconShieldCheck, IconBanknote } from "@/components/icons";

// Pulls live pricing/content/reviews from the database — must not be
// statically pre-rendered, or admin edits would need a full rebuild to appear.
export const dynamic = "force-dynamic";

const RECOGNITION_STATEMENTS = [
  "Intimacy has become distant, painful or difficult to talk about.",
  "Your desire, pleasure or sexual confidence has changed.",
  "You and your partner keep missing each other in conversation.",
  "You want to understand your body, emotions or patterns more deeply.",
];

export default async function HomePage() {
  const [services, testimonial, content] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.review.findFirst({
      where: { status: "approved", consentPublic: true },
      orderBy: [{ isLegacy: "desc" }, { publishOrder: "asc" }],
    }),
    getContentMany(["hero.eyebrow", "hero.heading", "hero.opening", "hero.body", "hero.cta"]),
  ]);

  return (
    <>
      <section id="letter" className="hero">
        <div
          className="portrait"
          style={{ backgroundImage: "url('/images/michelle-portrait.jpg')" }}
        >
          <span className="portrait-name">Michelle Ihirwe</span>
        </div>
        <div className="hero-copy">
          <div className="eyebrow">{content["hero.eyebrow"]}</div>
          <h1 className="serif">{content["hero.heading"]}</h1>
          <p className="opening">{content["hero.opening"]}</p>
          <p>{content["hero.body"]}</p>
          <div className="signature">Michelle</div>
          <Link className="button" href="/book">
            {content["hero.cta"]}
          </Link>
        </div>
      </section>

      <div className="marquee">
        In person in Jette · Online · English · Français · Nederlands ·
        Individual and couples sessions
      </div>

      <section className="wrap section">
        <Reveal>
          <div className="big-title">
            <small>Perhaps you are here because…</small>
            <h2 className="serif">You want something to feel different.</h2>
          </div>
        </Reveal>
        <div className="issues">
          {RECOGNITION_STATEMENTS.map((statement, index) => (
            <div className="issue" key={statement}>
              <span className="serif">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p>{statement}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="room" className="room">
        <div
          className="room-photo"
          role="img"
          aria-label="Michelle's consultation room"
          style={{ backgroundImage: "url('/images/michelle-office.jpg')" }}
        />
        <div className="room-copy">
          <div className="eyebrow">The room where we meet</div>
          <h2 className="serif">A real space for honest conversation.</h2>
          <p>
            Warm, private and intentionally uncomplicated—so the focus can
            remain on you.
          </p>
          <ul>
            <li>
              <IconMapPin className="icon" />
              Rue Amélie Gomand 45, Jette
            </li>
            <li>
              <IconVideo className="icon" />
              Online appointments available
            </li>
            <li>
              <IconShieldCheck className="icon" />
              Confidential and non-judgmental
            </li>
          </ul>
        </div>
      </section>

      <section className="menu">
        <div className="wrap section menu-grid">
          <div className="menu-intro">
            <div className="eyebrow">The exchange</div>
            <h2 className="serif">Time and care, clearly offered.</h2>
            <p>
              You bring your story and willingness to explore. Michelle
              brings her professional knowledge, full attention and a space
              held with intention.
            </p>
            <div className="cash">
              <IconBanknote className="icon" />
              Cash payments only at present. Online-session arrangements are
              confirmed after booking.
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

      {testimonial && (
        <section className="wrap testimonial">
          <blockquote className="serif">“{testimonial.body}”</blockquote>
          <small>
            {testimonial.isLegacy
              ? testimonial.displayName
              : `${testimonial.displayName ?? "A client"} · Verified after a completed session`}
          </small>
        </section>
      )}

      <div id="book">
        <BookingCTA />
      </div>
    </>
  );
}
