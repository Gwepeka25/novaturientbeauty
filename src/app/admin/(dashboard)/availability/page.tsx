import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  updateSchedulingSettings,
  upsertAvailabilityRule,
  addAvailabilityException,
  deleteAvailabilityException,
} from "./actions";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default async function AdminAvailabilityPage() {
  await requireAdminSession();

  const [settings, rules, exceptions] = await Promise.all([
    prisma.schedulingSettings.findFirst(),
    prisma.availabilityRule.findMany({ orderBy: { weekday: "asc" } }),
    prisma.availabilityException.findMany({ orderBy: { date: "asc" } }),
  ]);

  const rulesByWeekday = new Map(rules.map((r) => [r.weekday, r]));

  return (
    <>
      <h1 className="admin-page-title">Availability</h1>
      <p className="admin-page-subtitle">
        Weekly hours, one-off blocks or extra availability, and booking policy.
      </p>

      <div className="admin-card">
        <h2>Booking policy</h2>
        <form action={updateSchedulingSettings}>
          <div className="admin-row">
            <div className="admin-field">
              <label>Minimum notice (minutes)</label>
              <input type="number" name="minNoticeMinutes" min={0} defaultValue={settings?.minNoticeMinutes ?? 1440} />
            </div>
            <div className="admin-field">
              <label>Booking horizon (days)</label>
              <input type="number" name="maxAdvanceDays" min={1} defaultValue={settings?.maxAdvanceDays ?? 60} />
            </div>
            <div className="admin-field">
              <label>Buffer before (minutes)</label>
              <input type="number" name="bufferBeforeMinutes" min={0} defaultValue={settings?.bufferBeforeMinutes ?? 0} />
            </div>
            <div className="admin-field">
              <label>Buffer after (minutes)</label>
              <input type="number" name="bufferAfterMinutes" min={0} defaultValue={settings?.bufferAfterMinutes ?? 15} />
            </div>
            <div className="admin-field">
              <label>Cancellation cutoff (minutes)</label>
              <input
                type="number"
                name="cancellationCutoffMinutes"
                min={0}
                defaultValue={settings?.cancellationCutoffMinutes ?? 1440}
              />
            </div>
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn" type="submit">
              Save policy
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2>Weekly hours</h2>
        {WEEKDAY_NAMES.map((name, weekday) => {
          const rule = rulesByWeekday.get(weekday);
          return (
            <form
              action={upsertAvailabilityRule}
              key={weekday}
              className="admin-row"
              style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}
            >
              <input type="hidden" name="weekday" value={weekday} />
              <span style={{ width: 90 }}>{name}</span>
              <label className="admin-row" style={{ gap: 6 }}>
                <input type="checkbox" name="active" defaultChecked={rule?.active ?? false} />
                Open
              </label>
              <input type="time" name="startTime" defaultValue={minutesToTime(rule?.startMinute ?? 540)} />
              <span>to</span>
              <input type="time" name="endTime" defaultValue={minutesToTime(rule?.endMinute ?? 1020)} />
              <button className="admin-btn admin-btn-outline" type="submit">
                Save
              </button>
            </form>
          );
        })}
      </div>

      <div className="admin-card">
        <h2>One-off blocks, extra availability &amp; holidays</h2>
        <form action={addAvailabilityException} className="admin-row" style={{ marginBottom: 20 }}>
          <div className="admin-field">
            <label>Date</label>
            <input type="date" name="date" required />
          </div>
          <div className="admin-field">
            <label>Type</label>
            <select name="kind">
              <option value="block">Block</option>
              <option value="extra_availability">Extra availability</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>
          <label className="admin-row" style={{ gap: 6 }}>
            <input type="checkbox" name="isFullDayBlock" />
            Full day
          </label>
          <div className="admin-field">
            <label>Start</label>
            <input type="time" name="startTime" />
          </div>
          <div className="admin-field">
            <label>End</label>
            <input type="time" name="endTime" />
          </div>
          <div className="admin-field">
            <label>Applies to</label>
            <select name="formatRestriction" defaultValue="">
              <option value="">Both formats</option>
              <option value="in_person">In person only (online stays open)</option>
              <option value="online">Online only (in-person stays open)</option>
            </select>
          </div>
          <div className="admin-field" style={{ flex: 1 }}>
            <label>Note</label>
            <input type="text" name="note" placeholder="e.g. Dentist appointment" />
          </div>
          <button className="admin-btn" type="submit">
            Add
          </button>
        </form>
        <p className="admin-field-hint">
          Use &ldquo;Applies to&rdquo; to keep one format open while blocking the other — e.g. pick
          &ldquo;In person only&rdquo; and full day for a date where you can still take online
          sessions. Clients who want in-person on that date will see it&rsquo;s unavailable and be
          offered online instead, rather than seeing nothing at all.
        </p>

        {exceptions.length === 0 ? (
          <p className="admin-empty">No exceptions scheduled.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>When</th>
                <th>Applies to</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((exception) => (
                <tr key={exception.id}>
                  <td>{exception.date}</td>
                  <td>{exception.kind.replace("_", " ")}</td>
                  <td>
                    {exception.isFullDayBlock
                      ? "Full day"
                      : exception.startMinute != null && exception.endMinute != null
                        ? `${minutesToTime(exception.startMinute)}–${minutesToTime(exception.endMinute)}`
                        : "—"}
                  </td>
                  <td>
                    {exception.formatRestriction === "in_person"
                      ? "In person only"
                      : exception.formatRestriction === "online"
                        ? "Online only"
                        : "Both formats"}
                  </td>
                  <td>{exception.note ?? "—"}</td>
                  <td>
                    <form action={deleteAvailabilityException.bind(null, exception.id)}>
                      <button className="admin-btn admin-btn-outline" type="submit">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
