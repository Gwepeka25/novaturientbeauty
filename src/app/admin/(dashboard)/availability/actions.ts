"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

const settingsSchema = z.object({
  minNoticeMinutes: z.coerce.number().int().min(0),
  maxAdvanceDays: z.coerce.number().int().min(1),
  bufferBeforeMinutes: z.coerce.number().int().min(0),
  bufferAfterMinutes: z.coerce.number().int().min(0),
  cancellationCutoffMinutes: z.coerce.number().int().min(0),
});

export async function updateSchedulingSettings(formData: FormData) {
  await requireAdminSession();
  const parsed = settingsSchema.parse({
    minNoticeMinutes: formData.get("minNoticeMinutes"),
    maxAdvanceDays: formData.get("maxAdvanceDays"),
    bufferBeforeMinutes: formData.get("bufferBeforeMinutes"),
    bufferAfterMinutes: formData.get("bufferAfterMinutes"),
    cancellationCutoffMinutes: formData.get("cancellationCutoffMinutes"),
  });

  const existing = await prisma.schedulingSettings.findFirst();
  if (existing) {
    await prisma.schedulingSettings.update({ where: { id: existing.id }, data: parsed });
  } else {
    await prisma.schedulingSettings.create({ data: parsed });
  }
  revalidatePath("/admin/availability");
}

const ruleSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  active: z.coerce.boolean(),
  startMinute: z.coerce.number().int().min(0).max(1440),
  endMinute: z.coerce.number().int().min(0).max(1440),
});

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function upsertAvailabilityRule(formData: FormData) {
  await requireAdminSession();
  const weekday = Number(formData.get("weekday"));
  const active = formData.get("active") === "on";
  const startMinute = timeToMinutes(String(formData.get("startTime")));
  const endMinute = timeToMinutes(String(formData.get("endTime")));
  const parsed = ruleSchema.parse({ weekday, active, startMinute, endMinute });

  await prisma.availabilityRule.upsert({
    where: { weekday: parsed.weekday },
    update: parsed,
    create: parsed,
  });
  revalidatePath("/admin/availability");
}

const exceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["block", "extra_availability", "holiday"]),
  isFullDayBlock: z.coerce.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  note: z.string().optional(),
});

export async function addAvailabilityException(formData: FormData) {
  await requireAdminSession();
  const parsed = exceptionSchema.parse({
    date: formData.get("date"),
    kind: formData.get("kind"),
    isFullDayBlock: formData.get("isFullDayBlock") === "on",
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    note: formData.get("note") || undefined,
  });

  await prisma.availabilityException.create({
    data: {
      date: parsed.date,
      kind: parsed.kind,
      isFullDayBlock: parsed.isFullDayBlock,
      startMinute: parsed.isFullDayBlock || !parsed.startTime ? null : timeToMinutes(parsed.startTime),
      endMinute: parsed.isFullDayBlock || !parsed.endTime ? null : timeToMinutes(parsed.endTime),
      note: parsed.note || null,
    },
  });
  revalidatePath("/admin/availability");
}

export async function deleteAvailabilityException(id: string) {
  await requireAdminSession();
  await prisma.availabilityException.delete({ where: { id } });
  revalidatePath("/admin/availability");
}
