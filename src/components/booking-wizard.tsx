"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatFeeCents } from "@/lib/services-data";
import { t, LOCALE_INTL_TAG, type Locale } from "@/lib/i18n";

type Service = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  currency: string;
  format: string; // "in_person" | "online" | "both"
};

type Slot = { startUtc: string; label: string };

type Step = "format" | "service" | "datetime" | "details" | "review" | "success";

const STEP_ORDER: Step[] = ["format", "service", "datetime", "details", "review"];

export function BookingWizard({
  locale,
  services,
  minDate,
  maxDate,
}: {
  locale: Locale;
  services: Service[];
  minDate: string;
  maxDate: string;
}) {
  const STEP_LABELS: Record<Step, string> = {
    format: t(locale, "book_step_format"),
    service: t(locale, "book_step_service"),
    datetime: t(locale, "book_step_datetime"),
    details: t(locale, "book_step_details"),
    review: t(locale, "book_step_review"),
    success: t(locale, "book_step_done"),
  };

  const [step, setStep] = useState<Step>("format");
  const [format, setFormat] = useState<"in_person" | "online" | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [altFormatAvailable, setAltFormatAvailable] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ publicCode: string; startsAtLabel: string } | null>(
    null,
  );

  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistDone, setWaitlistDone] = useState(false);

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const availableServices = useMemo(
    () => services.filter((s) => s.format === "both" || s.format === format),
    [services, format],
  );

  const dateOptions = useMemo(() => buildDateOptions(minDate, maxDate, locale), [minDate, maxDate, locale]);

  async function loadSlots(date: string, fmt: "in_person" | "online") {
    if (!service) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    setAltFormatAvailable(false);
    try {
      const res = await fetch(`/api/availability?date=${date}&serviceId=${service.id}&format=${fmt}`);
      const json = await res.json();
      const fetchedSlots: Slot[] = json.slots ?? [];
      setSlots(fetchedSlots);

      // If this format is unavailable that day but the service also
      // supports the other format, check whether that one is open — so we
      // can offer it instead of just saying "unavailable."
      if (fetchedSlots.length === 0 && service.format === "both") {
        const altFmt = fmt === "in_person" ? "online" : "in_person";
        const altRes = await fetch(`/api/availability?date=${date}&serviceId=${service.id}&format=${altFmt}`);
        const altJson = await altRes.json();
        setAltFormatAvailable((altJson.slots ?? []).length > 0);
      }
    } finally {
      setSlotsLoading(false);
    }
  }

  function switchFormat() {
    if (!format || !dateISO) return;
    const nextFormat = format === "in_person" ? "online" : "in_person";
    setFormat(nextFormat);
    void loadSlots(dateISO, nextFormat);
  }

  async function handleSubmit() {
    if (!service || !format || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          format,
          startUtc: selectedSlot.startUtc,
          clientName,
          clientEmail,
          clientPhone,
          clientNote,
          website,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      setConfirmation(json);
      setStep("success");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWaitlistJoin() {
    if (!service || !format || !dateISO) return;
    setWaitlistSubmitting(true);
    setWaitlistError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          format,
          date: dateISO,
          clientName: waitlistName,
          clientEmail: waitlistEmail,
          clientPhone: waitlistPhone,
          website,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setWaitlistError(json.error ?? t(locale, "book_waitlist_error"));
        return;
      }
      setWaitlistDone(true);
    } catch {
      setWaitlistError(t(locale, "book_waitlist_error"));
    } finally {
      setWaitlistSubmitting(false);
    }
  }

  if (step === "success" && confirmation) {
    return (
      <div className="booking-panel" role="status" aria-live="polite">
        <div className="eyebrow">{t(locale, "book_success_eyebrow")}</div>
        <h2 className="serif">{t(locale, "book_success_heading")}</h2>
        <p>
          {confirmation.startsAtLabel} ({t(locale, "book_success_timezone")}). {t(locale, "book_success_reference")}{" "}
          <strong>{confirmation.publicCode}</strong>.
        </p>
        <p>{t(locale, "book_success_body")}</p>
        <Link className="button" href="/">
          {t(locale, "book_success_home")}
        </Link>
      </div>
    );
  }

  return (
    <div className="booking-panel">
      <ol className="booking-steps" aria-label="Booking progress">
        {STEP_ORDER.map((s, i) => (
          <li key={s} aria-current={step === s ? "step" : undefined}>
            {i + 1}. {STEP_LABELS[s]}
          </li>
        ))}
      </ol>

      {step === "format" && (
        <fieldset>
          <legend className="step-heading-legend">
            <h2 className="serif step-heading">{t(locale, "book_format_heading")}</h2>
          </legend>
          <div className="choice-grid">
            <button
              type="button"
              className={`choice-card ${format === "in_person" ? "is-selected" : ""}`}
              onClick={() => {
                setFormat("in_person");
                setServiceId(null);
                setStep("service");
              }}
            >
              <span className="serif">{t(locale, "book_format_in_person")}</span>
              <span>{t(locale, "book_format_in_person_address")}</span>
            </button>
            <button
              type="button"
              className={`choice-card ${format === "online" ? "is-selected" : ""}`}
              onClick={() => {
                setFormat("online");
                setServiceId(null);
                setStep("service");
              }}
            >
              <span className="serif">{t(locale, "book_format_online")}</span>
              <span>{t(locale, "book_format_online_body")}</span>
            </button>
          </div>
        </fieldset>
      )}

      {step === "service" && format && (
        <fieldset>
          <legend className="step-heading-legend">
            <h2 className="serif step-heading">{t(locale, "book_service_heading")}</h2>
          </legend>
          <div className="choice-list">
            {availableServices.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`choice-row ${serviceId === s.id ? "is-selected" : ""}`}
                onClick={() => setServiceId(s.id)}
              >
                <span>
                  <b className="serif">{s.name}</b>
                  <small>{s.description}</small>
                </span>
                <span className="choice-row-fee">
                  {formatFeeCents(s.priceCents, s.currency)} · {s.durationMin} {t(locale, "sessions_min_suffix")}
                </span>
              </button>
            ))}
          </div>
          <div className="step-actions">
            <button type="button" className="button button-outline" onClick={() => setStep("format")}>
              {t(locale, "common_back")}
            </button>
            <button
              type="button"
              className="button"
              disabled={!serviceId}
              onClick={() => setStep("datetime")}
            >
              {t(locale, "common_continue")}
            </button>
          </div>
        </fieldset>
      )}

      {step === "datetime" && service && format && (
        <fieldset>
          <legend className="step-heading-legend">
            <h2 className="serif step-heading">{t(locale, "book_datetime_heading")}</h2>
          </legend>
          <div className="date-chip-row" role="listbox" aria-label="Choose a date">
            {dateOptions.map((d) => (
              <button
                key={d.iso}
                type="button"
                role="option"
                aria-selected={dateISO === d.iso}
                className={`date-chip ${dateISO === d.iso ? "is-selected" : ""}`}
                onClick={() => {
                  setDateISO(d.iso);
                  setWaitlistOpen(false);
                  setWaitlistDone(false);
                  setWaitlistError(null);
                  void loadSlots(d.iso, format);
                }}
              >
                <span>{d.weekday}</span>
                <span className="serif">{d.day}</span>
                <span>{d.month}</span>
              </button>
            ))}
          </div>

          {dateISO && (
            <div className="time-slot-grid" aria-live="polite">
              {slotsLoading && <p>Loading available times…</p>}
              {!slotsLoading && slots.length === 0 && (
                <div className="no-slots-message">
                  <p>{t(locale, format === "in_person" ? "book_no_slots_in_person" : "book_no_slots_online")}</p>
                  {altFormatAvailable && (
                    <p>
                      {t(locale, format === "in_person" ? "book_alt_available_online" : "book_alt_available_in_person")}{" "}
                      <button type="button" className="link-button" onClick={switchFormat}>
                        {t(locale, format === "in_person" ? "book_switch_to_online" : "book_switch_to_in_person")}
                      </button>
                    </p>
                  )}

                  {waitlistDone ? (
                    <p>{t(locale, "book_waitlist_success")}</p>
                  ) : waitlistOpen ? (
                    <div className="waitlist-form">
                      <h3 className="serif">{t(locale, "book_waitlist_heading")}</h3>
                      <div className="form-field">
                        <label htmlFor="waitlistName">{t(locale, "book_label_name")}</label>
                        <input
                          id="waitlistName"
                          type="text"
                          required
                          value={waitlistName}
                          onChange={(e) => setWaitlistName(e.target.value)}
                          autoComplete="name"
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="waitlistEmail">{t(locale, "book_label_email")}</label>
                        <input
                          id="waitlistEmail"
                          type="email"
                          required
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          autoComplete="email"
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="waitlistPhone">{t(locale, "book_label_phone")}</label>
                        <input
                          id="waitlistPhone"
                          type="tel"
                          value={waitlistPhone}
                          onChange={(e) => setWaitlistPhone(e.target.value)}
                          autoComplete="tel"
                        />
                      </div>
                      {waitlistError && <p className="form-error">{waitlistError}</p>}
                      <div className="step-actions">
                        <button type="button" className="button button-outline" onClick={() => setWaitlistOpen(false)}>
                          {t(locale, "book_waitlist_cancel")}
                        </button>
                        <button
                          type="button"
                          className="button"
                          disabled={waitlistSubmitting || !waitlistName.trim() || !waitlistEmail.trim()}
                          onClick={handleWaitlistJoin}
                        >
                          {waitlistSubmitting ? t(locale, "book_waitlist_submitting") : t(locale, "book_waitlist_submit")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p>
                      <button type="button" className="link-button" onClick={() => setWaitlistOpen(true)}>
                        {t(locale, "book_waitlist_button")}
                      </button>
                    </p>
                  )}
                </div>
              )}
              {!slotsLoading &&
                slots.map((slot) => (
                  <button
                    key={slot.startUtc}
                    type="button"
                    className={`time-slot ${selectedSlot?.startUtc === slot.startUtc ? "is-selected" : ""}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot.label}
                  </button>
                ))}
            </div>
          )}

          <div className="step-actions">
            <button type="button" className="button button-outline" onClick={() => setStep("service")}>
              {t(locale, "common_back")}
            </button>
            <button
              type="button"
              className="button"
              disabled={!selectedSlot}
              onClick={() => setStep("details")}
            >
              {t(locale, "common_continue")}
            </button>
          </div>
        </fieldset>
      )}

      {step === "details" && (
        <fieldset>
          <legend className="step-heading-legend">
            <h2 className="serif step-heading">{t(locale, "book_details_heading")}</h2>
          </legend>
          <div className="form-field">
            <label htmlFor="clientName">{t(locale, "book_label_name")}</label>
            <input
              id="clientName"
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="form-field">
            <label htmlFor="clientEmail">{t(locale, "book_label_email")}</label>
            <input
              id="clientEmail"
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="form-field">
            <label htmlFor="clientPhone">{t(locale, "book_label_phone")}</label>
            <input
              id="clientPhone"
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div className="form-field">
            <label htmlFor="clientNote">{t(locale, "book_label_note")}</label>
            <textarea
              id="clientNote"
              rows={3}
              maxLength={600}
              value={clientNote}
              onChange={(e) => setClientNote(e.target.value)}
            />
          </div>
          <div className="honeypot-field" aria-hidden="true">
            <label htmlFor="website">{t(locale, "book_label_honeypot")}</label>
            <input
              id="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div className="step-actions">
            <button type="button" className="button button-outline" onClick={() => setStep("datetime")}>
              {t(locale, "common_back")}
            </button>
            <button
              type="button"
              className="button"
              disabled={!clientName.trim() || !clientEmail.trim()}
              onClick={() => setStep("review")}
            >
              {t(locale, "common_continue")}
            </button>
          </div>
        </fieldset>
      )}

      {step === "review" && service && selectedSlot && format && (
        <div>
          <h2 className="serif step-heading">{t(locale, "book_review_heading")}</h2>
          <dl className="review-summary">
            <div>
              <dt>{t(locale, "book_review_format")}</dt>
              <dd>{t(locale, format === "in_person" ? "book_review_format_in_person" : "book_review_format_online")}</dd>
            </div>
            <div>
              <dt>{t(locale, "book_review_session")}</dt>
              <dd>
                {service.name} · {formatFeeCents(service.priceCents, service.currency)} ·{" "}
                {service.durationMin} {t(locale, "sessions_min_suffix")}
              </dd>
            </div>
            <div>
              <dt>{t(locale, "book_review_when")}</dt>
              <dd>
                {formatSlotForReview(selectedSlot.startUtc, locale)} ({t(locale, "book_success_timezone")})
              </dd>
            </div>
            <div>
              <dt>{t(locale, "book_review_contact")}</dt>
              <dd>
                {clientName} · {clientEmail}
              </dd>
            </div>
          </dl>

          <div className="cash">{t(locale, "book_review_cash_note")}</div>

          <p className="review-legal">
            {t(locale, "book_review_legal_prefix")}{" "}
            <Link href="/terms">{t(locale, "book_review_legal_cancellation")}</Link>{" "}
            {t(locale, "book_review_legal_and")}{" "}
            <Link href="/privacy">{t(locale, "book_review_legal_privacy")}</Link>.
          </p>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="step-actions">
            <button type="button" className="button button-outline" onClick={() => setStep("details")}>
              {t(locale, "common_back")}
            </button>
            <button type="button" className="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? t(locale, "book_confirming") : t(locale, "book_confirm")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSlotForReview(startUtc: string, locale: Locale): string {
  return new Date(startUtc).toLocaleString(LOCALE_INTL_TAG[locale], {
    timeZone: "Europe/Brussels",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildDateOptions(minDate: string, maxDate: string, locale: Locale) {
  const options: { iso: string; weekday: string; day: string; month: string }[] = [];
  const start = new Date(`${minDate}T00:00:00`);
  const end = new Date(`${maxDate}T00:00:00`);
  const cursor = new Date(start);
  const tag = LOCALE_INTL_TAG[locale];
  while (cursor <= end && options.length < 21) {
    const iso = cursor.toISOString().slice(0, 10);
    options.push({
      iso,
      weekday: cursor.toLocaleDateString(tag, { weekday: "short" }),
      day: cursor.toLocaleDateString(tag, { day: "numeric" }),
      month: cursor.toLocaleDateString(tag, { month: "short" }),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return options;
}
