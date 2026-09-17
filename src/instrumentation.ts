// Starts the day-before reminder-email scheduler once when the server
// process boots. This app runs as a single long-lived Node process (Render
// web service), so a plain interval is the simplest correct approach — no
// external cron service needed. See src/lib/reminders.ts for the logic that
// makes repeated/overlapping runs safe.
const POLL_INTERVAL_MS = 15 * 60 * 1000;

declare global {
  var __reminderSchedulerStarted: boolean | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.NODE_ENV === "test") return;
  if (globalThis.__reminderSchedulerStarted) return; // avoid duplicate intervals on dev hot-reload
  globalThis.__reminderSchedulerStarted = true;

  const { sendDueReminders } = await import("@/lib/reminders");

  const run = () => {
    sendDueReminders().catch((error) => {
      console.error("Reminder scheduler run failed:", error);
    });
  };

  run();
  setInterval(run, POLL_INTERVAL_MS);
}
