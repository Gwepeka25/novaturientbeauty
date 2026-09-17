import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  // Rate limit by IP and by email separately so one abusive IP can't lock
  // out a legitimate admin, but brute-forcing either is still throttled.
  if (!rateLimit(`login-ip:${ip}`, 15, 15 * 60_000) || !rateLimit(`login-email:${email}`, 8, 15 * 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });
  const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !validPassword) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSessionCookie({ sub: user.id, email: user.email, name: user.name });
  await prisma.auditEvent.create({
    data: { action: "admin.sign_in", actorId: user.id },
  });

  return NextResponse.json({ ok: true });
}
