import type { Metadata } from "next";

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
        <strong>Draft — not yet reviewed by a lawyer.</strong> This page is a
        placeholder so the site and booking flow work end to end. It must be
        replaced with GDPR-reviewed text (lawful basis, retention periods,
        processor agreements, data subject rights) before real bookings are
        accepted.
      </div>

      <div className="legal-body">
        <p>
          We collect the minimum information needed to schedule and confirm
          your appointment: your name, email address, phone number
          (optional), the session format and time you choose, and any
          optional note you add.
        </p>
        <p>
          This information is used only to manage your appointment and to
          communicate with you about it. It is never sold, shared with
          advertisers, or used for behavioural tracking.
        </p>
        <p>
          Appointment records are retained for as long as needed to provide
          the service and meet any professional record-keeping obligations,
          after which they are deleted. You can ask to see, correct, or
          delete your information at any time by contacting us.
        </p>
        <p>
          Reviews are published only with your explicit, separate consent,
          and never include your appointment type or contact details.
        </p>
      </div>
    </section>
  );
}
