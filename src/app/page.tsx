import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatFeeCents } from "@/lib/services-data";
import { getContentMany } from "@/lib/content";
import { Reveal } from "@/components/reveal";
import { BookingCTA } from "@/components/booking-cta";
import {
  IconBanknote,
  IconUserRound,
  IconUsersRound,
  IconGraduationCap,
  IconArrowDown,
} from "@/components/icons";

// Pulls live pricing/content/reviews from the database — must not be
// statically pre-rendered, or admin edits would need a full rebuild to appear.
export const dynamic = "force-dynamic";

const PROCESS_STEPS = [
  {
    title: "Choose in person or online",
    body: "Select the setting and appointment time that feels most comfortable.",
  },
  {
    title: "Receive a discreet confirmation",
    body: 'Your message will simply say "Your appointment with Michelle."',
  },
  {
    title: "Begin with what feels present",
    body: "You will never be expected to share more than you are ready to.",
  },
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
    getContentMany([
      "hero.eyebrow",
      "hero.heading",
      "hero.body",
      "hero.cta",
      "hero.secondary_cta",
      "hero.profile_tagline",
    ]),
  ]);

  const individual = services.find((s) => s.name === "Individual session");
  const couplesFirst = services.find((s) => s.name === "Couples — first session");
  const student = services.find((s) => s.name === "Student rate");

  return (
    <>
      <section
        id="ps-top"
        className="hero-immersive"
        style={{ backgroundImage: "url('/images/michelle-office.jpg')" }}
      >
        <header className="hero-header wrap">
          <Link className="brand" href="/">
            <b className="serif">Michelle Ihirwe</b>
            <small>Sexologist &amp; Intimacy Therapist</small>
          </Link>
          <nav className="site-nav" aria-label="Primary">
            <a href="#ps-paths">Find your session</a>
            <a href="#ps-process">What to expect</a>
            <a href="#ps-fees">Fees</a>
          </nav>
          <div className="header-right">
            <span aria-hidden="true">EN · FR · NL</span>
            <Link className="button" href="/book">
              Book
            </Link>
          </div>
        </header>

        <div className="wrap hero-content">
          <div>
            <div className="hero-eyebrow">{content["hero.eyebrow"]}</div>
            <h1 className="serif">{content["hero.heading"]}</h1>
            <p className="hero-body">{content["hero.body"]}</p>
            <div className="hero-buttons">
              <a className="button" href="#ps-paths">
                {content["hero.cta"]} <IconArrowDown />
              </a>
              <Link className="button" href="/about">
                {content["hero.secondary_cta"]}
              </Link>
            </div>
          </div>

          <aside className="profile-badge">
            <div className="profile-row">
              <div
                className="profile-photo"
                role="img"
                aria-label="Portrait of Michelle Ihirwe"
                style={{ backgroundImage: "url('/images/michelle-portrait.jpg')" }}
              />
              <div>
                <b className="serif">Michelle Ihirwe</b>
                <small>Sexologist &amp; Intimacy Therapist</small>
              </div>
            </div>
            <p>{content["hero.profile_tagline"]}</p>
          </aside>
        </div>
      </section>

      <section id="ps-paths" className="wrap section">
        <Reveal>
          <div className="section-head">
            <div className="eyebrow">Choose what feels closest</div>
            <h2 className="serif">How would you like to begin?</h2>
            <p>You do not need to choose a diagnosis. Simply choose the kind of space you need.</p>
          </div>
        </Reveal>
        <div className="paths">
          <Link href="/book" className="path">
            <IconUserRound className="icon" />
            <h3 className="serif">I&rsquo;m coming on my own</h3>
            <p>A private individual session focused on your needs, questions and experience.</p>
            {individual && (
              <div className="rate">
                <b>{formatFeeCents(individual.priceCents, individual.currency)}</b>
                <small>
                  {individual.durationMin} minutes
                  <br />
                  In person or online
                </small>
              </div>
            )}
          </Link>
          <Link href="/book" className="path">
            <IconUsersRound className="icon" />
            <h3 className="serif">We&rsquo;re coming together</h3>
            <p>An extended first conversation to understand your relationship and shared dynamic.</p>
            {couplesFirst && (
              <div className="rate">
                <b>{formatFeeCents(couplesFirst.priceCents, couplesFirst.currency)}</b>
                <small>
                  First session
                  <br />
                  {couplesFirst.durationMin} minutes
                </small>
              </div>
            )}
          </Link>
          <Link href="/book" className="path">
            <IconGraduationCap className="icon" />
            <h3 className="serif">I&rsquo;m a student</h3>
            <p>The same individual space, offered at a reduced rate for students.</p>
            {student && (
              <div className="rate">
                <b>{formatFeeCents(student.priceCents, student.currency)}</b>
                <small>
                  {student.durationMin} minutes
                  <br />
                  Student rate
                </small>
              </div>
            )}
          </Link>
        </div>
      </section>

      <section id="ps-process" className="process">
        <div className="wrap section process-grid">
          <div className="process-copy">
            <div className="eyebrow">A gentle process</div>
            <h2 className="serif">Know what to expect before you arrive.</h2>
            <p>
              From booking to your first conversation, the experience is designed to feel
              private, simple and unhurried.
            </p>
          </div>
          <div className="timeline">
            {PROCESS_STEPS.map((step, index) => (
              <div className="moment" key={step.title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ps-fees" className="menu">
        <div className="wrap section menu-grid">
          <div className="menu-intro">
            <div className="eyebrow">The exchange</div>
            <h2 className="serif">Clear fees. Intentionally held time.</h2>
            <p>
              You bring your story and willingness to explore. Michelle brings her knowledge,
              presence and complete attention.
            </p>
            <div className="cash">
              <IconBanknote className="icon" />
              Cash payments only at present. Online-session arrangements are confirmed after
              booking.
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
        <section className="testimonial">
          <div className="wrap">
            <blockquote className="serif">&ldquo;{testimonial.body}&rdquo;</blockquote>
            <small>
              {testimonial.isLegacy
                ? testimonial.displayName
                : `${testimonial.displayName ?? "A client"} · Verified after a completed session`}
            </small>
          </div>
        </section>
      )}

      <div id="ps-book">
        <BookingCTA />
      </div>
    </>
  );
}
