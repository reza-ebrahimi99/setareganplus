import "server-only";
import { after } from "next/server";
import { randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { OrderStage, Prisma } from "@/generated/prisma/client";
import { zibalRequest, zibalVerify, startUrl } from "./zibal";
import { sendSms } from "./sms";
import { getShopSettings } from "./settings";
import { formatToman, siteUrl, STAGE } from "./config";

const SHORT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newShortCode = () => Array.from({ length: 6 }, () => SHORT_ALPHABET[randomInt(SHORT_ALPHABET.length)]).join("");
export const newToken = (bytes = 18) => randomBytes(bytes).toString("base64url");

function tehranYmd(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p.replace(/-/g, "");
}
async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const prefix = `ORD-${tehranYmd()}-`;
  const last = await tx.order.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  const seq = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

export const ticketPath = (qrToken: string) => `/booklet/${encodeURIComponent(qrToken)}`;
export const shortUrl = (code: string) => `${siteUrl()}/o/${code}`;

export type BuyerInput = {
  buyerName: string;
  mobile: string;
  nationalCode?: string | null;
  parentName?: string | null;
  grade?: string | null;
  major?: string | null;
  branch: "BOYS" | "GIRLS";
  customerNote?: string | null;
};

/** Creates the order (REGISTERED/UNPAID). Retries on the rare number/shortCode collision. */
export async function createOrder(productId: string, buyer: BuyerInput, opts: { source?: string; qty?: number } = {}) {
  const qty = Math.max(1, Math.min(10, opts.qty ?? 1));
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const p = await tx.product.findUnique({ where: { id: productId } });
        if (!p || !p.active) throw new ShopError("این جزوه در حال حاضر قابل سفارش نیست.");
        if (p.stock !== null && p.stock < qty) throw new ShopError("موجودی این جزوه تمام شده است.");
        const total = p.priceRials * qty;
        return tx.order.create({
          data: {
            number: await nextOrderNumber(tx),
            shortCode: newShortCode(),
            qrToken: newToken(),
            ...buyer,
            source: opts.source ?? "web",
            subtotalRials: total,
            totalRials: total,
            items: { create: { productId: p.id, title: p.title, unitRials: p.priceRials, qty, totalRials: total } },
            events: { create: { type: "STAGE", stage: "REGISTERED", text: "سفارش ثبت شد" } },
          },
          include: { items: true },
        });
      });
    } catch (e) {
      if (e instanceof ShopError) throw e;
      if ((e as { code?: string }).code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }
  throw new ShopError("ثبت سفارش انجام نشد. دوباره تلاش کنید.");
}

export class ShopError extends Error {}

export const callbackUrl = (token: string) => `${siteUrl()}/shop/pay/callback?token=${encodeURIComponent(token)}`;

/** New payment attempt for an unpaid order → Zibal start URL. */
export async function startPayment(orderId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { ok: false, error: "سفارش پیدا نشد." };
  if (order.payStatus === "PAID") return { ok: false, error: "این سفارش قبلاً پرداخت شده است." };
  if (order.stage === "CANCELLED") return { ok: false, error: "این سفارش لغو شده است." };
  const token = newToken(24);
  const pay = await prisma.payment.create({ data: { orderId: order.id, amountRials: order.totalRials, token } });
  const r = await zibalRequest({
    amountRials: order.totalRials,
    callbackUrl: callbackUrl(token),
    orderId: `${order.number}-${pay.id.slice(-4)}`,
    mobile: order.mobile,
    description: `جزوه: ${order.items.map((i) => i.title).join("، ")}`,
  });
  if (!r.ok) {
    await prisma.payment.update({ where: { id: pay.id }, data: { status: "FAILED", message: r.error, result: "result" in r ? (r.result as number) : null } });
    return { ok: false, error: r.error };
  }
  await prisma.payment.update({ where: { id: pay.id }, data: { trackId: r.trackId } });
  await prisma.order.update({ where: { id: order.id }, data: { payStatus: "PENDING" } });
  return { ok: true, url: startUrl(r.trackId) };
}

export type CallbackOutcome = { kind: "paid" | "failed" | "pending"; qrToken?: string; message?: string };

/**
 * Handles the Zibal return. Safe to call any number of times (refresh, double callback, admin re-check):
 * - verifies server-side with Zibal (never trusts the query string),
 * - checks the paid amount equals what we asked for,
 * - flips PENDING→PAID with a guarded updateMany, so side effects (stock, SMS) happen exactly once.
 */
export async function handleCallback(token: string, query: { trackId?: string | null; success?: string | null }): Promise<CallbackOutcome> {
  const pay = await prisma.payment.findUnique({ where: { token }, include: { order: true } });
  if (!pay) return { kind: "failed", message: "پرداخت پیدا نشد." };
  const qrToken = pay.order.qrToken;
  if (pay.status === "PAID") return { kind: "paid", qrToken };
  if (!pay.trackId || (query.trackId && query.trackId !== pay.trackId)) return { kind: "failed", qrToken, message: "اطلاعات بازگشتی درگاه با سفارش مطابقت ندارد." };
  if (query.success === "0") {
    await prisma.payment.updateMany({ where: { id: pay.id, status: "PENDING" }, data: { status: "FAILED", message: "انصراف یا خطا در پرداخت" } });
    await settleOrderPayStatus(pay.orderId);
    return { kind: "failed", qrToken, message: "پرداخت انجام نشد یا لغو شد." };
  }
  return verifyPayment(pay.id);
}

export async function verifyPayment(paymentId: string): Promise<CallbackOutcome> {
  const pay = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!pay || !pay.trackId) return { kind: "failed", message: "پرداخت پیدا نشد." };
  const qrToken = pay.order.qrToken;
  if (pay.status === "PAID") return { kind: "paid", qrToken };
  const v = await zibalVerify(pay.trackId);
  if (v.kind === "error") {
    await prisma.payment.update({ where: { id: pay.id }, data: { message: v.message } });
    return { kind: "pending", qrToken, message: "تأیید پرداخت از درگاه انجام نشد. اگر مبلغ از حساب شما کم شده، چند دقیقه بعد دوباره بررسی کنید یا با ما تماس بگیرید." };
  }
  if (v.kind === "failed") {
    await prisma.payment.updateMany({ where: { id: pay.id, status: { in: ["PENDING", "FAILED"] } }, data: { status: "FAILED", result: v.result, message: v.message } });
    await settleOrderPayStatus(pay.orderId);
    return { kind: "failed", qrToken, message: "پرداخت تأیید نشد. اگر مبلغی کسر شده، طی ۷۲ ساعت به حساب شما برمی‌گردد." };
  }
  if (v.amountRials !== pay.amountRials) {
    await prisma.payment.update({ where: { id: pay.id }, data: { result: v.result, message: `مغایرت مبلغ: ${v.amountRials} ≠ ${pay.amountRials}` } });
    return { kind: "pending", qrToken, message: "مبلغ پرداختی با مبلغ سفارش مغایرت دارد. همکاران ما بررسی و با شما تماس می‌گیرند." };
  }
  const flipped = await prisma.$transaction(async (tx) => {
    const r = await tx.payment.updateMany({
      where: { id: pay.id, status: { not: "PAID" } },
      data: { status: "PAID", result: v.result, refNumber: v.refNumber, cardNumber: v.cardNumber, paidAt: new Date(), message: null },
    });
    if (r.count !== 1) return false;
    const o = await tx.order.findUniqueOrThrow({ where: { id: pay.orderId }, include: { items: true } });
    if (o.payStatus === "PAID") {
      // Order was already paid by another attempt: record it, staff may refund the duplicate.
      await tx.orderEvent.create({ data: { orderId: o.id, type: "PAYMENT", text: `پرداخت تکراری تأیید شد (کد پیگیری ${v.refNumber ?? pay.trackId}) — بررسی برای استرداد` } });
      return false;
    }
    await tx.order.update({
      where: { id: o.id },
      data: { payStatus: "PAID", paidAt: new Date(), payMethod: "ONLINE", stage: o.stage === "REGISTERED" || o.stage === "CANCELLED" ? "PAID" : o.stage },
    });
    for (const it of o.items) {
      if (it.productId) await tx.product.updateMany({ where: { id: it.productId, stock: { not: null } }, data: { stock: { decrement: it.qty } } });
    }
    await tx.product.updateMany({ where: { stock: { lt: 0 } }, data: { stock: 0 } });
    await tx.orderEvent.create({ data: { orderId: o.id, type: "PAYMENT", stage: "PAID", text: `پرداخت آنلاین موفق — ${v.refNumber ? `کد پیگیری ${v.refNumber}` : `شناسه زیبال ${pay.trackId}`}` } });
    return true;
  });
  if (flipped) await notifyPaid(pay.orderId);
  return { kind: "paid", qrToken };
}

async function settleOrderPayStatus(orderId: string) {
  await prisma.order.updateMany({ where: { id: orderId, payStatus: "PENDING" }, data: { payStatus: "FAILED" } });
}

const titles = (items: { title: string }[]) => items.map((i) => i.title).join("، ");

export async function notifyPaid(orderId: string) {
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!o) return;
  const params = { FULLNAME: o.buyerName, TITLE: titles(o.items), PRICE: formatToman(o.totalRials), ORDER_NUMBER: o.number };
  await sendSms("purchase", o.mobile, params, o.id);
  const s = await getShopSettings();
  if (s.adminSms) for (const m of s.adminMobiles) await sendSms("admin", m, params, o.id);
}

export async function notifyReady(orderId: string) {
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!o) return;
  await sendSms("ready", o.mobile, { FULLNAME: o.buyerName, TITLE: titles(o.items), ORDER_NUMBER: o.number, LINK: o.shortCode }, o.id);
}

const STAMP: Partial<Record<OrderStage, "paidAt" | "inProductionAt" | "readyAt" | "deliveredAt">> = {
  PAID: "paidAt",
  IN_PRODUCTION: "inProductionAt",
  READY: "readyAt",
  DELIVERED: "deliveredAt",
};

export type StageResult = { changed: number; same: number; failed: number };

/** Ready SMS runs after the response is sent, so a slow/failing SMS.ir never blocks or undoes the stage change. */
function queueReadySms(orderId: string) {
  const run = () => notifyReady(orderId).catch((e) => console.error("[shop] ready SMS failed", orderId, e));
  try {
    after(run);
  } catch {
    void run(); // outside a request (scripts)
  }
}

/**
 * Staff stage change (single or bulk). Sends the "ready" SMS when an order becomes READY.
 * Each order is applied on its own (one bad order never blocks the rest) and atomically,
 * guarded by the current stage so a double click cannot apply it (and the stock change) twice.
 */
export async function setStage(ids: string[], stage: OrderStage, extra: { deliveredTo?: string | null; payMethod?: string; actor?: string | null } = {}): Promise<StageResult> {
  const r: StageResult = { changed: 0, same: 0, failed: 0 };
  for (const id of [...new Set(ids.filter(Boolean))]) {
    try {
      const o = await prisma.order.findUnique({ where: { id } });
      if (!o) { r.failed++; continue; }
      if (o.stage === stage) { r.same++; continue; }
      const data: Prisma.OrderUpdateManyMutationInput = { stage };
      const f = STAMP[stage];
      if (f && !o[f]) data[f] = new Date();
      if (stage === "DELIVERED" && extra.deliveredTo) data.deliveredTo = extra.deliveredTo;
      // Moving past "registered" by hand means it was paid offline (cash/card) unless already paid online.
      const offlinePaid = stage !== "REGISTERED" && stage !== "CANCELLED" && o.payStatus !== "PAID";
      if (offlinePaid) {
        data.payStatus = "PAID";
        data.payMethod = extra.payMethod ?? (o.payMethod === "ONLINE" ? "CASH" : o.payMethod);
        if (!o.paidAt) data.paidAt = new Date();
      }
      const done = await prisma.$transaction(async (tx) => {
        const u = await tx.order.updateMany({ where: { id, stage: o.stage }, data });
        if (!u.count) return false; // changed by someone else meanwhile (e.g. double click)
        if (offlinePaid) await adjustStock(tx, id, -1);
        if (stage === "CANCELLED" && o.payStatus === "PAID" && o.stage !== "DELIVERED") await adjustStock(tx, id, +1);
        await tx.orderEvent.create({ data: { orderId: id, type: "STAGE", stage, text: `وضعیت: ${STAGE[stage].label}${stage === "DELIVERED" && extra.deliveredTo ? ` — تحویل‌گیرنده: ${extra.deliveredTo}` : ""}`, actor: extra.actor ?? null } });
        return true;
      });
      if (!done) { r.same++; continue; }
      if (stage === "READY") queueReadySms(id);
      r.changed++;
    } catch (e) {
      console.error("[shop] setStage failed", id, stage, e);
      r.failed++;
    }
  }
  return r;
}

async function adjustStock(tx: Prisma.TransactionClient, orderId: string, sign: 1 | -1) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const it of items) {
    if (!it.productId) continue;
    await tx.product.updateMany({ where: { id: it.productId, stock: { not: null } }, data: { stock: { increment: sign * it.qty } } });
  }
  await tx.product.updateMany({ where: { stock: { lt: 0 } }, data: { stock: 0 } });
}
