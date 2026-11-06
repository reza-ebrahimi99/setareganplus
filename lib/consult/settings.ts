import "server-only";
import { prisma } from "@/lib/prisma";
import { parseConsultSettings, type ConsultSettings } from "./settings-parse";

const KEY = "consultation";

export async function getConsultSettings(): Promise<ConsultSettings> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    return parseConsultSettings(row?.value);
  } catch {
    return parseConsultSettings(null);
  }
}

export async function saveConsultSettings(value: ConsultSettings) {
  const data = value as unknown as object;
  await prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: data }, update: { value: data } });
}

export type { ConsultSettings };
