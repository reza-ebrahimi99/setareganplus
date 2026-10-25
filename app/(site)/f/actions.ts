"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { allow } from "@/lib/shop/ratelimit";
import { headers } from "next/headers";
import { receiptPath, startFormPayment, verifyFormPayment } from "@/lib/forms/registration";
import { seatsTaken } from "@/lib/forms/public";

/** "Try paying again" on the receipt page of an unpaid registration. */
export async function retryFormPayment(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const sub = await prisma.submission.findUnique({ where: { token }, include: { form: true } });
  if (!sub) redirect("/forms");
  const back = receiptPath(token);
  if (!allow(`fretry:${ip}`, 10, 10 * 60_000)) redirect(`${back}?r=busy`);
  if (sub.payState === "PAID") redirect(back);
  if (sub.form.status !== "PUBLISHED" || (sub.form.closesAt && sub.form.closesAt < new Date())) redirect(`${back}?r=closed`);
  if (sub.form.capacity != null && (await seatsTaken(sub.formId, sub.id)) >= sub.form.capacity) redirect(`${back}?r=full`);
  const r = await startFormPayment(sub.id);
  if (!r.ok) redirect(`${back}?r=gateway`);
  redirect(r.url);
}

/** "Check again" when the gateway did not answer the verify call. */
export async function recheckFormPayment(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const sub = await prisma.submission.findUnique({ where: { token }, include: { payments: { where: { status: "PENDING", trackId: { not: null } }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!sub) redirect("/forms");
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (sub.payments[0] && allow(`frecheck:${ip}`, 10, 10 * 60_000)) {
    const out = await verifyFormPayment(sub.payments[0].id);
    redirect(`${receiptPath(token)}?r=${out.kind}`);
  }
  redirect(receiptPath(token));
}
