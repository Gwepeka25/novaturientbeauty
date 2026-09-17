import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";
import { formatLocalTime, nowUtc } from "@/lib/timezone";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({ where: { manageToken: token } });
  if (!appointment || appointment.manageTokenExp < nowUtc()) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  }

  const slots = await getAvailableSlots(
    date,
    appointment.serviceId,
    appointment.format as "in_person" | "online",
    appointment.id,
  );
  return NextResponse.json({
    slots: slots.map((s) => ({ startUtc: s.startUtc.toISOString(), label: formatLocalTime(s.startUtc) })),
  });
}
