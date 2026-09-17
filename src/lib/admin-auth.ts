import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";

/** For server actions/pages: returns the session or redirects to login. */
export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
