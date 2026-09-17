import type { Metadata } from "next";
import { getContentMany } from "@/lib/content";
import { BookingCTA } from "@/components/booking-cta";
import { IconMapPin, IconShieldCheck } from "@/components/icons";
import { PRACTITIONER_NAME } from "@/lib/site-config";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: `Practical details for reaching ${PRACTITIONER_NAME}.`,
};

export default async function ContactPage() {
  const locale = await getLocale();
  const content = await getContentMany(
    ["contact.address", "contact.email", "contact.phone", "contact.note"],
    locale,
  );

  return (
    <>
      <section className="wrap section">
        <div className="big-title">
          <small>{t(locale, "contact_small")}</small>
          <h1 className="serif">{t(locale, "contact_h1")}</h1>
        </div>

        <div className="contact-grid">
          <div>
            <p>{t(locale, "contact_intro")}</p>
            <ul className="contact-list">
              <li>
                <IconMapPin className="icon" />
                <span>{content["contact.address"]}</span>
              </li>
              {content["contact.email"] && (
                <li>
                  <IconShieldCheck className="icon" />
                  <a href={`mailto:${content["contact.email"]}`}>
                    {content["contact.email"]}
                  </a>
                </li>
              )}
            </ul>
            <div className="contact-note">{content["contact.note"]}</div>
            <div className="contact-map">
              <iframe
                title="Map showing the practice location"
                src={`https://www.google.com/maps?q=${encodeURIComponent(content["contact.address"])}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
          <div className="format-card">
            <span className="eyebrow">{t(locale, "contact_discretion_eyebrow")}</span>
            <h3 className="serif">{t(locale, "contact_discretion_heading")}</h3>
            <p>{t(locale, "contact_discretion_body")}</p>
          </div>
        </div>
      </section>

      <BookingCTA locale={locale} />
    </>
  );
}
