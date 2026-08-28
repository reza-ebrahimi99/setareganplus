#!/usr/bin/env tsx
/**
 * Operator helper: enable/disable organization-scoped SXP flags.
 * Default remains OFF. Does not change STAROS_SXP_HARD_OFF.
 *
 * Usage:
 *   npm run sxp:set-flag -- --slug=demo --enabled=true
 *   npm run sxp:set-flag -- --slug=demo --key=sxp.files --enabled=true
 */

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

import { SXP_FEATURE_FLAG_KEY, SXP_FILES_FLAG_KEY } from "../lib/sxp/constants";
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

function parseKey(raw: string | null): string {
  const value = (raw ?? SXP_FEATURE_FLAG_KEY).trim();
  if (value === SXP_FEATURE_FLAG_KEY || value === SXP_FILES_FLAG_KEY) {
    return value;
  }
  throw new Error(`Pass --key=${SXP_FEATURE_FLAG_KEY} or --key=${SXP_FILES_FLAG_KEY}`);
}

async function main() {
  const slug = readArg("slug");
  if (!slug) {
    throw new Error("Pass --slug=<organization-slug>");
  }
  const key = parseKey(readArg("key"));
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
        key,
      },
    },
    update: { enabled },
    create: {
      organizationId: organization.id,
      key,
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
