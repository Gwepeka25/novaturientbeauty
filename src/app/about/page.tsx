import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { BookingCTA } from "@/components/booking-cta";
import { PRACTITIONER_NAME } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About",
  description: `${PRACTITIONER_NAME}'s approach and credentials.`,
};

type Credential = { title: string; institution: string; years: string };

export default async function AboutPage() {
  const [bio, credentialsJson, specialtiesJson] = await Promise.all([
    getContent("about.bio"),
    getContent("about.credentials"),
    getContent("about.specialties"),
  ]);
  const credentials: Credential[] = JSON.parse(credentialsJson);
  const specialties: string[] = JSON.parse(specialtiesJson);

  return (
    <>
      <section className="wrap section">
        <div className="big-title">
          <small>About Michelle</small>
          <h1 className="serif">A grounded, trained approach to intimacy.</h1>
        </div>
        <div className="about-grid">
          <div
            className="about-portrait"
            style={{ backgroundImage: "url('/images/michelle-portrait.jpg')" }}
            role="img"
            aria-label="Portrait of Michelle Ihirwe"
          />
          <div className="about-copy">
            <p>{bio}</p>
          </div>
        </div>
      </section>

      <section className="wrap section credentials-section">
        <div className="eyebrow">Training &amp; credentials</div>
        <h2 className="serif">A background in sexology and psychology.</h2>
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
        <div className="eyebrow">Areas of focus</div>
        <h2 className="serif">What we can work on together.</h2>
        <ul className="specialty-list">
          {specialties.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <BookingCTA
        heading="Curious whether this is the right fit?"
        body="A first conversation is a good way to find out. There is no pressure to have everything figured out beforehand."
      />
    </>
  );
}
