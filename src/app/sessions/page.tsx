import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatFeeCents } from "@/lib/services-data";
import { getContent } from "@/lib/content";
import { BookingCTA } from "@/components/booking-cta";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { IconBanknote, IconMapPin, IconVideo } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sessions",
  description: "Session formats, fees, and what to expect.",
};

export default async function SessionsPage() {
  const locale = await getLocale();
  const WHAT_TO_EXPECT = [
    t(locale, "sessions_expect_1"),
    t(locale, "sessions_expect_2"),
    t(locale, "sessions_expect_3"),
    t(locale, "sessions_expect_4"),
  ];

  const [services, cashNote] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
    getContent("sessions.cash_note", locale),
  ]);

  return (
    <>
      <section className="wrap section">
        <div className="big-title">
          <small>{t(locale, "sessions_small")}</small>
          <h1 className="serif">{t(locale, "sessions_h1")}</h1>
        </div>

        <div className="formats-grid">
          <div className="format-card">
            <span className="eyebrow">{t(locale, "sessions_in_person_eyebrow")}</span>
            <h3 className="serif">{t(locale, "book_format_in_person_address")}</h3>
            <p>
              <IconMapPin className="icon" /> {t(locale, "sessions_in_person_body")}
            </p>
          </div>
          <div className="format-card">
            <span className="eyebrow">{t(locale, "sessions_online_eyebrow")}</span>
            <h3 className="serif">{t(locale, "sessions_online_title")}</h3>
            <p>
              <IconVideo className="icon" /> {t(locale, "sessions_online_body")}
            </p>
          </div>
        </div>
      </section>

      <section className="menu">
        <div className="wrap section menu-grid">
          <div className="menu-intro">
            <div className="eyebrow">{t(locale, "sessions_fees_eyebrow")}</div>
            <h2 className="serif">{t(locale, "sessions_fees_heading")}</h2>
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
                <small>
                  {service.durationMin} {t(locale, "sessions_min_suffix")}
                </small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="big-title">
          <small>{t(locale, "sessions_expect_small")}</small>
          <h2 className="serif">{t(locale, "sessions_expect_heading")}</h2>
        </div>
        <ol className="expect-list">
          {WHAT_TO_EXPECT.map((step) => (
            <li key={step}>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <BookingCTA locale={locale} />
    </>
  );
}
