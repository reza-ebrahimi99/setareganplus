import "server-only";
import { cache } from "react";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ALL_PERMS, type Perm } from "@/lib/perms";

const COOKIE = "sp_admin";
const MAX_AGE = 60 * 60 * 12; // 12h

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ chars).");
  return s;
}

/** Hash format: scrypt:<saltHex>:<hashHex>  (no `$`, safe in .env files). */
export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const got = scryptSync(password, Buffer.from(salt, "hex"), 64);
  const want = Buffer.from(hash, "hex");
  return want.length === got.length && timingSafeEqual(got, want);
}

/** Same format as scripts/hash-password.ts and ADMIN_PASSWORD_HASH. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const ownerName = () => process.env.ADMIN_USERNAME || "";

export function isOwnerUsername(username: string) {
  const u = ownerName();
  return !!u && username.toLowerCase() === u.toLowerCase();
}

/** Owner credentials from .env (unchanged behaviour). */
export function checkCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME;
  const h = process.env.ADMIN_PASSWORD_HASH;
  if (!u || !h) return false;
  const userOk = username.length === u.length && timingSafeEqual(Buffer.from(username), Buffer.from(u));
  const passOk = verifyPassword(password, h);
  return userOk && passOk;
}

// a fixed dummy hash so unknown usernames cost the same scrypt time
const DUMMY = `scrypt:${"00".repeat(16)}:${"00".repeat(64)}`;

/** Owner first (env), then staff (DB). Returns the session payload to sign, or null. */
export async function authenticate(username: string, password: string): Promise<{ u: string; sid?: string; v?: number; name?: string } | null> {
  if (checkCredentials(username, password)) return { u: username };
  const uname = username.trim().toLowerCase();
  if (!uname || isOwnerUsername(uname)) return null;
  const st = await prisma.staffUser.findUnique({ where: { username: uname } });
  const ok = verifyPassword(password, st?.passwordHash ?? DUMMY);
  if (!st || !ok || !st.active) return null;
  await prisma.staffUser.update({ where: { id: st.id }, data: { lastLoginAt: new Date() } });
  return { u: st.username, sid: st.id, v: st.sessionVersion, name: st.fullName };
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function createSession(who: string | { u: string; sid?: string; v?: number }) {
  const data = typeof who === "string" ? { u: who } : { u: who.u, sid: who.sid, v: who.v };
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export type AdminUser = {
  owner: boolean;
  id: string | null;
  username: string;
  name: string;
  perms: Set<Perm>;
};

/** Display string used in order history / activity log. */
export const actorName = (a: AdminUser) => (a.owner ? "مدیر" : `${a.name} (${a.username})`);

/** Current signed-in admin (owner or active staff), checked against the DB on every request. */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  let p: { u?: unknown; sid?: unknown; v?: unknown; exp?: unknown };
  try {
    p = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof p.exp !== "number" || p.exp < Date.now() || typeof p.u !== "string") return null;
  if (!p.sid) {
    // owner session (same cookie format as before staff accounts existed)
    if (!ownerName() || p.u !== ownerName()) return null;
    return { owner: true, id: null, username: p.u, name: "مدیر اصلی", perms: new Set(ALL_PERMS) };
  }
  if (typeof p.sid !== "string") return null;
  const st = await prisma.staffUser.findUnique({ where: { id: p.sid } });
  if (!st || !st.active || st.sessionVersion !== p.v || st.username !== p.u) return null;
  return { owner: false, id: st.id, username: st.username, name: st.fullName, perms: new Set(st.permissions.filter((x): x is Perm => (ALL_PERMS as string[]).includes(x))) };
});

/** Back-compat: username of the signed-in admin or null. */
export async function getAdmin(): Promise<string | null> {
  return (await getAdminUser())?.username ?? null;
}

export async function requireAdmin(): Promise<AdminUser> {
  const u = await getAdminUser();
  if (!u) redirect((await cookies()).has(COOKIE) ? "/admin/login?e=out" : "/admin/login");
  return u;
}

export const can = (u: AdminUser | null, perm: Perm) => !!u && (u.owner || u.perms.has(perm));

/** Pages and server actions: signed in AND has `perm`, otherwise the friendly «دسترسی ندارید» page. */
export async function requirePerm(perm: Perm): Promise<AdminUser> {
  const u = await requireAdmin();
  if (!can(u, perm)) redirect(`/admin/forbidden?p=${encodeURIComponent(perm)}`);
  return u;
}

/** Route handlers: returns the user, or a 401/403 Response. */
export async function permOr403(perm: Perm): Promise<AdminUser | Response> {
  const u = await getAdminUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  if (!can(u, perm)) return new Response("Forbidden", { status: 403 });
  return u;
}

/** Fire-and-forget activity log entry. */
export async function logAction(a: AdminUser, action: string, text: string, target?: string | null) {
  try {
    await prisma.adminLog.create({ data: { actor: actorName(a), action, text: text.slice(0, 500), target: target ?? null } });
  } catch {
    /* logging must never break the action */
  }
}

export async function logLogin(who: { u: string; sid?: string; name?: string }) {
  try {
    await prisma.adminLog.create({ data: { actor: who.sid ? `${who.name ?? who.u} (${who.u})` : "مدیر", action: "login", text: "ورود به پنل" } });
  } catch {
    /* ignore */
  }
}
