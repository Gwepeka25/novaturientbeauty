import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSessionSecretKey } from "@/lib/session-secret";

const CLIENT_SESSION_COOKIE = "nb_client_session";
const CLIENT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type ClientSessionPayload = { email: string };

export async function createClientSessionCookie(payload: ClientSessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CLIENT_SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecretKey());

  const store = await cookies();
  store.set(CLIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CLIENT_SESSION_TTL_SECONDS,
  });
}

export async function clearClientSessionCookie() {
  const store = await cookies();
  store.delete(CLIENT_SESSION_COOKIE);
}

export async function getClientSession(): Promise<ClientSessionPayload | null> {
  const store = await cookies();
  const token = store.get(CLIENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey());
    return payload as unknown as ClientSessionPayload;
  } catch {
    return null;
  }
}
