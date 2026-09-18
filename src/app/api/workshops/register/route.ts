import { NextRequest, NextResponse } from "next/server";
import { workshopRegistrationRequestSchema } from "@/lib/validation";
import { registerForWorkshop, WorkshopUnavailableError, WorkshopFullError } from "@/lib/workshops";
import { sendWorkshopRegistrationConfirmationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestLocale } from "@/lib/locale-request";
import { isStripeConfigured, createCheckoutSession } from "@/lib/stripe";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`workshop-register:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = workshopRegistrationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.website) {
    return NextResponse.json({ registrationId: "0" });
  }

  try {
    const { registration, workshop } = await registerForWorkshop({
      workshopId: data.workshopId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      locale: getRequestLocale(request),
    });

    await sendWorkshopRegistrationConfirmationEmail({
      clientEmail: registration.clientEmail,
      clientName: registration.clientName,
      workshopTitle: workshop.title,
      startsAt: workshop.startsAt,
      format: workshop.format as "in_person" | "online",
      location: workshop.location,
      manageToken: registration.manageToken,
      locale: registration.locale,
    });

    let checkoutUrl: string | undefined;
    if (data.payOnline && isStripeConfigured() && workshop.priceCents > 0) {
      try {
        const checkout = await createCheckoutSession({
          amountCents: workshop.priceCents,
          currency: workshop.currency,
          description: workshop.title,
          successUrl: `${siteUrl}/workshops/${workshop.id}?registrationId=${registration.id}&paid=1`,
          cancelUrl: `${siteUrl}/workshops/${workshop.id}?paymentCancelled=1`,
          customerEmail: registration.clientEmail,
          metadata: { kind: "workshop_registration", registrationId: registration.id },
        });
        checkoutUrl = checkout.url;
      } catch (error) {
        console.error("Failed to create Stripe checkout session for workshop registration:", error);
      }
    }

    return NextResponse.json({ registrationId: registration.id, checkoutUrl });
  } catch (error) {
    if (error instanceof WorkshopUnavailableError || error instanceof WorkshopFullError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Workshop registration failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
