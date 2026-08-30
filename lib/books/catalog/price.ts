import { BookPriceKind } from "@/generated/prisma/enums";

export type PriceRow = {
  id: string;
  kind: BookPriceKind;
  amountRials: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

/**
 * Pure resolver: the covering price row at `now` for a given kind.
 * Never mutate rows in place — callers close the old row and insert a new one.
 */
export function resolveCurrentPrice(
  prices: readonly PriceRow[],
  kind: BookPriceKind,
  now: Date = new Date(),
): PriceRow | null {
  const covering = prices.filter(
    (row) =>
      row.kind === kind &&
      row.effectiveFrom.getTime() <= now.getTime() &&
      (row.effectiveTo === null || row.effectiveTo.getTime() > now.getTime()),
  );
  if (covering.length === 0) return null;
  return covering.reduce((latest, row) =>
    row.effectiveFrom.getTime() > latest.effectiveFrom.getTime() ? row : latest,
  );
}

export function isHistoricalPrice(row: PriceRow, now: Date = new Date()): boolean {
  return row.effectiveTo !== null && row.effectiveTo.getTime() <= now.getTime();
}

export function isFuturePrice(row: PriceRow, now: Date = new Date()): boolean {
  return row.effectiveFrom.getTime() > now.getTime();
}

/** Rials are stored as integers; format with thousands separators for RTL UI. */
export function formatRials(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(amount));
}

export function priceKindLabel(kind: BookPriceKind): string {
  return kind === BookPriceKind.SALE ? "قیمت فروش ویژه" : "قیمت فهرست";
}
