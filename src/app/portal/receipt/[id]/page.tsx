import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-session";
import { formatLocalDateTime } from "@/lib/timezone";
import { formatFeeCents } from "@/lib/services-data";
import { BRAND_NAME, PRACTITIONER_FULL } from "@/lib/site-config";
import { getContent } from "@/lib/content";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Session receipt",
  robots: { index: false, follow: false },
};

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getClientSession();
  const appointment = session
    ? await prisma.appointment.findUnique({ where: { id }, include: { service: true } })
    : null;

  // Same "not found" outcome whether there's no session, no such
  // appointment, the appointment belongs to someone else, or it isn't
  // completed yet — never confirms to a signed-in client that some other
  // appointment ID exists.
  if (!session || !appointment || appointment.clientEmail !== session.email || appointment.status !== "completed") {
    notFound();
  }

  const address = await getContent("contact.address");
  const amountCents = appointment.priceCentsAtBooking ?? appointment.service.priceCents;

  return (
    <section className="wrap section booking-section receipt-page">
      <div className="big-title">
        <small>Client portal</small>
        <h1 className="serif">Session receipt</h1>
      </div>

      <div className="receipt-card">
        <div className="receipt-head">
          <div>
            <b className="serif">{BRAND_NAME}</b>
            <p>{PRACTITIONER_FULL}</p>
            <p>{address}</p>
          </div>
          <div className="receipt-meta">
            <p>Reference: {appointment.publicCode}</p>
            <p>Issued: {formatLocalDateTime(new Date())}</p>
          </div>
        </div>

        <dl className="receipt-lines">
          <div>
            <dt>Client</dt>
            <dd>{appointment.clientName}</dd>
          </div>
          <div>
            <dt>Session</dt>
            <dd>{appointment.service.name}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{formatLocalDateTime(appointment.startsAt)}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{appointment.service.durationMin} minutes</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>{appointment.format === "in_person" ? "In person" : "Online"}</dd>
          </div>
          <div>
            <dt>Payment method</dt>
            <dd>{appointment.packageId ? "Session package" : appointment.cashPaid ? "Cash" : "Arranged privately"}</dd>
          </div>
          <div className="receipt-total">
            <dt>Amount</dt>
            <dd>
              {appointment.packageId ? "Covered by your session package" : formatFeeCents(amountCents, appointment.service.currency)}
            </dd>
          </div>
        </dl>
      </div>

      <PrintButton />
    </section>
  );
}
