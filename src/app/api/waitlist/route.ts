import { NextRequest, NextResponse } from "next/server";
import { waitlistRequestSchema } from "@/lib/validation";
import { joinWaitlist, WaitlistServiceUnavailableError } from "@/lib/waitlist";
import { rateLimit } from "@/lib/rate-limit";

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`waitlist:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = waitlistRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.website) {
    // Honeypot tripped — pretend success without creating anything.
    return NextResponse.json({ ok: true });
  }

  try {
    await joinWaitlist({
      serviceId: data.serviceId,
      format: data.format,
      date: data.date,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      note: data.note,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WaitlistServiceUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Waitlist signup failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
