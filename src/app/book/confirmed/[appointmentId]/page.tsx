import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { retrieveCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { markAppointmentPaidOnline } from "@/lib/booking";
import { formatLocalDateTime } from "@/lib/timezone";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking confirmed",
  robots: { index: false, follow: false },
};

export default async function BookingConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { appointmentId } = await params;
  const { session_id: sessionId } = await searchParams;
  const locale = await getLocale();

  // Only reachable with a real Stripe session id that Stripe itself
  // redirected the paying client back with — that session_id is the proof
  // of identity here, the same trust level as the manageToken we email.
  if (!sessionId || !isStripeConfigured()) notFound();

  const session = await retrieveCheckoutSession(sessionId).catch(() => null);
  if (
    !session ||
    session.metadata?.kind !== "appointment" ||
    session.metadata?.appointmentId !== appointmentId ||
    session.payment_status !== "paid"
  ) {
    notFound();
  }

  // Fulfillment normally already happened via the webhook — this is the
  // same idempotent call, just in case the client lands here first.
  await markAppointmentPaidOnline(appointmentId, session.id);

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) notFound();

  return (
    <section className="wrap section booking-section">
      <div className="big-title">
        <small>{t(locale, "book_h1_small")}</small>
        <h1 className="serif">{t(locale, "book_h1")}</h1>
      </div>
      <div className="booking-panel" role="status" aria-live="polite">
        <div className="eyebrow">{t(locale, "book_success_eyebrow")}</div>
        <h2 className="serif">{t(locale, "book_success_heading")}</h2>
        <p>
          {formatLocalDateTime(appointment.startsAt)} ({t(locale, "book_success_timezone")}).{" "}
          {t(locale, "book_success_reference")} <strong>{appointment.publicCode}</strong>.
        </p>
        <p>{t(locale, "book_success_body")}</p>
        <div className="step-actions" style={{ justifyContent: "flex-start" }}>
          <a className="button button-outline" href={`/api/manage/${appointment.manageToken}/ics`}>
            {t(locale, "book_success_add_to_calendar")}
          </a>
          <Link className="button" href="/">
            {t(locale, "book_success_home")}
          </Link>
        </div>
      </div>
    </section>
  );
}
