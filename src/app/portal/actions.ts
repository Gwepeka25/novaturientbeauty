"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { requestPortalLink } from "@/lib/portal-auth";
import { clearClientSessionCookie } from "@/lib/client-session";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function requestPortalLinkAction(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/portal?error=invalid_email");

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { email } = parsed.data;

  // Rate limit by IP and by email separately, same reasoning as admin login:
  // one abusive IP shouldn't lock out a real client, but brute-forcing
  // either is still throttled.
  if (!rateLimit(`portal-link-ip:${ip}`, 10, 15 * 60_000) || !rateLimit(`portal-link-email:${email}`, 3, 15 * 60_000)) {
    redirect("/portal?error=too_many");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await requestPortalLink(email, siteUrl);
  redirect("/portal?sent=1");
}

export async function portalLogoutAction() {
  await clearClientSessionCookie();
  redirect("/portal");
}
