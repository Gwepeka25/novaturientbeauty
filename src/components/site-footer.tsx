"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="site-footer wrap">
      <span>Michelle Ihirwe · Novaturient Beauty</span>
      <nav aria-label="Footer">
        <Link href="/privacy">Privacy</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/terms">Cancellation policy</Link>
        <Link href="/reviews#leave-a-review">Leave a review</Link>
      </nav>
    </footer>
  );
}
