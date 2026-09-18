"use client";

import { useState } from "react";

export function DigitalResourcePurchaseForm({
  resourceId,
  stripeEnabled,
}: {
  resourceId: string;
  stripeEnabled: boolean;
}) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingPayment, setAwaitingPayment] = useState(false);

  async function handleSubmit(payOnline: boolean) {
    if (!clientName.trim() || !clientEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/resources/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, clientName, clientEmail, payOnline, website }),
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
      setAwaitingPayment(true);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingPayment) {
    return (
      <div className="booking-panel" role="status" aria-live="polite">
        <div className="eyebrow">Request received</div>
        <h2 className="serif">Almost there.</h2>
        <p>
          We&rsquo;ll be in touch to arrange payment (cash or bank transfer) — your download link
          will be emailed to you as soon as that&rsquo;s confirmed.
        </p>
      </div>
    );
  }

  return (
    <div className="booking-panel">
      <div className="form-field">
        <label htmlFor="resourceClientName">Name</label>
        <input
          id="resourceClientName"
          type="text"
          required
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="form-field">
        <label htmlFor="resourceClientEmail">Email</label>
        <input
          id="resourceClientEmail"
          type="email"
          required
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div className="honeypot-field" aria-hidden="true">
        <label htmlFor="resourceWebsite">Leave this field empty</label>
        <input
          id="resourceWebsite"
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
            {submitting ? "Processing…" : "Pay online now"}
          </button>
        )}
        <button
          type="button"
          className="button"
          disabled={submitting || !clientName.trim() || !clientEmail.trim()}
          onClick={() => handleSubmit(false)}
        >
          {submitting ? "Processing…" : stripeEnabled ? "Buy & pay in person" : "Request this resource"}
        </button>
      </div>
    </div>
  );
}
