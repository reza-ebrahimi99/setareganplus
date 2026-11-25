import "server-only";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

import { DEFAULT_SHOP, type ShopSettings } from "./settings-defaults";
export { DEFAULT_SHOP, type ShopSettings };

async function loadShopSettings(): Promise<ShopSettings> {
  const row = await prisma.setting.findUnique({ where: { key: "shop" } });
  return { ...DEFAULT_SHOP, ...((row?.value as Partial<ShopSettings>) ?? {}) };
}

export const getShopSettings = unstable_cache(loadShopSettings, ["shop-settings"], {
  revalidate: 60,
  tags: ["shop-settings"],
});

export async function saveShopSettings(v: ShopSettings) {
  await prisma.setting.upsert({ where: { key: "shop" }, create: { key: "shop", value: v }, update: { value: v } });
  revalidateTag("shop-settings", "max");
  revalidatePath("/", "layout");
}
