import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getClientDataExport } from "@/lib/client-data";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const payload = await getClientDataExport(email);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="client-data-${email}.json"`,
    },
  });
}
