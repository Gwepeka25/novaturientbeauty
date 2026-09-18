import { z } from "zod";

export const bookingRequestSchema = z.object({
  serviceId: z.string().min(1),
  format: z.enum(["in_person", "online"]),
  startUtc: z.string().datetime(),
  clientName: z.string().trim().min(1).max(120),
  clientEmail: z.string().trim().email().max(200),
  clientPhone: z.string().trim().max(40).optional().or(z.literal("")),
  clientNote: z.string().trim().max(600).optional().or(z.literal("")),
  giftCode: z.string().trim().max(40).optional().or(z.literal("")),
  payOnline: z.boolean().optional(),
  // Honeypot: real users never see or fill this field (hidden via CSS).
  // Any non-empty value strongly suggests an automated submission.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export const waitlistRequestSchema = z.object({
  serviceId: z.string().min(1),
  format: z.enum(["in_person", "online"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientName: z.string().trim().min(1).max(120),
  clientEmail: z.string().trim().email().max(200),
  clientPhone: z.string().trim().max(40).optional().or(z.literal("")),
  note: z.string().trim().max(600).optional().or(z.literal("")),
  // Honeypot, same convention as the booking form.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;

export const workshopRegistrationRequestSchema = z.object({
  workshopId: z.string().min(1),
  clientName: z.string().trim().min(1).max(120),
  clientEmail: z.string().trim().email().max(200),
  clientPhone: z.string().trim().max(40).optional().or(z.literal("")),
  payOnline: z.boolean().optional(),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type WorkshopRegistrationRequest = z.infer<typeof workshopRegistrationRequestSchema>;
