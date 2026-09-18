import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCalendarFeedIcs } from "@/lib/calendar-feed";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const admin = await prisma.adminUser.findUnique({ where: { calendarFeedToken: token } });
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const appointments = await prisma.appointment.findMany({
    where: {
      startsAt: { gte: sevenDaysAgo },
      status: { notIn: ["cancelled_by_client", "cancelled_by_practitioner"] },
    },
    include: { service: true },
    orderBy: { startsAt: "asc" },
  });

  const ics = buildCalendarFeedIcs(appointments);
  if (!ics) {
    return NextResponse.json({ error: "Could not build calendar feed" }, { status: 500 });
  }

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="novaturientbeauty-schedule.ics"',
      // Calendar apps poll this URL themselves — let them decide the
      // interval instead of aggressively caching an ever-changing schedule.
      "Cache-Control": "no-store",
    },
  });
}
