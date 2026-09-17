import type { Metadata } from "next";

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
        <strong>Draft — not yet reviewed by a lawyer.</strong> This page is a
        placeholder so the booking flow works end to end. Cancellation
        windows, fees and professional-title claims must be confirmed by
        Michelle and reviewed by a lawyer before real bookings are accepted.
      </div>

      <div className="legal-body">
        <p>
          Appointments can be rescheduled or cancelled free of charge up to
          24 hours before the scheduled time, using the secure link in your
          confirmation email.
        </p>
        <p>
          Cancellations made with less than 24 hours&rsquo; notice, and
          missed appointments, may be asked to pay for the missed session
          before booking again.
        </p>
        <p>
          Payment is currently accepted in cash only, at in-person
          appointments. For online sessions, the payment arrangement is
          confirmed privately after booking.
        </p>
        <p>
          This service is not an emergency service. If you are in crisis or
          need urgent support, please contact your GP or local emergency
          services.
        </p>
      </div>
    </section>
  );
}
