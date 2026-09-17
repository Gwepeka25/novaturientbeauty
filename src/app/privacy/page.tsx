import type { Metadata } from "next";
import { BRAND_NAME, PRACTITIONER_FULL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How your information is collected, used and protected.",
};

export default function PrivacyPage() {
  return (
    <section className="wrap section">
      <div className="big-title">
        <small>Privacy</small>
        <h1 className="serif">Privacy Policy</h1>
      </div>

      <div className="draft-banner">
        <strong>Draft — not yet reviewed by a lawyer.</strong> The structure
        below (controller, purposes, processors, GDPR rights) is meant to
        make that review faster, but every bracketed [placeholder] is a real
        decision Michelle and a lawyer still need to make — none of it is
        legal advice.
      </div>

      <div className="legal-body">
        <h2>Who is responsible for your data</h2>
        <p>
          {BRAND_NAME} ({PRACTITIONER_FULL}) is the data controller for the
          information collected through this website. Contact details are on
          the <a href="/contact">Contact page</a>.
        </p>

        <h2>What we collect</h2>
        <p>
          The minimum needed to schedule and confirm your appointment: your
          name, email address, phone number (optional), the session format
          and time you choose, and any optional note you add. We also log
          basic technical data (timestamps, IP address) for security and
          abuse prevention.
        </p>

        <h2>Why we collect it (legal basis)</h2>
        <p>
          Booking details are processed to perform the service you request
          (Article 6(1)(b) GDPR). Security logs are processed under our
          legitimate interest in preventing abuse of the booking system
          (Article 6(1)(f)). We do not use your data for marketing, profiling
          or advertising, and there are no third-party trackers on this site.
        </p>

        <h2>Who we share it with</h2>
        <p>
          Two processors handle data on our behalf, under their own data
          processing terms, and never for their own purposes: our hosting
          and database provider, and our email delivery provider (for
          booking confirmations and reminders). Your data is never sold or
          shared with advertisers.
        </p>

        <h2>How long we keep it</h2>
        <p>
          [Placeholder — retention period to be set by Michelle in
          consultation with a lawyer, based on applicable professional
          record-keeping obligations for sexologists/psychologists in
          Belgium.] After that period, appointment records are deleted.
        </p>

        <h2>Your rights</h2>
        <p>
          Under the GDPR, you can ask to access, correct, erase, or receive a
          copy of your data, and can object to or ask us to restrict its
          processing. Contact us to exercise any of these. You can also lodge
          a complaint with the Belgian Data Protection Authority (Autorité de
          protection des données / Gegevensbeschermingsautoriteit).
        </p>

        <h2>Reviews</h2>
        <p>
          Reviews are published only with your explicit, separate consent,
          and never include your appointment type or contact details.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If this policy changes materially, the update will be posted here
          with a new effective date.
        </p>
      </div>
    </section>
  );
}
