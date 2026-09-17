import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { BookingCTA } from "@/components/booking-cta";
import { PRACTITIONER_NAME } from "@/lib/site-config";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About",
  description: `${PRACTITIONER_NAME}'s approach and credentials.`,
};

type Credential = { title: string; institution: string; years: string };

export default async function AboutPage() {
  const locale = await getLocale();
  const [bio, credentialsJson, specialtiesJson] = await Promise.all([
    getContent("about.bio", locale),
    getContent("about.credentials", locale),
    getContent("about.specialties", locale),
  ]);
  const credentials: Credential[] = JSON.parse(credentialsJson);
  const specialties: string[] = JSON.parse(specialtiesJson);

  return (
    <>
      <section className="wrap section">
        <div className="big-title">
          <small>{t(locale, "about_small")}</small>
          <h1 className="serif">{t(locale, "about_h1")}</h1>
        </div>
        <div className="about-grid">
          <div
            className="about-portrait"
            style={{ backgroundImage: "url('/images/michelle-portrait.jpg')" }}
            role="img"
            aria-label={`Portrait of ${PRACTITIONER_NAME}`}
          />
          <div className="about-copy">
            <p>{bio}</p>
          </div>
        </div>
      </section>

      <section className="wrap section credentials-section">
        <div className="eyebrow">{t(locale, "about_credentials_eyebrow")}</div>
        <h2 className="serif">{t(locale, "about_credentials_heading")}</h2>
        <ul className="credentials-list">
          {credentials.map((c) => (
            <li key={c.title}>
              <h3 className="serif">{c.title}</h3>
              <p>{c.institution}</p>
              <small>{c.years}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap section">
        <div className="eyebrow">{t(locale, "about_specialties_eyebrow")}</div>
        <h2 className="serif">{t(locale, "about_specialties_heading")}</h2>
        <ul className="specialty-list">
          {specialties.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <BookingCTA
        locale={locale}
        heading={t(locale, "about_cta_heading")}
        body={t(locale, "about_cta_body")}
      />
    </>
  );
}
