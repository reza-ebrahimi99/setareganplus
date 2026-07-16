#!/usr/bin/env tsx
/**
 * One-shot CRM automation worker.
 * Usage: npm run crm:automation-worker-once
 */

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

import { processPendingAutomationBatch } from "../lib/crm/automation-processor";
import { prisma } from "../lib/prisma";

async function main() {
  const limitRaw = Number(process.env.STAROS_CRM_WORKER_BATCH ?? 20);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 50)
      : 20;
  const result = await processPendingAutomationBatch(limit);
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
