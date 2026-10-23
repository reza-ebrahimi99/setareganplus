"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { normalizeIranMobile, toEn } from "@/lib/format";
import { allow } from "@/lib/shop/ratelimit";

export async function lookupOrder(fd: FormData) {
  const raw = toEn(String(fd.get("code") ?? "")).trim().toUpperCase().replace(/\s+/g, "");
  const mobile = normalizeIranMobile(String(fd.get("mobile") ?? ""));
  const back = String(fd.get("back") ?? "/order");
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!allow(`lk:${ip}`, 20, 10 * 60_000)) redirect(`${back}?e=rate`);
  if (!raw || !mobile) redirect(`${back}?e=1`);
  const o = await prisma.order.findFirst({ where: { mobile, OR: [{ shortCode: raw }, { number: raw }] }, select: { qrToken: true } });
  if (!o) redirect(`${back}?e=nf`);
  redirect(`/booklet/${encodeURIComponent(o.qrToken)}`);
}
