#!/usr/bin/env tsx
/**
 * Operator helper: enable/disable the organization-scoped `sxp` flag.
 * Default remains OFF. Does not change STAROS_SXP_HARD_OFF.
 *
 * Usage:
 *   npm run sxp:set-flag -- --slug=demo --enabled=true
 */

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

import { SXP_FEATURE_FLAG_KEY } from "../lib/sxp/constants";
import { prisma } from "../lib/prisma";

function readArg(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  if (!hit) return null;
  return hit.slice(prefix.length).trim() || null;
}

function parseEnabled(raw: string | null): boolean {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "true" || value === "1" || value === "on" || value === "yes") {
    return true;
  }
  if (value === "false" || value === "0" || value === "off" || value === "no") {
    return false;
  }
  throw new Error("Pass --enabled=true or --enabled=false");
}

async function main() {
  const slug = readArg("slug");
  if (!slug) {
    throw new Error("Pass --slug=<organization-slug>");
  }
  const enabled = parseEnabled(readArg("enabled"));

  const organization = await prisma.organization.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (!organization) {
    throw new Error(`organization_not_found:${slug}`);
  }

  const row = await prisma.organizationFeatureFlag.upsert({
    where: {
      organizationId_key: {
        organizationId: organization.id,
        key: SXP_FEATURE_FLAG_KEY,
      },
    },
    update: { enabled },
    create: {
      organizationId: organization.id,
      key: SXP_FEATURE_FLAG_KEY,
      enabled,
    },
    select: { enabled: true, key: true },
  });

  console.log(
    JSON.stringify({
      ok: true,
      organizationId: organization.id,
      slug: organization.slug,
      key: row.key,
      enabled: row.enabled,
    }),
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "flag_update_failed",
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
