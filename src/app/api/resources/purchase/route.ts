import { NextRequest, NextResponse } from "next/server";
import { digitalResourcePurchaseRequestSchema } from "@/lib/validation";
import { createPurchase, DigitalResourceUnavailableError } from "@/lib/digital-resources";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestLocale } from "@/lib/locale-request";
import { isStripeConfigured, createCheckoutSession } from "@/lib/stripe";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`resource-purchase:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = digitalResourcePurchaseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.website) {
    return NextResponse.json({ purchaseId: "0" });
  }

  try {
    const { purchase, resource } = await createPurchase({
      resourceId: data.resourceId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      locale: getRequestLocale(request),
    });

    let checkoutUrl: string | undefined;
    if (data.payOnline && isStripeConfigured() && resource.priceCents > 0) {
      try {
        const checkout = await createCheckoutSession({
          amountCents: resource.priceCents,
          currency: resource.currency,
          description: resource.title,
          successUrl: `${siteUrl}/resources/${resource.id}?paid=1`,
          cancelUrl: `${siteUrl}/resources/${resource.id}?paymentCancelled=1`,
          customerEmail: purchase.clientEmail,
          metadata: { kind: "digital_resource_purchase", purchaseId: purchase.id },
        });
        checkoutUrl = checkout.url;
      } catch (error) {
        console.error("Failed to create Stripe checkout session for digital resource purchase:", error);
      }
    }

    // Cash purchases stay locked until the admin marks them paid — no
    // email goes out yet, so there's nothing for a client to act on
    // before payment is actually confirmed.
    if (!checkoutUrl) {
      return NextResponse.json({ purchaseId: purchase.id, awaitingPayment: true });
    }

    return NextResponse.json({ purchaseId: purchase.id, checkoutUrl });
  } catch (error) {
    if (error instanceof DigitalResourceUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Digital resource purchase failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
