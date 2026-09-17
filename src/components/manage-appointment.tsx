"use client";

import { useEffect, useMemo, useState } from "react";

type Details = {
  publicCode: string;
  status: string;
  format: string;
  startsAt: string;
  service: { name: string; durationMin: number };
};

type Slot = { startUtc: string; label: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled_by_client: "Cancelled",
  cancelled_by_practitioner: "Cancelled",
  no_show: "Marked as no-show",
};

export function ManageAppointment({ token }: { token: string }) {
  const [details, setDetails] = useState<Details | null | "not_found">(null);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/manage/${token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setDetails)
      .catch(() => setDetails("not_found"));
  }, [token]);

  const canAct = details && details !== "not_found" &&
    (details.status === "pending" || details.status === "confirmed");

  const dateOptions = useMemo(() => {
    const options: string[] = [];
    const start = new Date();
    for (let i = 0; i < 21; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      options.push(d.toISOString().slice(0, 10));
    }
    return options;
  }, []);

  async function handleCancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/${token}/cancel`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error);
        return;
      }
      setDetails((prev) => (prev && prev !== "not_found" ? { ...prev, status: "cancelled_by_client" } : prev));
      setMessage("Your appointment has been cancelled.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReschedule(startUtc: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startUtc }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error);
        return;
      }
      setDetails((prev) => (prev && prev !== "not_found" ? { ...prev, startsAt: json.startsAt } : prev));
      setMode("view");
      setMessage("Your appointment has been rescheduled.");
    } finally {
      setBusy(false);
    }
  }

  if (details === null) return <p>Loading…</p>;
  if (details === "not_found") {
    return <p>This link is invalid or has expired. Please contact us if you need help.</p>;
  }

  return (
    <div className="booking-panel">
      <dl className="review-summary">
        <div>
          <dt>Reference</dt>
          <dd>{details.publicCode}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{STATUS_LABEL[details.status] ?? details.status}</dd>
        </div>
        <div>
          <dt>Session</dt>
          <dd>{details.service.name}</dd>
        </div>
        <div>
          <dt>When</dt>
          <dd>
            {new Date(details.startsAt).toLocaleString("en-GB", {
              timeZone: "Europe/Brussels",
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            (Brussels time)
          </dd>
        </div>
      </dl>

      {message && <p role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {canAct && mode === "view" && (
        <div className="step-actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="button button-outline" onClick={() => setMode("reschedule")}>
            Reschedule
          </button>
          <button type="button" className="button" onClick={handleCancel} disabled={busy}>
            Cancel appointment
          </button>
        </div>
      )}

      {canAct && mode === "reschedule" && (
        <RescheduleSlotPicker
          token={token}
          dateOptions={dateOptions}
          dateISO={dateISO}
          setDateISO={setDateISO}
          slots={slots}
          setSlots={setSlots}
          loadingSlots={loadingSlots}
          setLoadingSlots={setLoadingSlots}
          onConfirm={handleReschedule}
          onCancel={() => setMode("view")}
          busy={busy}
        />
      )}
    </div>
  );
}

function RescheduleSlotPicker({
  token,
  dateOptions,
  dateISO,
  setDateISO,
  slots,
  setSlots,
  loadingSlots,
  setLoadingSlots,
  onConfirm,
  onCancel,
  busy,
}: {
  token: string;
  dateOptions: string[];
  dateISO: string | null;
  setDateISO: (d: string) => void;
  slots: Slot[];
  setSlots: (s: Slot[]) => void;
  loadingSlots: boolean;
  setLoadingSlots: (v: boolean) => void;
  onConfirm: (startUtc: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<Slot | null>(null);

  async function pickDate(date: string) {
    setDateISO(date);
    setSelected(null);
    setLoadingSlots(true);
    setSlots([]);
    try {
      const res = await fetch(`/api/manage/${token}/slots?date=${date}`);
      const json = await res.json();
      setSlots(json.slots ?? []);
    } finally {
      setLoadingSlots(false);
    }
  }

  return (
    <div>
      <div className="date-chip-row" role="listbox" aria-label="Choose a new date">
        {dateOptions.map((d) => (
          <button
            key={d}
            type="button"
            className={`date-chip ${dateISO === d ? "is-selected" : ""}`}
            onClick={() => pickDate(d)}
          >
            <span className="serif">{d.slice(8, 10)}</span>
            <span>{d.slice(5, 7)}</span>
          </button>
        ))}
      </div>
      {dateISO && (
        <div className="time-slot-grid">
          {loadingSlots && <p>Loading…</p>}
          {!loadingSlots && slots.length === 0 && <p>No times available that day.</p>}
          {!loadingSlots &&
            slots.map((slot) => (
              <button
                key={slot.startUtc}
                type="button"
                className={`time-slot ${selected?.startUtc === slot.startUtc ? "is-selected" : ""}`}
                onClick={() => setSelected(slot)}
              >
                {slot.label}
              </button>
            ))}
        </div>
      )}
      <div className="step-actions">
        <button type="button" className="button button-outline" onClick={onCancel}>
          Back
        </button>
        <button
          type="button"
          className="button"
          disabled={!selected || busy}
          onClick={() => selected && onConfirm(selected.startUtc)}
        >
          Confirm new time
        </button>
      </div>
    </div>
  );
}
