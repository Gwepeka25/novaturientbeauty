import type { Metadata } from "next";
import { getContentMany } from "@/lib/content";
import { BookingCTA } from "@/components/booking-cta";
import { IconMapPin, IconShieldCheck } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Practical details for reaching Michelle Ihirwe.",
};

export default async function ContactPage() {
  const content = await getContentMany([
    "contact.address",
    "contact.email",
    "contact.phone",
    "contact.note",
  ]);

  return (
    <>
      <section className="wrap section">
        <div className="big-title">
          <small>Contact</small>
          <h1 className="serif">Practical details, kept simple.</h1>
        </div>

        <div className="contact-grid">
          <div>
            <p>
              For booking, please use the booking page rather than email —
              it&rsquo;s faster and keeps your details private. For anything
              else, reach out below.
            </p>
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
          </div>
          <div className="format-card">
            <span className="eyebrow">Discretion, by default</span>
            <h3 className="serif">Your privacy is the starting point.</h3>
            <p>
              Contact details are never shared, and nothing about your
              appointment appears in email subject lines, calendar titles or
              analytics.
            </p>
          </div>
        </div>
      </section>

      <BookingCTA />
    </>
  );
}
