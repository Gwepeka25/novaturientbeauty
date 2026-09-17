import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatFeeCents } from "@/lib/services-data";
import { getContentMany } from "@/lib/content";
import { Reveal } from "@/components/reveal";
import { BookingCTA } from "@/components/booking-cta";
import { HomeHeader } from "@/components/home-header";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { PRACTITIONER_NAME, PRACTITIONER_TITLE } from "@/lib/site-config";
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

export default async function HomePage() {
  const locale = await getLocale();
  const PROCESS_STEPS = [
    { title: t(locale, "home_process_step1_title"), body: t(locale, "home_process_step1_body") },
    { title: t(locale, "home_process_step2_title"), body: t(locale, "home_process_step2_body") },
    { title: t(locale, "home_process_step3_title"), body: t(locale, "home_process_step3_body") },
  ];

  const [services, testimonial, content] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.review.findFirst({
      where: { status: "approved", consentPublic: true },
      orderBy: [{ isLegacy: "desc" }, { publishOrder: "asc" }],
    }),
    getContentMany(
      [
        "hero.eyebrow",
        "hero.heading",
        "hero.body",
        "hero.cta",
        "hero.secondary_cta",
        "hero.profile_tagline",
      ],
      locale,
    ),
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
        <HomeHeader locale={locale} />

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
                aria-label={`Portrait of ${PRACTITIONER_NAME}`}
                style={{ backgroundImage: "url('/images/michelle-portrait.jpg')" }}
              />
              <div>
                <b className="serif">{PRACTITIONER_NAME}</b>
                <small>{PRACTITIONER_TITLE}</small>
              </div>
            </div>
            <p>{content["hero.profile_tagline"]}</p>
          </aside>
        </div>
      </section>

      <section id="ps-paths" className="wrap section">
        <Reveal>
          <div className="section-head">
            <div className="eyebrow">{t(locale, "home_choose_closest_eyebrow")}</div>
            <h2 className="serif">{t(locale, "home_choose_closest_heading")}</h2>
            <p>{t(locale, "home_choose_closest_body")}</p>
          </div>
        </Reveal>
        <div className="paths">
          <Link href="/book" className="path">
            <IconUserRound className="icon" />
            <h3 className="serif">{t(locale, "home_path_solo_title")}</h3>
            <p>{t(locale, "home_path_solo_body")}</p>
            {individual && (
              <div className="rate">
                <b>{formatFeeCents(individual.priceCents, individual.currency)}</b>
                <small>
                  {individual.durationMin} {t(locale, "home_minutes_suffix")}
                  <br />
                  {t(locale, "home_path_solo_minutes")}
                </small>
              </div>
            )}
          </Link>
          <Link href="/book" className="path">
            <IconUsersRound className="icon" />
            <h3 className="serif">{t(locale, "home_path_couple_title")}</h3>
            <p>{t(locale, "home_path_couple_body")}</p>
            {couplesFirst && (
              <div className="rate">
                <b>{formatFeeCents(couplesFirst.priceCents, couplesFirst.currency)}</b>
                <small>
                  {t(locale, "home_path_couple_first_session")}
                  <br />
                  {couplesFirst.durationMin} {t(locale, "home_minutes_suffix")}
                </small>
              </div>
            )}
          </Link>
          <Link href="/book" className="path">
            <IconGraduationCap className="icon" />
            <h3 className="serif">{t(locale, "home_path_student_title")}</h3>
            <p>{t(locale, "home_path_student_body")}</p>
            {student && (
              <div className="rate">
                <b>{formatFeeCents(student.priceCents, student.currency)}</b>
                <small>
                  {student.durationMin} {t(locale, "home_minutes_suffix")}
                  <br />
                  {t(locale, "home_path_student_rate")}
                </small>
              </div>
            )}
          </Link>
        </div>
      </section>

      <section id="ps-process" className="process">
        <div className="wrap section process-grid">
          <div className="process-copy">
            <div className="eyebrow">{t(locale, "home_process_eyebrow")}</div>
            <h2 className="serif">{t(locale, "home_process_heading")}</h2>
            <p>{t(locale, "home_process_body")}</p>
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
            <div className="eyebrow">{t(locale, "home_fees_eyebrow")}</div>
            <h2 className="serif">{t(locale, "home_fees_heading")}</h2>
            <p>{t(locale, "home_fees_body")}</p>
            <div className="cash">
              <IconBanknote className="icon" />
              {t(locale, "home_fees_cash_note")}
            </div>
          </div>
          <div className="fee-table">
            {services.map((service) => (
              <div className="fee" key={service.id}>
                <h3>{service.name}</h3>
                <b>{formatFeeCents(service.priceCents, service.currency)}</b>
                <p>{service.description}</p>
                <small>
                  {service.durationMin} {t(locale, "sessions_min_suffix")}
                </small>
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
                : `${testimonial.displayName ?? "A client"} · ${t(locale, "home_testimonial_verified")}`}
            </small>
          </div>
        </section>
      )}

      <div id="ps-book">
        <BookingCTA locale={locale} />
      </div>
    </>
  );
}
