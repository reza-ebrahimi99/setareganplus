import "server-only";
import { prisma } from "@/lib/prisma";

import { DEFAULT_SHOP, type ShopSettings } from "./settings-defaults";
export { DEFAULT_SHOP, type ShopSettings };

export async function getShopSettings(): Promise<ShopSettings> {
  const row = await prisma.setting.findUnique({ where: { key: "shop" } });
  return { ...DEFAULT_SHOP, ...((row?.value as Partial<ShopSettings>) ?? {}) };
}
export async function saveShopSettings(v: ShopSettings) {
  await prisma.setting.upsert({ where: { key: "shop" }, create: { key: "shop", value: v }, update: { value: v } });
}
