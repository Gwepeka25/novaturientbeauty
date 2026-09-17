"use client";

import { useActionState } from "react";
import { submitReviewAction } from "@/app/reviews/write/[token]/actions";

export function ReviewSubmitForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(submitReviewAction, {});

  if (state.ok) {
    return (
      <div className="booking-panel" role="status">
        <div className="eyebrow">Thank you</div>
        <h2 className="serif">Your review has been received.</h2>
        <p>
          It will be reviewed before anything is published, and only ever shown if you consented
          to that. You can reply to your confirmation email at any time to ask for it to be
          withdrawn.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="booking-panel">
      <input type="hidden" name="token" value={token} />
      <div className="form-field">
        <label htmlFor="body">Your review</label>
        <textarea id="body" name="body" rows={5} maxLength={1000} required />
      </div>

      <fieldset style={{ marginBottom: 18 }}>
        <legend style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
          If published, how should you be identified?
        </legend>
        <div style={{ display: "grid", gap: 8 }}>
          <label className="admin-row" style={{ gap: 8 }}>
            <input type="radio" name="displayNameMode" value="first_name" />
            First name only
          </label>
          <label className="admin-row" style={{ gap: 8 }}>
            <input type="radio" name="displayNameMode" value="initials" />
            Initials only
          </label>
          <label className="admin-row" style={{ gap: 8 }}>
            <input type="radio" name="displayNameMode" value="anonymous" defaultChecked />
            Fully anonymous
          </label>
        </div>
      </fieldset>

      <label className="admin-row" style={{ gap: 8, marginBottom: 20 }}>
        <input type="checkbox" name="consentPublic" />
        I consent to this review being published on the website. Unchecked, this is shared
        privately with Michelle only.
      </label>

      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
