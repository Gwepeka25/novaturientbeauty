import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { constructWebhookEvent } from "@/lib/stripe";
import { markAppointmentPaidOnline } from "@/lib/booking";

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
      }
      // Other kinds (workshop registrations, digital resource purchases)
      // register their own fulfillment as those features are built.
    } catch (error) {
      console.error("Failed to fulfill Stripe checkout session:", session.id, error);
      return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
