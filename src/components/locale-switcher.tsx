"use client";

import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_LABELS, t, type Locale } from "@/lib/i18n";
import { setLocaleCookie } from "@/lib/locale-client";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    router.refresh();
  }

  return (
    <span aria-label={t(locale, "language_label")}>
      {LOCALES.map((l, i) => (
        <span key={l}>
          {i > 0 && " · "}
          <button
            type="button"
            className="locale-btn"
            aria-current={l === locale ? "true" : undefined}
            onClick={() => choose(l)}
          >
            {LOCALE_LABELS[l]}
          </button>
        </span>
      ))}
    </span>
  );
}
