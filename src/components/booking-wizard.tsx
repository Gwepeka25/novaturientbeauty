"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatFeeCents } from "@/lib/services-data";

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

const STEP_LABELS: Record<Step, string> = {
  format: "Format",
  service: "Service",
  datetime: "Date & time",
  details: "Your details",
  review: "Review",
  success: "Done",
};
const STEP_ORDER: Step[] = ["format", "service", "datetime", "details", "review"];

export function BookingWizard({
  services,
  minDate,
  maxDate,
}: {
  services: Service[];
  minDate: string;
  maxDate: string;
}) {
  const [step, setStep] = useState<Step>("format");
  const [format, setFormat] = useState<"in_person" | "online" | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

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

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const availableServices = useMemo(
    () => services.filter((s) => s.format === "both" || s.format === format),
    [services, format],
  );

  const dateOptions = useMemo(() => buildDateOptions(minDate, maxDate), [minDate, maxDate]);

  async function loadSlots(date: string) {
    if (!service) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await fetch(`/api/availability?date=${date}&serviceId=${service.id}`);
      const json = await res.json();
      setSlots(json.slots ?? []);
    } finally {
      setSlotsLoading(false);
    }
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

  if (step === "success" && confirmation) {
    return (
      <div className="booking-panel" role="status" aria-live="polite">
        <div className="eyebrow">Booked</div>
        <h2 className="serif">Your session is confirmed.</h2>
        <p>
          {confirmation.startsAtLabel} (Brussels time). Reference{" "}
          <strong>{confirmation.publicCode}</strong>.
        </p>
        <p>
          We&rsquo;ve sent a confirmation to your email with a private link to
          reschedule or cancel if you need to.
        </p>
        <Link className="button" href="/">
          Back to home
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
          <legend className="serif step-heading">How would you like to meet?</legend>
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
              <span className="serif">In person</span>
              <span>Rue Amélie Gomand 45, Jette</span>
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
              <span className="serif">Online</span>
              <span>A private video session</span>
            </button>
          </div>
        </fieldset>
      )}

      {step === "service" && format && (
        <fieldset>
          <legend className="serif step-heading">Choose a session type</legend>
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
                  {formatFeeCents(s.priceCents, s.currency)} · {s.durationMin} min
                </span>
              </button>
            ))}
          </div>
          <div className="step-actions">
            <button type="button" className="button button-outline" onClick={() => setStep("format")}>
              Back
            </button>
            <button
              type="button"
              className="button"
              disabled={!serviceId}
              onClick={() => setStep("datetime")}
            >
              Continue
            </button>
          </div>
        </fieldset>
      )}

      {step === "datetime" && service && (
        <fieldset>
          <legend className="serif step-heading">Choose a date and time</legend>
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
                  void loadSlots(d.iso);
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
                <p>No times available that day. Please choose another date.</p>
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
              Back
            </button>
            <button
              type="button"
              className="button"
              disabled={!selectedSlot}
              onClick={() => setStep("details")}
            >
              Continue
            </button>
          </div>
        </fieldset>
      )}

      {step === "details" && (
        <fieldset>
          <legend className="serif step-heading">Your details</legend>
          <div className="form-field">
            <label htmlFor="clientName">Name</label>
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
            <label htmlFor="clientEmail">Email</label>
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
            <label htmlFor="clientPhone">Phone (optional)</label>
            <input
              id="clientPhone"
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div className="form-field">
            <label htmlFor="clientNote">Anything you&rsquo;d like to add? (optional)</label>
            <textarea
              id="clientNote"
              rows={3}
              maxLength={600}
              value={clientNote}
              onChange={(e) => setClientNote(e.target.value)}
            />
          </div>
          <div className="honeypot-field" aria-hidden="true">
            <label htmlFor="website">Leave this field empty</label>
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
              Back
            </button>
            <button
              type="button"
              className="button"
              disabled={!clientName.trim() || !clientEmail.trim()}
              onClick={() => setStep("review")}
            >
              Continue
            </button>
          </div>
        </fieldset>
      )}

      {step === "review" && service && selectedSlot && format && (
        <div>
          <h2 className="serif step-heading">Review &amp; confirm</h2>
          <dl className="review-summary">
            <div>
              <dt>Format</dt>
              <dd>{format === "in_person" ? "In person · Rue Amélie Gomand 45, Jette" : "Online"}</dd>
            </div>
            <div>
              <dt>Session</dt>
              <dd>
                {service.name} · {formatFeeCents(service.priceCents, service.currency)} ·{" "}
                {service.durationMin} min
              </dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>{formatSlotForReview(selectedSlot.startUtc)} (Brussels time)</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                {clientName} · {clientEmail}
              </dd>
            </div>
          </dl>

          <div className="cash">
            Payment is by cash at your in-person session. Online-session
            arrangements are confirmed privately after booking.
          </div>

          <p className="review-legal">
            By confirming, you agree to our{" "}
            <Link href="/terms">cancellation policy</Link> and{" "}
            <Link href="/privacy">privacy policy</Link>.
          </p>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="step-actions">
            <button type="button" className="button button-outline" onClick={() => setStep("details")}>
              Back
            </button>
            <button type="button" className="button button-rust" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Confirming…" : "Confirm booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSlotForReview(startUtc: string): string {
  return new Date(startUtc).toLocaleString("en-GB", {
    timeZone: "Europe/Brussels",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildDateOptions(minDate: string, maxDate: string) {
  const options: { iso: string; weekday: string; day: string; month: string }[] = [];
  const start = new Date(`${minDate}T00:00:00`);
  const end = new Date(`${maxDate}T00:00:00`);
  const cursor = new Date(start);
  while (cursor <= end && options.length < 21) {
    const iso = cursor.toISOString().slice(0, 10);
    options.push({
      iso,
      weekday: cursor.toLocaleDateString("en-GB", { weekday: "short" }),
      day: cursor.toLocaleDateString("en-GB", { day: "numeric" }),
      month: cursor.toLocaleDateString("en-GB", { month: "short" }),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return options;
}
