"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/admin/(dashboard)/settings/actions";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; ok?: boolean }, formData: FormData) => changePassword(formData),
    {},
  );

  return (
    <form action={formAction}>
      <div className="admin-field">
        <label>Current password</label>
        <input type="password" name="currentPassword" autoComplete="current-password" required />
      </div>
      <div className="admin-field">
        <label>New password (min. 10 characters)</label>
        <input type="password" name="newPassword" autoComplete="new-password" minLength={10} required />
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.ok && <p role="status">Password updated.</p>}
      <div className="admin-form-actions">
        <button className="admin-btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
