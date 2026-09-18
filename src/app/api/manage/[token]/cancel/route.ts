import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowUtc, minutesBetween, utcToLocalDateISO } from "@/lib/timezone";
import { rateLimit } from "@/lib/rate-limit";
import { notifyWaitlistForOpening } from "@/lib/waitlist";
import { releasePackageSession } from "@/lib/packages";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`manage:${ip}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const appointment = await prisma.appointment.findUnique({ where: { manageToken: token } });
  if (!appointment || appointment.manageTokenExp < nowUtc()) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  }
  if (appointment.status === "cancelled_by_client" || appointment.status === "cancelled_by_practitioner") {
    return NextResponse.json({ error: "This appointment is already cancelled." }, { status: 400 });
  }
  if (appointment.status === "completed") {
    return NextResponse.json({ error: "This appointment has already taken place." }, { status: 400 });
  }

  const settings = await prisma.schedulingSettings.findFirst();
  const cutoff = settings?.cancellationCutoffMinutes ?? 1440;
  const isLate = minutesBetween(nowUtc(), appointment.startsAt) < cutoff;

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "cancelled_by_client" },
    }),
    prisma.auditEvent.create({
      data: {
        action: "appointment.status_changed",
        appointmentId: appointment.id,
        metadata: JSON.stringify({ status: "cancelled_by_client", isLate }),
      },
    }),
  ]);

  // Best-effort: a waitlist notification failing should never make an
  // otherwise-successful cancellation look like it failed to the client.
  try {
    await notifyWaitlistForOpening({
      serviceId: appointment.serviceId,
      format: appointment.format as "in_person" | "online",
      date: utcToLocalDateISO(appointment.startsAt),
    });
  } catch (error) {
    console.error("Failed to notify waitlist after cancellation:", error);
  }

  if (appointment.packageId) {
    try {
      await releasePackageSession(appointment.packageId);
    } catch (error) {
      console.error("Failed to release package session after cancellation:", error);
    }
  }

  return NextResponse.json({ ok: true, isLate });
}
