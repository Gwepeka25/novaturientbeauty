import type { Metadata } from "next";
import { BRAND_NAME, PRACTITIONER_FULL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms & Cancellation Policy",
  description: "Booking terms and cancellation policy.",
};

export default function TermsPage() {
  return (
    <section className="wrap section">
      <div className="big-title">
        <small>Terms</small>
        <h1 className="serif">Terms &amp; Cancellation Policy</h1>
      </div>

      <div className="draft-banner">
        <strong>Draft — not yet reviewed by a lawyer.</strong> The structure
        below is meant to make that review faster, but every bracketed
        [placeholder] — cancellation fees, governing law, liability wording —
        is a real decision Michelle and a lawyer still need to make.
      </div>

      <div className="legal-body">
        <h2>About this practice</h2>
        <p>
          {BRAND_NAME} is the practice of {PRACTITIONER_FULL}. By booking an
          appointment through this site, you agree to these terms.
        </p>

        <h2>Nature of the service</h2>
        <p>
          Sessions are professional sexology and intimacy therapy
          consultations. This is <strong>not an emergency service</strong>.
          If you are in crisis or need urgent support, please contact your
          GP or local emergency services.
        </p>

        <h2>Booking and fees</h2>
        <p>
          Current fees are listed on the <a href="/sessions">Sessions
          page</a>. The price shown at the time you book is the price
          honoured for that appointment, even if fees change later. Payment
          is currently accepted in cash only, at in-person appointments; for
          online sessions, the payment arrangement is confirmed privately
          after booking.
        </p>

        <h2>Rescheduling and cancellation</h2>
        <p>
          Appointments can be rescheduled or cancelled free of charge up to
          24 hours before the scheduled time, using the secure link in your
          confirmation email. [Placeholder — confirm this window, and
          whether a late-cancellation or no-show fee applies, with
          Michelle.]
        </p>

        <h2>Liability</h2>
        <p>
          [Placeholder — standard liability/disclaimer language (e.g. this
          site's content is for general information only and is not a
          substitute for individual professional advice; no liability for
          third-party links) to be drafted with a lawyer.]
        </p>

        <h2>Governing law</h2>
        <p>[Placeholder — Belgian law is the expected default; confirm with a lawyer.]</p>

        <h2>Changes to these terms</h2>
        <p>
          If these terms change materially, the update will be posted here
          with a new effective date.
        </p>
      </div>
    </section>
  );
}
