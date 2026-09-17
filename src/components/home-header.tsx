"use client";

import Link from "next/link";
import { useState } from "react";
import { BRAND_NAME, PRACTITIONER_FULL } from "@/lib/site-config";
import { t, type Locale } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function HomeHeader({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);

  const NAV_LINKS = [
    { href: "/about", label: t(locale, "nav_about") },
    { href: "/sessions", label: t(locale, "nav_sessions") },
    { href: "/reviews", label: t(locale, "nav_reviews") },
    { href: "/contact", label: t(locale, "nav_contact") },
  ];
  const PAGE_ANCHORS = [
    { href: "#ps-process", label: t(locale, "nav_what_to_expect") },
    { href: "#ps-fees", label: t(locale, "nav_fees") },
  ];

  return (
    <header className="hero-header wrap" style={{ position: "relative" }}>
      <Link className="brand" href="/">
        <b className="serif">{BRAND_NAME}</b>
        <small>{PRACTITIONER_FULL}</small>
      </Link>

      <nav className="site-nav" aria-label="Primary">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        {PAGE_ANCHORS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>

      <div className="header-right">
        <LocaleSwitcher locale={locale} />
        <Link className="button" href="/book">
          {t(locale, "nav_book")}
        </Link>
        <button
          type="button"
          className="mobile-nav-toggle"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            {open ? (
              <path d="M2 2 L16 16 M16 2 L2 16" stroke="currentColor" strokeWidth="1.6" fill="none" />
            ) : (
              <path d="M1 4 H17 M1 9 H17 M1 14 H17" stroke="currentColor" strokeWidth="1.4" fill="none" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          {PAGE_ANCHORS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
