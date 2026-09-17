"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_NAME, BRAND_TAGLINE, PRACTITIONER_FULL } from "@/lib/site-config";
import { t, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="site-footer wrap">
      <span>
        {BRAND_NAME} · {PRACTITIONER_FULL}
        <small style={{ display: "block" }}>{BRAND_TAGLINE}</small>
      </span>
      <nav aria-label="Footer">
        <span>Rue Amélie Gomand 45, Jette</span>
        <Link href="/privacy">{t(locale, "footer_privacy")}</Link>
        <Link href="/terms">{t(locale, "footer_terms")}</Link>
        <Link href="/contact">{t(locale, "footer_contact")}</Link>
        <Link href="/reviews">{t(locale, "footer_reviews")}</Link>
        <Link href="/portal">{t(locale, "footer_portal")}</Link>
      </nav>
    </footer>
  );
}
