#!/usr/bin/env tsx
/**
 * One-shot CRM scheduled due-item worker.
 * Usage: npm run crm:scheduled-worker-once
 */

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

import { processScheduledCrmBatch } from "../lib/crm/scheduled";
import { prisma } from "../lib/prisma";

async function main() {
  const result = await processScheduledCrmBatch();
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
