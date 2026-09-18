"use client";

import { useTransition } from "react";
import { regenerateCalendarFeed } from "@/app/admin/(dashboard)/settings/actions";

export function RegenerateCalendarFeedButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="admin-btn admin-btn-outline"
      disabled={isPending}
      onClick={() => {
        if (
          !window.confirm(
            "Regenerate the calendar feed link? Any calendar app already subscribed to the old link will stop receiving updates.",
          )
        ) {
          return;
        }
        startTransition(async () => {
          await regenerateCalendarFeed();
        });
      }}
    >
      {isPending ? "Regenerating…" : "Regenerate link"}
    </button>
  );
}
