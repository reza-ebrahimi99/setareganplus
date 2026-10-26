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
import { PrismaClient } from "../generated/prisma/client";
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
    const hours = norm(value.hours);
    if (same(hours, DEFAULT_HOURS)) log("opening hours already up to date");
    else if (same(hours, LEGACY_DEFAULT_HOURS)) {
      if (DRY) log("would update opening hours →", DEFAULT_HOURS.join(" · "));
      else {
        await prisma.setting.update({ where: { key: "contact" }, data: { value: { ...value, hours: DEFAULT_HOURS } } });
        log("opening hours updated →", DEFAULT_HOURS.join(" · "));
      }
    } else log("opening hours were customized in the admin; left unchanged");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[defaults] failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
