import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSessionSecretKey } from "@/lib/session-secret";

const SESSION_COOKIE = "nb_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

export type SessionPayload = { sub: string; email: string; name: string };

export async function createSessionCookie(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
