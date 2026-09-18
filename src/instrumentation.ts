// Starts the day-before reminder-email and lapsed-client re-engagement
// schedulers once when the server process boots. This app runs as a single
// long-lived Node process (Render web service), so a plain interval is the
// simplest correct approach — no external cron service needed. See
// src/lib/reminders.ts and src/lib/reengagement.ts for the logic that makes
// repeated/overlapping runs safe.
const REMINDER_POLL_INTERVAL_MS = 15 * 60 * 1000;
// Lapsed-client status doesn't change minute to minute, so this runs far
// less often than the reminder job.
const REENGAGEMENT_POLL_INTERVAL_MS = 24 * 60 * 60 * 1000;

declare global {
  var __reminderSchedulerStarted: boolean | undefined;
  var __reengagementSchedulerStarted: boolean | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.NODE_ENV === "test") return;

  if (!globalThis.__reminderSchedulerStarted) {
    globalThis.__reminderSchedulerStarted = true; // avoid duplicate intervals on dev hot-reload

    const { sendDueReminders } = await import("@/lib/reminders");
    const run = () => {
      sendDueReminders().catch((error) => {
        console.error("Reminder scheduler run failed:", error);
      });
    };
    run();
    setInterval(run, REMINDER_POLL_INTERVAL_MS);
  }

  if (!globalThis.__reengagementSchedulerStarted) {
    globalThis.__reengagementSchedulerStarted = true;

    const { sendDueReengagementEmails } = await import("@/lib/reengagement");
    const run = () => {
      sendDueReengagementEmails().catch((error) => {
        console.error("Re-engagement scheduler run failed:", error);
      });
    };
    run();
    setInterval(run, REENGAGEMENT_POLL_INTERVAL_MS);
  }
}
