/**
 * Replace OUTDATED seeded defaults in Settings with the corrected ones.
 *
 *   npx tsx scripts/update-defaults.ts [--dry-run]
 *
 * Safety rules (runs unattended from update.sh on every deploy):
 * - A value is replaced ONLY when it still equals the old seeded default exactly
 *   (after trimming). Anything the admin customized is left alone, and nothing is deleted.
 * - Idempotent: once replaced, later runs do nothing.
 * - Prints no secrets; exit code is non-zero only when the database is unreachable.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { BALE_CHANNEL_URL, isLegacyBaleJoin } from "../lib/bale";
import { DEFAULT_HOURS, LEGACY_DEFAULT_HOURS } from "../lib/hours";

const DRY = process.argv.includes("--dry-run");
const log = (...a: unknown[]) => console.log("[defaults]", ...a);
const norm = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : null);
const same = (a: string[] | null, b: string[]) => !!a && a.length === b.length && a.every((x, i) => x === b[i]);

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const row = await prisma.setting.findUnique({ where: { key: "contact" } });
    const value = (row?.value ?? null) as Record<string, unknown> | null;
    if (!row || !value || typeof value !== "object" || Array.isArray(value)) {
      log("contact settings not found; nothing to do");
      return;
    }
    const next: Record<string, unknown> = { ...value };
    let changed = false;

    const hours = norm(value.hours);
    if (same(hours, DEFAULT_HOURS)) log("opening hours already up to date");
    else if (same(hours, LEGACY_DEFAULT_HOURS)) {
      next.hours = DEFAULT_HOURS;
      changed = true;
      log(DRY ? "would update opening hours →" : "opening hours updated →", DEFAULT_HOURS.join(" · "));
    } else log("opening hours were customized in the admin; left unchanged");

    // Only the seeded channel invite. A بله URL the admin changed is left alone.
    const social = Array.isArray(value.social) ? value.social : null;
    if (social?.some((item) => item && typeof item === "object" && typeof (item as { url?: unknown }).url === "string" && isLegacyBaleJoin((item as { url: string }).url))) {
      next.social = social.map((item) => {
        if (!item || typeof item !== "object" || typeof (item as { url?: unknown }).url !== "string") return item;
        const url = (item as { url: string }).url;
        return isLegacyBaleJoin(url) ? { ...item, url: BALE_CHANNEL_URL } : item;
      });
      changed = true;
      log(DRY ? "would point the بله social link at the public channel" : "بله social link now points at the public channel", BALE_CHANNEL_URL);
    } else log("bale social link already up to date or customized");

    if (changed && !DRY) {
      await prisma.setting.update({ where: { key: "contact" }, data: { value: next as Prisma.InputJsonValue } });
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[defaults] failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
