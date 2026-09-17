"use client";

import { useState, useTransition } from "react";
import { updateReviewStatus } from "@/app/admin/(dashboard)/reviews/actions";

const STATUSES = ["pending", "approved", "hidden", "rejected", "withdrawn"];

export function ReviewStatusSelect({ reviewId, status }: { reviewId: string; status: string }) {
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
          await updateReviewStatus(reviewId, next);
        });
      }}
      aria-label="Review status"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
