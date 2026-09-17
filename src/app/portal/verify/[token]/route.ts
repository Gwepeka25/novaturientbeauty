import { NextRequest, NextResponse } from "next/server";
import { verifyPortalToken } from "@/lib/portal-auth";
import { createClientSessionCookie } from "@/lib/client-session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const email = await verifyPortalToken(token);

  const url = new URL("/portal", request.url);
  if (!email) {
    url.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(url);
  }

  await createClientSessionCookie({ email });
  return NextResponse.redirect(url);
}
