import "server-only";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseConsultSettings, type ConsultSettings } from "./settings-parse";

const KEY = "consultation";

async function loadConsultSettings(): Promise<ConsultSettings> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    return parseConsultSettings(row?.value);
  } catch {
    return parseConsultSettings(null);
  }
}

export const getConsultSettings = unstable_cache(loadConsultSettings, ["consult-settings"], {
  revalidate: 60,
  tags: ["consult-settings"],
});

export async function saveConsultSettings(value: ConsultSettings) {
  const data = value as unknown as object;
  await prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: data }, update: { value: data } });
  revalidateTag("consult-settings", "max");
  revalidatePath("/moshavere");
}

export type { ConsultSettings };
