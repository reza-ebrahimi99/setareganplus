import "server-only";
import { prisma } from "@/lib/prisma";
import { EMPTY_RATES, clampRates, type BookletRates } from "./pricing";

type RateRow = {
  sheetToman: number;
  spiralToman: number;
  colorFirstToman: number;
  bwFirstToman: number;
  shippingToman: number;
  vatPercent: unknown;
};

function fromRow(row: RateRow): BookletRates {
  return clampRates({
    sheetToman: row.sheetToman,
    spiralToman: row.spiralToman,
    colorFirstToman: row.colorFirstToman,
    bwFirstToman: row.bwFirstToman,
    shippingToman: row.shippingToman,
    vatPercent: Number(row.vatPercent),
  });
}

/** The saved rate card. A missing table keeps every fee at zero so checkout still completes. */
export async function getBookletPricing(): Promise<BookletRates> {
  try {
    const row = await prisma.bookletPricing.findUnique({ where: { id: "default" } });
    if (!row) return { ...EMPTY_RATES, vatPercent: 10 };
    return fromRow(row);
  } catch {
    return { ...EMPTY_RATES };
  }
}

export async function saveBookletPricing(rates: BookletRates) {
  const v = clampRates(rates);
  await prisma.bookletPricing.upsert({
    where: { id: "default" },
    create: { id: "default", ...v },
    update: v,
  });
}
