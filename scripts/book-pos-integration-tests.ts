/**
 * DB integration tests for the Ghalamchi Book POS MVP.
 * Run: npx tsx --env-file=.env scripts/book-pos-integration-tests.ts
 */
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import {
  BookPriceKind,
  BookSkuStatus,
  BookStockMovementReason,
} from "@/generated/prisma/enums";
import { registerPosSale } from "@/lib/commerce/pos/sale";
import {
  adjustBookStock,
  listBookStockMovements,
  reconcileBookStockToAbsolute,
} from "@/lib/commerce/pos/inventory";
import { commitCatalogImport } from "@/lib/books/catalog/import-service";
import type { ValidCatalogRow } from "@/lib/books/catalog/import-parser";

function validRow(partial: Partial<ValidCatalogRow> & { internalCode: string; title: string }): ValidCatalogRow {
  return {
    excelRowNumber: 2,
    publisherName: null,
    bookTypeName: null,
    gradeName: null,
    subjectName: null,
    majorName: null,
    editionLabel: null,
    editionYear: null,
    barcode: null,
    listPriceRials: 100_000,
    salePriceRials: null,
    initialStock: null,
    isActive: null,
    keywords: null,
    tagNames: [],
    ...partial,
  };
}

async function main() {
  const org = await prisma.organization.findFirstOrThrow({ where: { slug: "setareganplus" } });
  const actor = await prisma.user.findFirstOrThrow({ where: { email: "admin@setareganplus.local" } });
  const stamp = Date.now();

  async function createBook(code: string, title: string, priceRials: number) {
    const t = await prisma.bookTitle.create({
      data: { organizationId: org.id, title },
      select: { id: true },
    });
    const sku = await prisma.bookSku.create({
      data: {
        organizationId: org.id,
        titleId: t.id,
        internalCode: code,
        slug: code.toLowerCase(),
        status: BookSkuStatus.ACTIVE,
        isVisible: true,
        trackInventory: false,
        unlimitedStock: true,
        searchText: `${code} ${title}`.toLocaleLowerCase("fa"),
      },
      select: { id: true },
    });
    await prisma.bookSkuPrice.create({
      data: {
        organizationId: org.id,
        skuId: sku.id,
        kind: BookPriceKind.LIST,
        amountRials: priceRials,
        source: "TEST",
      },
    });
    return sku.id;
  }

  const bookA = await createBook(`POS-A-${stamp}`, "کتاب آزمایشی الف", 150_000);
  const bookB = await createBook(`POS-B-${stamp}`, "کتاب آزمایشی ب", 90_000);

  // Initial stock via audited ledger.
  assert.equal((await adjustBookStock(prisma, { organizationId: org.id, bookSkuId: bookA, delta: 10, reason: BookStockMovementReason.INITIAL, actorUserId: actor.id })).ok, true);
  assert.equal((await adjustBookStock(prisma, { organizationId: org.id, bookSkuId: bookB, delta: 5, reason: BookStockMovementReason.INITIAL, actorUserId: actor.id })).ok, true);

  // ── POS sale: 2×A + 3×B ──────────────────────────────────────────────
  const sale = await registerPosSale({
    organizationId: org.id,
    actorUserId: actor.id,
    lines: [
      { bookSkuId: bookA, quantity: 2 },
      { bookSkuId: bookB, quantity: 3 },
    ],
    buyerName: "خریدار آزمایشی",
    buyerMobile: "09120000000",
    paymentMethod: "CASH",
  });
  if (!sale.ok) throw new Error(`sale should succeed: ${sale.error}`);
  assert.equal(sale.grandTotalRials, 2 * 150_000 + 3 * 90_000);
  assert.match(sale.invoiceNumber, /^F-\d{4}-\d{6}$/);
  console.log(`  ✓ POS sale ok — invoice ${sale.invoiceNumber}, total ${sale.grandTotalRials}`);

  const aAfter = await prisma.bookSku.findUniqueOrThrow({ where: { id: bookA }, select: { stockQuantity: true } });
  const bAfter = await prisma.bookSku.findUniqueOrThrow({ where: { id: bookB }, select: { stockQuantity: true } });
  assert.equal(aAfter.stockQuantity, 8, "A stock 10-2=8");
  assert.equal(bAfter.stockQuantity, 2, "B stock 5-3=2");
  console.log("  ✓ stock decremented transactionally (A=8, B=2)");

  const saleMoves = await prisma.bookStockMovement.findMany({
    where: { organizationId: org.id, orderId: sale.orderId, reason: BookStockMovementReason.SALE },
  });
  assert.equal(saleMoves.length, 2, "two SALE movements linked to the order");
  const auditRows = await prisma.auditLog.count({ where: { organizationId: org.id, action: "BOOKS_POS_SALE", entityId: sale.orderId } });
  assert.equal(auditRows, 1, "one BOOKS_POS_SALE audit row");
  console.log("  ✓ SALE movements + audit log recorded");

  // ── Oversell guard ──────────────────────────────────────────────────
  const oversell = await registerPosSale({
    organizationId: org.id,
    actorUserId: actor.id,
    lines: [{ bookSkuId: bookB, quantity: 999 }],
    buyerName: "زیاده‌خواه",
  });
  assert.equal(oversell.ok, false, "oversell must be rejected");
  console.log("  ✓ oversell prevented");

  // ── Manual adjust: reconcile-to-absolute then restock ────────────────
  assert.equal((await reconcileBookStockToAbsolute(prisma, { organizationId: org.id, bookSkuId: bookA, desired: 20, reason: BookStockMovementReason.CORRECTION, actorUserId: actor.id })).ok, true);
  assert.equal((await adjustBookStock(prisma, { organizationId: org.id, bookSkuId: bookA, delta: 5, reason: BookStockMovementReason.RESTOCK, actorUserId: actor.id })).ok, true);
  const aFinal = await prisma.bookSku.findUniqueOrThrow({ where: { id: bookA }, select: { stockQuantity: true } });
  assert.equal(aFinal.stockQuantity, 25, "A: 8 -> set 20 -> +5 = 25");
  const moves = await listBookStockMovements({ organizationId: org.id, bookSkuId: bookA });
  const reasons = new Set(moves.map((m) => m.reason));
  for (const r of ["INITIAL", "SALE", "CORRECTION", "RESTOCK"]) {
    assert.ok(reasons.has(r as BookStockMovementReason), `movement ${r} present`);
  }
  console.log("  ✓ adjust/correct recorded (A=25; INITIAL/SALE/CORRECTION/RESTOCK all in history)");

  // ── Import rule 1: NEW book initial stock + EXISTING book desired stock ──
  const job = await prisma.bookImportJob.create({
    data: { organizationId: org.id, fileName: "test.xlsx", checksum: `chk-${stamp}`, createdByUserId: actor.id },
    select: { id: true },
  });
  const summary = await commitCatalogImport({
    organizationId: org.id,
    actorUserId: actor.id,
    jobId: job.id,
    duplicateStrategy: "UPDATE_EXISTING",
    createMissingTaxonomies: true,
    defaultPublisherName: "کانون فرهنگی آموزش (قلم‌چی)",
    validRows: [
      validRow({ internalCode: `POS-NEW-${stamp}`, title: "کتاب وارداتی جدید", listPriceRials: 120_000, initialStock: 7, isActive: true }),
      // existing book A: desired current stock 30 (currently 25) -> +5 correction, NOT +30
      validRow({ excelRowNumber: 3, internalCode: `POS-A-${stamp}`, title: "کتاب آزمایشی الف", listPriceRials: 150_000, initialStock: 30 }),
    ],
  });
  assert.equal(summary.inserted, 1, "one new book inserted");
  assert.equal(summary.updated, 1, "one existing book updated");

  const newSku = await prisma.bookSku.findFirstOrThrow({ where: { organizationId: org.id, internalCode: `POS-NEW-${stamp}` }, select: { id: true, stockQuantity: true, trackInventory: true } });
  assert.equal(newSku.stockQuantity, 7, "new book initial stock = 7");
  assert.equal(newSku.trackInventory, true, "new book now tracks inventory");
  const newInitial = await prisma.bookStockMovement.findFirst({ where: { organizationId: org.id, bookSkuId: newSku.id, reason: BookStockMovementReason.INITIAL, importJobId: job.id } });
  assert.ok(newInitial, "new book INITIAL movement linked to import job");

  const aImported = await prisma.bookSku.findUniqueOrThrow({ where: { id: bookA }, select: { stockQuantity: true } });
  assert.equal(aImported.stockQuantity, 30, "existing book reconciled to desired 30 (not 25+30)");
  const aCorrection = await prisma.bookStockMovement.findFirst({ where: { organizationId: org.id, bookSkuId: bookA, importJobId: job.id }, orderBy: { createdAt: "desc" } });
  assert.equal(aCorrection?.delta, 5, "existing book correction delta = +5 (30-25), never blind add");
  console.log("  ✓ import: NEW=INITIAL(7); EXISTING reconciled by delta +5 to 30 (never blind-add)");

  console.log("\nALL BOOK-POS INTEGRATION TESTS PASSED ✅");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("\n❌ TEST FAILED:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
