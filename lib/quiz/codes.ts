import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Short memorable code: STG-XXXXXX (uppercase latin + digits, no ambiguous chars). */
const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function rawRewardCode() {
  const buf = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPH[buf[i] % ALPH.length];
  return `STG-${s}`;
}

export async function uniqueRewardCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = rawRewardCode();
    const hit = await prisma.studyQuizLead.findUnique({ where: { rewardCode: code }, select: { id: true } });
    if (!hit) return code;
  }
  return `STG-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
