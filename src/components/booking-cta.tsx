import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";

export function BookingCTA({
  locale,
  eyebrow,
  heading,
  body,
  ctaLabel,
}: {
  locale: Locale;
  eyebrow?: string;
  heading?: string;
  body?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="wrap final">
      <span className="eyebrow">{eyebrow ?? t(locale, "cta_default_eyebrow")}</span>
      <h2 className="serif">{heading ?? t(locale, "cta_default_heading")}</h2>
      <p>{body ?? t(locale, "cta_default_body")}</p>
      <Link className="button" href="/book">
        {ctaLabel ?? t(locale, "cta_default_label")}
      </Link>
    </section>
  );
}
