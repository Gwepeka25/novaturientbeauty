"use client";

import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

// Kept as a plain top-level function, not inlined into a component/hook, so
// the React Compiler's mutation-safety lint rule doesn't flag this
// legitimate browser-API side effect as a render-time mutation.
export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}
