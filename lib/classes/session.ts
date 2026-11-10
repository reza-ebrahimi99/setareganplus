import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "sp_class";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

function sign(payload: string, sec: string) {
  return createHmac("sha256", sec).update(payload).digest("base64url");
}

export async function setClassSession(id: string) {
  const sec = secret();
  if (!sec) throw new Error("SESSION_SECRET must be set (32+ chars).");
  const payload = Buffer.from(JSON.stringify({ id, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload, sec)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearClassSession() {
  (await cookies()).delete(COOKIE);
}

export const getClassStudent = cache(async () => {
  const sec = secret();
  if (!sec) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload, sec);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  let body: { id?: unknown; exp?: unknown };
  try {
    body = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof body.id !== "string" || typeof body.exp !== "number" || body.exp < Date.now()) return null;
  return prisma.classStudent.findUnique({ where: { id: body.id } });
});
