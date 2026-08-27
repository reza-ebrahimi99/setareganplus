#!/usr/bin/env tsx
/**
 * One-shot Experience Engine worker (SXP Phase S1).
 *
 * Usage:
 *   npm run sxp:experience-engine-once
 *
 * Reads DomainEventOutbox without marking it processed.
 * CRM automation and SMS workers keep their existing claim semantics.
 */

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Ensure .env exists, then run: npm run sxp:experience-engine-once",
  );
  process.exit(1);
}

import { processExperienceEngineBatch } from "../lib/sxp/engine/processor";
import { SXP_WORKER_BATCH_ENV } from "../lib/sxp/constants";
import { prisma } from "../lib/prisma";

async function main() {
  const limitRaw = Number(process.env[SXP_WORKER_BATCH_ENV] ?? 20);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 50)
      : 20;

  const result = await processExperienceEngineBatch(limit);
  console.log(JSON.stringify({ ok: true, ...result }));
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "worker_failed",
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
