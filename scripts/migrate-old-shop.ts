/**
 * Copy the booklet shop from the OLD site database into the lean database.
 *
 *   OLD_DATABASE_URL=postgresql://… OLD_MEDIA_ROOT=/var/www/staros-media npx tsx scripts/migrate-old-shop.ts [--dry-run] [--refresh-products]
 *
 * - The old DB is opened READ ONLY (session + transaction). Nothing is written there.
 * - Idempotent: every row carries legacyId; re-running only adds what is missing and moves
 *   imported orders forward (stage/payment never go backwards), so it is safe to run again
 *   right after the nginx switch to catch orders paid on the old site in the meantime.
 * - Products are created once; existing ones are left alone (admin edits win) unless --refresh-products.
 * - The test booklet («آزمایشی») and orders that only contain it are skipped.
 * - Order numbers, short codes (/o/XXXXXX) and QR tokens (/booklet/…) are preserved.
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type OrderStage, type PayStatus } from "../generated/prisma/client";

const DRY = process.argv.includes("--dry-run");
const REFRESH = process.argv.includes("--refresh-products");
const OLD_URL = process.env.OLD_DATABASE_URL;
const MEDIA_ROOT = process.env.OLD_MEDIA_ROOT || "/var/www/staros-media";
const UPLOAD = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
if (!OLD_URL) { console.error("OLD_DATABASE_URL is required"); process.exit(2); }
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is required"); process.exit(2); }

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const old = new Client({ connectionString: OLD_URL.replace(/\?.*$/, "") });

const GRADE: Record<string, string> = { GRADE_7: "هفتم", GRADE_8: "هشتم", GRADE_9: "نهم", GRADE_10: "دهم", GRADE_11: "یازدهم", GRADE_12: "دوازدهم" };
const GRADE_NUM: Record<string, string> = { GRADE_1: "اول", GRADE_2: "دوم", GRADE_3: "سوم", GRADE_4: "چهارم", GRADE_5: "پنجم", GRADE_6: "ششم" };
const MAJOR: Record<string, string> = { MATH: "ریاضی", EMPIRICAL: "تجربی", HUMANITIES: "انسانی", TECHNICAL: "فنی و کاردانش", KAR_DANESH: "فنی و کاردانش" };
const STAGE: Record<string, OrderStage> = { REGISTERED: "REGISTERED", PAID: "PAID", IN_PRODUCTION: "IN_PRODUCTION", READY_FOR_PICKUP: "READY", DELIVERED_TO_STUDENT: "DELIVERED" };
const RANK: Record<OrderStage, number> = { REGISTERED: 0, CANCELLED: 0, PAID: 1, IN_PRODUCTION: 2, READY: 3, DELIVERED: 4 };
const PAY: Record<string, PayStatus> = { UNPAID: "UNPAID", PENDING: "PENDING", PAID: "PAID", FAILED: "FAILED", REFUNDED: "REFUNDED", PARTIAL: "PENDING" };
const SESSION_PAY: Record<string, PayStatus> = { PENDING: "PENDING", PROCESSING: "PENDING", PAID: "PAID", FAILED: "FAILED", CANCELLED: "FAILED", EXPIRED: "FAILED", REFUNDED: "REFUNDED" };
const PRINT: Record<string, string> = { COLOR: "رنگی", BLACK_AND_WHITE: "سیاه‌وسفید" };
const BIND: Record<string, string> = { STAPLED: "منگنه", SPIRAL: "فنری", PERFECT: "چسب گرم", OTHER: "سایر" };
const SIZE: Record<string, string> = { A4: "A4", A5: "A5", RAHLI: "رحلی", OTHER: "سایر" };
const GRADES = ["هفتم", "هشتم", "نهم", "دهم", "یازدهم", "دوازدهم"];

const isTest = (title: string, code = "", slug = "") => /آزمایشی/.test(title) || /^test/i.test(code) || /^test/i.test(slug);
const normMobile = (m: string | null) => {
  if (!m) return "";
  let n = m.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "");
  if (n.startsWith("98") && n.length === 12) n = "0" + n.slice(2);
  if (n.startsWith("9") && n.length === 10) n = "0" + n;
  return n;
};
const normGrade = (g: string | null) => {
  if (!g) return null;
  const t = g.replace(/ي/g, "ی").replace(/\s+/g, " ").trim();
  return GRADES.find((x) => x === t) ?? [...GRADES].sort((a, b) => b.length - a.length).find((x) => t.includes(x)) ?? t;
};

const stats: Record<string, number> = {};
const bump = (k: string, n = 1) => (stats[k] = (stats[k] ?? 0) + n);

async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await old.query(sql, params)).rows as T[];
}

async function copyCover(storageKey: string | null, legacyId: string): Promise<string | null> {
  if (!storageKey) return null;
  const src = path.resolve(MEDIA_ROOT, storageKey.replace(/^\/+/, ""));
  if (!src.startsWith(path.resolve(MEDIA_ROOT) + path.sep) || !existsSync(src)) { bump("covers_missing"); console.warn(`  ! cover file not found: ${storageKey}`); return null; }
  const rel = `shop/legacy-${legacyId}.webp`;
  const out = path.join(UPLOAD, "public", rel);
  if (!DRY && !existsSync(out)) {
    mkdirSync(path.dirname(out), { recursive: true });
    await sharp(readFileSync(src)).rotate().resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  }
  bump("covers_copied");
  return `/media/${rel}`;
}

async function main() {
  await old.connect();
  await old.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
  await old.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  console.log(`Old DB opened read-only. ${DRY ? "(dry run — nothing will be written)" : ""}`);

  // ── products ────────────────────────────────────────────────
  const skus = await q<{
    id: string; slug: string; internalCode: string; title: string; shortDescription: string; authors: string; subject: string | null; gradeLabel: string | null;
    pageCount: number | null; printType: string | null; bindingType: string | null; formatSize: string | null; features: unknown; isVisible: boolean; isFeatured: boolean;
    sortOrder: number; trackInventory: boolean; stockQuantity: number | null; unlimitedStock: boolean; status: string; storageKey: string | null; createdAt: Date; description: string | null; deletedAt: Date | null;
  }>(`SELECT s.*, t.title, t.description, m."storageKey" FROM book_skus s JOIN book_titles t ON t.id = s."titleId" LEFT JOIN media_assets m ON m.id = s."primaryImageAssetId" ORDER BY s."sortOrder", s."createdAt"`);
  const prices = await q<{ skuId: string; kind: string; amountRials: number }>(
    `SELECT DISTINCT ON ("skuId", kind) "skuId", kind, "amountRials" FROM book_sku_prices WHERE "effectiveFrom" <= now() AND ("effectiveTo" IS NULL OR "effectiveTo" > now()) ORDER BY "skuId", kind, "effectiveFrom" DESC`,
  );
  const lastPrice = await q<{ skuId: string; amountRials: number }>(`SELECT DISTINCT ON ("skuId") "skuId", "amountRials" FROM book_sku_prices WHERE kind = 'LIST' ORDER BY "skuId", "effectiveFrom" DESC`);
  const productMap = new Map<string, string>(); // old sku id -> new product id
  const testSkus = new Set<string>();
  for (const s of skus) {
    if (isTest(s.title, s.internalCode, s.slug)) { testSkus.add(s.id); bump("products_skipped_test"); continue; }
    const existing = await prisma.product.findUnique({ where: { legacyId: s.id } });
    if (existing && !REFRESH) { productMap.set(s.id, existing.id); bump("products_existing"); continue; }
    const list = prices.find((p) => p.skuId === s.id && p.kind === "LIST")?.amountRials ?? lastPrice.find((p) => p.skuId === s.id)?.amountRials ?? 0;
    const sale = prices.find((p) => p.skuId === s.id && p.kind === "SALE")?.amountRials;
    const onSale = sale != null && sale < list;
    const features = Array.isArray(s.features) ? (s.features as unknown[]).filter((x) => typeof x === "string") as string[] : [];
    const specs = [s.printType && `چاپ: ${PRINT[s.printType] ?? s.printType}`, s.bindingType && `صحافی: ${BIND[s.bindingType] ?? s.bindingType}`, s.formatSize && `قطع: ${SIZE[s.formatSize] ?? s.formatSize}`]
      .filter(Boolean).join("\n");
    const data = {
      title: s.title.trim(),
      author: s.authors?.trim() || null,
      summary: s.shortDescription?.trim() || null,
      description: [s.description?.trim(), features.length ? features.map((f) => `• ${f}`).join("\n") : ""].filter(Boolean).join("\n\n") || null,
      cover: await copyCover(s.storageKey, s.id),
      priceRials: onSale ? sale! : list,
      compareAtRials: onSale ? list : null,
      subject: s.subject?.trim() || null,
      grade: normGrade(s.gradeLabel),
      pageCount: s.pageCount,
      specs: specs || null,
      stock: s.trackInventory && !s.unlimitedStock ? Math.max(0, s.stockQuantity ?? 0) : null,
      active: s.isVisible && s.status === "ACTIVE" && !s.deletedAt && list > 0,
      featured: s.isFeatured,
      sortOrder: s.sortOrder,
    };
    if (DRY) { productMap.set(s.id, existing?.id ?? `dry-${s.id}`); bump(existing ? "products_refreshed" : "products_created"); continue; }
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      productMap.set(s.id, existing.id);
      bump("products_refreshed");
    } else {
      let slug = decodeURIComponent(s.slug).trim() || s.id;
      if (await prisma.product.findUnique({ where: { slug } })) slug = `${slug}-${s.id.slice(-4)}`;
      const p = await prisma.product.create({ data: { ...data, slug, legacyId: s.id, createdAt: s.createdAt } });
      productMap.set(s.id, p.id);
      bump("products_created");
    }
  }

  // ── orders ──────────────────────────────────────────────────
  const orders = await q<Record<string, any>>(
    `SELECT o.*, b."bookletOpsKey" AS "branchKey", b.name AS "branchName" FROM commerce_orders o LEFT JOIN branches b ON b.id = o."pickupBranchId" ORDER BY o."createdAt"`,
  );
  const items = await q<Record<string, any>>(`SELECT * FROM commerce_order_items`);
  const events = await q<Record<string, any>>(`SELECT * FROM commerce_order_events ORDER BY "occurredAt"`);
  const intents = await q<Record<string, any>>(`SELECT * FROM payment_intents WHERE "payableType" = 'COMMERCE_ORDER'`);
  const sessions = await q<Record<string, any>>(`SELECT s.* FROM payment_sessions s JOIN payment_intents i ON i.id = s."paymentIntentId" WHERE i."payableType" = 'COMMERCE_ORDER'`);
  const by = <T extends Record<string, any>>(arr: T[], key: string) => arr.reduce((m, r) => (m.get(r[key])?.push(r) ?? m.set(r[key], [r]), m), new Map<string, T[]>());
  const itemsBy = by(items, "orderId"), eventsBy = by(events, "orderId"), intentsBy = by(intents, "payableId"), sessionsBy = by(sessions, "paymentIntentId");

  for (const o of orders) {
    const its = itemsBy.get(o.id) ?? [];
    if (its.length > 0 && its.every((i) => (i.bookSkuId && testSkus.has(i.bookSkuId)) || isTest(i.titleSnapshot))) { bump("orders_skipped_test"); continue; }
    const cancelled = o.status === "CANCELLED" || o.status === "REFUNDED";
    const stage: OrderStage = cancelled ? "CANCELLED" : STAGE[o.opsStage] ?? "REGISTERED";
    const payStatus: PayStatus = PAY[o.paymentStatus] ?? "UNPAID";
    const pis = intentsBy.get(o.id) ?? [];
    const paidAt: Date | null = pis.filter((p) => p.paidAt).map((p) => p.paidAt as Date).sort((a, b) => +a - +b)[0] ?? (payStatus === "PAID" ? o.updatedAt : null);
    const branch = o.branchKey ?? (/دختر/.test(o.branchName ?? "") ? "GIRLS" : /پسر/.test(o.branchName ?? "") ? "BOYS" : "UNKNOWN");
    const grade = o.studentGrade ? GRADE[o.studentGrade] ?? GRADE_NUM[o.studentGrade] ?? null : null;
    const adminNote = [o.notes, o.deliveryNote && `یادداشت تحویل: ${o.deliveryNote}`, o.opsVip && "VIP", o.urgentDelivery && "فوری"].filter(Boolean).join("\n") || null;

    const existing = await prisma.order.findUnique({ where: { legacyId: o.id } });
    let orderId: string;
    if (existing) {
      orderId = existing.id;
      // move forward only
      const data: Record<string, unknown> = {};
      if (payStatus === "PAID" && existing.payStatus !== "PAID") Object.assign(data, { payStatus, paidAt, payMethod: o.bookletPaymentMethod ?? existing.payMethod });
      if (stage !== "CANCELLED" && RANK[stage] > RANK[existing.stage] && existing.stage !== "CANCELLED") {
        Object.assign(data, { stage, inProductionAt: existing.inProductionAt ?? o.inProductionAt, readyAt: existing.readyAt ?? o.readyForPickupAt, deliveredAt: existing.deliveredAt ?? o.deliveredAt, deliveredTo: existing.deliveredTo ?? o.pickupSignedBy });
      }
      if (Object.keys(data).length) { if (!DRY) await prisma.order.update({ where: { id: existing.id }, data }); bump("orders_advanced"); } else bump("orders_unchanged");
    } else {
      const data = {
        number: o.orderNumber as string,
        shortCode: (o.shortCode as string).toUpperCase(),
        qrToken: o.qrToken as string,
        stage, payStatus,
        payMethod: o.bookletPaymentMethod ?? "ONLINE",
        buyerName: (o.buyerName || [o.buyerFirstName, o.buyerLastName].filter(Boolean).join(" ") || "دانش‌آموز").trim(),
        mobile: normMobile(o.buyerMobile),
        nationalCode: o.buyerNationalCode || null,
        parentName: o.parentName || null,
        grade, major: o.studentMajor ? MAJOR[o.studentMajor] ?? null : null,
        branch,
        customerNote: o.specialNotes || null,
        adminNote,
        subtotalRials: o.subtotalRials ?? o.grandTotalRials,
        totalRials: o.grandTotalRials,
        paidAt, inProductionAt: o.inProductionAt, readyAt: o.readyForPickupAt, deliveredAt: o.deliveredAt, deliveredTo: o.pickupSignedBy || null,
        source: "legacy", legacyId: o.id as string, createdAt: o.createdAt as Date,
      };
      if (DRY) { bump("orders_created"); continue; }
      try {
        orderId = (await prisma.order.create({ data })).id;
      } catch (e) {
        if ((e as { code?: string }).code !== "P2002") throw e;
        // number collided with an order created on the new site → keep links (shortCode/qrToken), suffix the number
        orderId = (await prisma.order.create({ data: { ...data, number: `${data.number}-Q` } })).id;
        bump("orders_number_suffixed");
      }
      bump("orders_created");
    }
    if (DRY) continue;
    // items / events / payments: insert missing rows only
    const r1 = await prisma.orderItem.createMany({
      skipDuplicates: true,
      data: its.map((i) => ({ orderId, legacyId: i.id, productId: (i.bookSkuId && productMap.get(i.bookSkuId)) || null, title: i.titleSnapshot, unitRials: i.unitPriceRials, qty: i.quantity, totalRials: i.totalRials })),
    });
    bump("items_created", r1.count);
    const r2 = await prisma.orderEvent.createMany({
      skipDuplicates: true,
      data: (eventsBy.get(o.id) ?? []).map((e) => ({
        orderId, legacyId: e.id,
        type: e.eventType === "STAGE_CHANGED" || e.eventType === "ROLLBACK" ? "STAGE" : e.eventType === "NOTE_ADDED" ? "NOTE" : "SYSTEM",
        stage: e.stage ? STAGE[e.stage] ?? null : null,
        text: [e.title, e.note].filter(Boolean).join(" — ").slice(0, 1000) || "رویداد",
        createdAt: e.occurredAt,
      })),
    });
    bump("events_created", r2.count);
    const payRows = pis.flatMap((pi) => {
      const ss = sessionsBy.get(pi.id) ?? [];
      const base = { orderId, provider: pi.provider || "zibal", amountRials: pi.finalAmountRials, refNumber: pi.receiptNumber || pi.trackingCode || null };
      if (ss.length === 0) return [{ ...base, legacyId: `pi:${pi.id}`, token: `legacy-pi-${pi.id}`, trackId: null, status: (pi.status === "PROCESSING" ? "PENDING" : SESSION_PAY[pi.status] ?? "FAILED") as PayStatus, paidAt: pi.paidAt, createdAt: pi.createdAt }];
      return ss.map((s) => ({ ...base, legacyId: s.id, token: `legacy-${s.id}`, trackId: s.providerSessionId ? `legacy-${s.providerSessionId}` : null, status: (s.status === "PAID" || (pi.status === "PAID" && ss.length === 1) ? "PAID" : SESSION_PAY[s.status] ?? "FAILED") as PayStatus, paidAt: s.status === "PAID" ? pi.paidAt ?? s.completedAt : null, createdAt: s.createdAt }));
    });
    const r3 = await prisma.payment.createMany({ skipDuplicates: true, data: payRows });
    bump("payments_created", r3.count);
    // keep payment rows in step with the old site (e.g. a session paid after the first run)
    for (const p of payRows.filter((x) => x.status === "PAID")) await prisma.payment.updateMany({ where: { legacyId: p.legacyId, status: { not: "PAID" } }, data: { status: "PAID", paidAt: p.paidAt, refNumber: p.refNumber } });
  }

  // ── admin SMS recipients (only if not configured yet in the new panel) ──
  const ns = await q<{ adminNotificationSmsEnabled: boolean; adminSmsRecipients: unknown }>(`SELECT "adminNotificationSmsEnabled", "adminSmsRecipients" FROM commerce_notification_settings LIMIT 1`);
  const cur = await prisma.setting.findUnique({ where: { key: "shop" } });
  if (ns[0] && !cur) {
    const mobiles = (Array.isArray(ns[0].adminSmsRecipients) ? ns[0].adminSmsRecipients : []).filter((r: any) => r?.enabled !== false && r?.mobile).map((r: any) => normMobile(String(r.mobile))).filter((m: string) => /^09\d{9}$/.test(m));
    if (!DRY) {
      const { DEFAULT_SHOP } = await import("../lib/shop/settings-defaults");
      await prisma.setting.create({ data: { key: "shop", value: { ...DEFAULT_SHOP, adminMobiles: mobiles, adminSms: ns[0].adminNotificationSmsEnabled } } });
    }
    bump("admin_sms_numbers", mobiles.length);
  }

  await old.query("ROLLBACK");
  console.log("Done:", JSON.stringify(stats));
}

main()
  .catch((e) => { console.error("MIGRATION FAILED:", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(async () => { await old.end().catch(() => {}); await prisma.$disconnect(); });
