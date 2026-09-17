import { cookies } from "next/headers";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return LOCALES.includes(value as Locale) ? (value as Locale) : "en";
}
