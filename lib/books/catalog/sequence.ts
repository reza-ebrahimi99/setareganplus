import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { BOOKS_DOCUMENT_SEQUENCE_PAD } from "@/lib/books/constants";
import { prisma } from "@/lib/prisma";

/** Pure formatter: {prefix}-{periodKey}-{000123}. No sales/procurement documents exist yet. */
export function formatDocumentNumber(
  prefix: string,
  periodKey: string,
  value: number,
): string {
  const padded = String(value).padStart(BOOKS_DOCUMENT_SEQUENCE_PAD, "0");
  return `${prefix}-${periodKey}-${padded}`;
}

/**
 * Atomically increments (organizationId, documentType, periodKey) and returns
 * the new value. Uses an upsert-increment in one statement so two concurrent
 * documents never receive the same number.
 */
export async function nextDocumentSequenceValue(params: {
  organizationId: string;
  documentType: string;
  periodKey: string;
  prefix?: string;
}): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ currentValue: number }>>(Prisma.sql`
    INSERT INTO "book_document_sequences"
      ("id", "organizationId", "documentType", "periodKey", "currentValue", "prefix", "createdAt", "updatedAt")
    VALUES
      (${randomUUID()}, ${params.organizationId}, ${params.documentType}, ${params.periodKey}, 1, ${params.prefix ?? null}, now(), now())
    ON CONFLICT ("organizationId", "documentType", "periodKey")
    DO UPDATE SET "currentValue" = "book_document_sequences"."currentValue" + 1, "updatedAt" = now()
    RETURNING "currentValue"
  `);
  const value = rows[0]?.currentValue;
  if (value == null) {
    throw new Error("SEQUENCE_INCREMENT_FAILED");
  }
  return value;
}
