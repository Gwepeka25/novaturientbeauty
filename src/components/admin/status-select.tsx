"use client";

import { useState, useTransition } from "react";
import { updateAppointmentStatus } from "@/app/admin/(dashboard)/appointments/actions";

const STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled_by_client",
  "cancelled_by_practitioner",
  "no_show",
];

export function StatusSelect({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: string;
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        startTransition(async () => {
          await updateAppointmentStatus(appointmentId, next);
        });
      }}
      aria-label="Appointment status"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
