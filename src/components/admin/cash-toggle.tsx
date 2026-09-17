"use client";

import { useState, useTransition } from "react";
import { toggleCashPaid } from "@/app/admin/(dashboard)/appointments/actions";

export function CashToggle({
  appointmentId,
  cashPaid,
}: {
  appointmentId: string;
  cashPaid: boolean;
}) {
  const [checked, setChecked] = useState(cashPaid);
  const [, startTransition] = useTransition();

  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          const next = e.target.checked;
          setChecked(next);
          startTransition(async () => {
            await toggleCashPaid(appointmentId, next);
          });
        }}
      />
      Paid
    </label>
  );
}
