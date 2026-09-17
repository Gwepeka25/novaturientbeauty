import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";
import { formatLocalTime } from "@/lib/timezone";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";
  const serviceId = searchParams.get("serviceId") ?? "";
  const format = searchParams.get("format") ?? "";

  if (!DATE_RE.test(date) || !serviceId || (format !== "in_person" && format !== "online")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const slots = await getAvailableSlots(date, serviceId, format);

  return NextResponse.json({
    slots: slots.map((s) => ({
      startUtc: s.startUtc.toISOString(),
      label: formatLocalTime(s.startUtc),
    })),
  });
}
