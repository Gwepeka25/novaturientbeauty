import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nowUtc } from "@/lib/timezone";
import { isSlotStillAvailable } from "@/lib/availability";
import { rateLimit } from "@/lib/rate-limit";
import { isTransactionContentionError } from "@/lib/booking";
import { acquireBookingLock } from "@/lib/db-lock";

const schema = z.object({ startUtc: z.string().datetime() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`manage:${ip}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please choose a valid time." }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { manageToken: token },
    include: { service: true },
  });
  if (!appointment || appointment.manageTokenExp < nowUtc()) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  }
  if (appointment.status !== "pending" && appointment.status !== "confirmed") {
    return NextResponse.json(
      { error: "This appointment can no longer be rescheduled." },
      { status: 400 },
    );
  }

  const newStart = new Date(parsed.data.startUtc);
  const available = await isSlotStillAvailable(appointment.serviceId, newStart, appointment.id);
  if (!available) {
    return NextResponse.json(
      { error: "That time is no longer available. Please choose another." },
      { status: 409 },
    );
  }

  const newEnd = new Date(newStart.getTime() + appointment.service.durationMin * 60_000);

  const updated = await prisma
    .$transaction(
      async (tx) => {
        await acquireBookingLock(tx);

        const conflict = await tx.appointment.findFirst({
          where: {
            id: { not: appointment.id },
            status: { in: ["pending", "confirmed"] },
            startsAt: { lt: newEnd },
            endsAt: { gt: newStart },
          },
        });
        if (conflict) throw new Error("SLOT_TAKEN");

        const result = await tx.appointment.update({
          where: { id: appointment.id },
          data: { startsAt: newStart, endsAt: newEnd },
        });
        await tx.auditEvent.create({
          data: {
            action: "appointment.rescheduled",
            appointmentId: appointment.id,
            metadata: JSON.stringify({ from: appointment.startsAt, to: newStart }),
          },
        });
        return result;
      },
      // See src/lib/db-lock.ts for why this needs the advisory lock: the
      // same check-then-write race as new bookings applies here.
      { maxWait: 10_000, timeout: 10_000 },
    )
    .catch((error) => {
      if (error instanceof Error && error.message === "SLOT_TAKEN") return null;
      if (isTransactionContentionError(error)) return null;
      throw error;
    });

  if (!updated) {
    return NextResponse.json(
      { error: "That time is no longer available. Please choose another." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, startsAt: updated.startsAt.toISOString() });
}
