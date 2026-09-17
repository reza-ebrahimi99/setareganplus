-- Book POS + audited inventory ledger (additive).
-- Scope: only the objects for the internal Ghalamchi Book POS feature.

-- CreateEnum
CREATE TYPE "BookStockMovementReason" AS ENUM ('INITIAL', 'RESTOCK', 'SALE', 'CORRECTION', 'IMPORT', 'RETURN');

-- AlterEnum (audit actions for POS sale + stock adjustment)
ALTER TYPE "AuditAction" ADD VALUE 'BOOKS_STOCK_ADJUSTED';
ALTER TYPE "AuditAction" ADD VALUE 'BOOKS_POS_SALE';

-- AlterTable (optional Student link on POS orders; buyer snapshot fields stay authoritative)
ALTER TABLE "commerce_orders" ADD COLUMN     "studentId" TEXT;

-- CreateTable (append-only inventory ledger)
CREATE TABLE "book_stock_movements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bookSkuId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" "BookStockMovementReason" NOT NULL,
    "orderId" TEXT,
    "importJobId" TEXT,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "book_stock_movements_organizationId_bookSkuId_createdAt_idx" ON "book_stock_movements"("organizationId", "bookSkuId", "createdAt");

-- CreateIndex
CREATE INDEX "book_stock_movements_organizationId_createdAt_idx" ON "book_stock_movements"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "book_stock_movements_organizationId_orderId_idx" ON "book_stock_movements"("organizationId", "orderId");

-- CreateIndex
CREATE INDEX "commerce_orders_organizationId_studentId_idx" ON "commerce_orders"("organizationId", "studentId");

-- AddForeignKey
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_organizationId_studentId_fkey" FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_stock_movements" ADD CONSTRAINT "book_stock_movements_organizationId_bookSkuId_fkey" FOREIGN KEY ("organizationId", "bookSkuId") REFERENCES "book_skus"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
