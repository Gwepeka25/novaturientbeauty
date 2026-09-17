import { NextRequest, NextResponse } from "next/server";
import { bookingRequestSchema } from "@/lib/validation";
import { createAppointment, SlotUnavailableError } from "@/lib/booking";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { formatLocalDateTime } from "@/lib/timezone";

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`book:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.website) {
    // Honeypot tripped — pretend success without creating anything or
    // revealing that spam detection happened.
    return NextResponse.json({ publicCode: "NB-0000000", startsAt: data.startUtc });
  }

  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "That service is not available." }, { status: 400 });
  }
  if (service.format !== "both" && service.format !== data.format) {
    return NextResponse.json(
      { error: "That format is not available for this service." },
      { status: 400 },
    );
  }

  try {
    const appointment = await createAppointment({
      serviceId: data.serviceId,
      format: data.format,
      startUtc: new Date(data.startUtc),
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      clientNote: data.clientNote,
    });

    await sendBookingConfirmationEmail({
      publicCode: appointment.publicCode,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      manageToken: appointment.manageToken,
      clientEmail: appointment.clientEmail,
      clientName: appointment.clientName,
    });

    return NextResponse.json({
      publicCode: appointment.publicCode,
      startsAtLabel: formatLocalDateTime(appointment.startsAt),
    });
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Booking failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
