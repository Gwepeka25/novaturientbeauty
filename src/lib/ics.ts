import { createEvent } from "ics";
import { PRACTITIONER_NAME } from "@/lib/site-config";

export type IcsAppointment = {
  publicCode: string;
  startsAt: Date;
  endsAt: Date;
};

// Neutral title — same discretion as the emails this is attached to/linked
// from: no service/appointment type revealed in a calendar app's UI.
export function buildAppointmentIcs(appointment: IcsAppointment): string | null {
  const start = appointment.startsAt;
  const end = appointment.endsAt;
  const { error, value } = createEvent({
    title: `Appointment — ${PRACTITIONER_NAME}`,
    start: [
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate(),
      start.getUTCHours(),
      start.getUTCMinutes(),
    ],
    startInputType: "utc",
    end: [
      end.getUTCFullYear(),
      end.getUTCMonth() + 1,
      end.getUTCDate(),
      end.getUTCHours(),
      end.getUTCMinutes(),
    ],
    endInputType: "utc",
    uid: `${appointment.publicCode}@novaturientbeauty`,
  });
  if (error || !value) {
    console.error("Failed to build .ics file:", error);
    return null;
  }
  return value;
}
