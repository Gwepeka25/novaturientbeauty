import type { NextRequest } from "next/server";
import { LOCALES, LOCALE_COOKIE } from "@/lib/i18n";

/** Reads the client's chosen locale from the request cookie, for API routes. */
export function getRequestLocale(request: NextRequest): string {
  const value = request.cookies.get(LOCALE_COOKIE)?.value;
  return value && (LOCALES as readonly string[]).includes(value) ? value : "en";
}
