"use client";

import { useState } from "react";

export function WorkshopRegistrationForm({
  workshopId,
  stripeEnabled,
  soldOut,
}: {
  workshopId: string;
  stripeEnabled: boolean;
  soldOut: boolean;
}) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(payOnline: boolean) {
    if (!clientName.trim() || !clientEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/workshops/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workshopId, clientName, clientEmail, clientPhone, payOnline, website }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (soldOut) {
    return <p>This workshop is fully booked.</p>;
  }

  if (done) {
    return (
      <div className="booking-panel" role="status" aria-live="polite">
        <div className="eyebrow">Registered</div>
        <h2 className="serif">You&rsquo;re on the list.</h2>
        <p>We&rsquo;ve sent a confirmation to your email with a link to cancel if you need to.</p>
      </div>
    );
  }

  return (
    <div className="booking-panel">
      <div className="form-field">
        <label htmlFor="workshopClientName">Name</label>
        <input
          id="workshopClientName"
          type="text"
          required
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="form-field">
        <label htmlFor="workshopClientEmail">Email</label>
        <input
          id="workshopClientEmail"
          type="email"
          required
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div className="form-field">
        <label htmlFor="workshopClientPhone">Phone (optional)</label>
        <input
          id="workshopClientPhone"
          type="tel"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          autoComplete="tel"
        />
      </div>
      <div className="honeypot-field" aria-hidden="true">
        <label htmlFor="workshopWebsite">Leave this field empty</label>
        <input
          id="workshopWebsite"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="step-actions">
        {stripeEnabled && (
          <button
            type="button"
            className="button button-outline"
            disabled={submitting || !clientName.trim() || !clientEmail.trim()}
            onClick={() => handleSubmit(true)}
          >
            {submitting ? "Registering…" : "Pay online now"}
          </button>
        )}
        <button
          type="button"
          className="button"
          disabled={submitting || !clientName.trim() || !clientEmail.trim()}
          onClick={() => handleSubmit(false)}
        >
          {submitting ? "Registering…" : stripeEnabled ? "Register & pay in person" : "Register"}
        </button>
      </div>
    </div>
  );
}
