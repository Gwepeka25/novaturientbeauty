import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowUtc } from "@/lib/timezone";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { manageToken: token },
    include: { service: true },
  });

  if (!appointment || appointment.manageTokenExp < nowUtc()) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  }

  return NextResponse.json({
    publicCode: appointment.publicCode,
    status: appointment.status,
    format: appointment.format,
    startsAt: appointment.startsAt.toISOString(),
    service: { name: appointment.service.name, durationMin: appointment.service.durationMin },
  });
}
