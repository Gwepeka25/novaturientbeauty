import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { constructWebhookEvent } from "@/lib/stripe";
import { markAppointmentPaidOnline } from "@/lib/booking";
import { markWorkshopRegistrationPaidOnline } from "@/lib/workshops";
import { markPurchasePaidOnline } from "@/lib/digital-resources";
import { sendDigitalResourceDownloadReadyEmail } from "@/lib/email";

// This route's fulfillment logic is deliberately idempotent (see
// markAppointmentPaidOnline) — Stripe retries webhook deliveries that
// don't return 2xx quickly, and the same event can legitimately arrive
// more than once.
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const kind = session.metadata?.kind;

    try {
      if (kind === "appointment" && session.metadata?.appointmentId) {
        await markAppointmentPaidOnline(session.metadata.appointmentId, session.id);
      } else if (kind === "workshop_registration" && session.metadata?.registrationId) {
        await markWorkshopRegistrationPaidOnline(session.metadata.registrationId, session.id);
      } else if (kind === "digital_resource_purchase" && session.metadata?.purchaseId) {
        const unlocked = await markPurchasePaidOnline(session.metadata.purchaseId, session.id);
        if (unlocked) {
          await sendDigitalResourceDownloadReadyEmail({
            clientEmail: unlocked.clientEmail,
            clientName: unlocked.clientName,
            resourceTitle: unlocked.resource.title,
            downloadToken: unlocked.downloadToken,
            locale: unlocked.locale,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fulfill Stripe checkout session:", session.id, error);
      return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
