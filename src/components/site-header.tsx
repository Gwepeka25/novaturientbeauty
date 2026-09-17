"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/sessions", label: "Sessions" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <header className="site-header wrap">
      <nav className="site-nav" aria-label="Primary">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <Link className="brand" href="/">
        <b>Michelle Ihirwe</b>
        <small>Sexologist &amp; Intimacy Therapist</small>
      </Link>

      <div className="header-right">
        <span aria-hidden="true">EN · FR · NL</span>
        <Link className="button" href="/book">
          Book a session
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
              <path
                d="M2 2 L16 16 M16 2 L2 16"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
              />
            ) : (
              <path
                d="M1 4 H17 M1 9 H17 M1 14 H17"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
              />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
