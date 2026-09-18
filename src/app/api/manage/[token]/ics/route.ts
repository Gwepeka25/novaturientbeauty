import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowUtc } from "@/lib/timezone";
import { buildAppointmentIcs } from "@/lib/ics";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const appointment = await prisma.appointment.findUnique({ where: { manageToken: token } });

  if (!appointment || appointment.manageTokenExp < nowUtc()) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  }

  const ics = buildAppointmentIcs(appointment);
  if (!ics) {
    return NextResponse.json({ error: "Could not build calendar file" }, { status: 500 });
  }

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="appointment.ics"',
    },
  });
}
