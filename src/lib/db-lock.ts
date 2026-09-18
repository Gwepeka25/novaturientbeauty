import { Prisma } from "@prisma/client";

/**
 * Serializes booking writes through a single Postgres advisory lock.
 *
 * Why this exists: the obvious "check for a conflicting appointment, then
 * insert" pattern is a classic race condition under Postgres's default
 * READ COMMITTED isolation — two concurrent transactions can each check,
 * both see no conflict (neither has committed yet), and both insert.
 * SERIALIZABLE isolation was tried and did NOT reliably catch this case
 * (Postgres's predicate locking doesn't consistently detect a phantom
 * insert into what a concurrent transaction's scan saw as empty/small).
 *
 * An advisory lock sidesteps all of that: every booking-writing
 * transaction queues on the same lock before it reads availability, so
 * only one such transaction is ever mid-flight at a time. It's
 * transaction-scoped (`_xact_lock`), so it releases automatically on
 * commit or rollback — nothing can leak a held lock.
 *
 * A single practitioner's booking volume makes a single global lock (as
 * opposed to a finer-grained per-day key) perfectly fine: bookings are
 * fast, and brief serialization under a burst of concurrent requests is
 * imperceptible.
 */
const BOOKING_LOCK_KEY = 727_001; // arbitrary constant, just needs to be stable

export async function acquireBookingLock(
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK_KEY})`;
}

// Same reasoning as acquireBookingLock, applied to workshop capacity: a
// "count confirmed registrations, then insert if under capacity" check has
// the identical race under concurrent registrations. A separate key keeps
// workshop registrations from needlessly queuing behind unrelated
// appointment bookings.
const WORKSHOP_REGISTRATION_LOCK_KEY = 727_002;

export async function acquireWorkshopRegistrationLock(
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WORKSHOP_REGISTRATION_LOCK_KEY})`;
}
