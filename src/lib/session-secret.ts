// Shared by admin sessions (src/lib/session.ts) and client-portal sessions
// (src/lib/client-session.ts) — same secret, different cookies/payloads.
export function getSessionSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set to a long random string in .env");
  }
  return new TextEncoder().encode(secret);
}
