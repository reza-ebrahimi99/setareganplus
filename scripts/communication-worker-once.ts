#!/usr/bin/env tsx
/**
 * One-shot SMS queue worker (StarOS v0.6A).
 *
 * Usage:
 *   npm run communication:worker-once
 *
 * Does NOT run forever — process a bounded batch and exit.
 * Suitable for cron / systemd timer. Never embed an infinite loop in Next.js.
 */

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Ensure .env exists, then run: npm run communication:worker-once",
  );
  process.exit(1);
}

import { processPendingSmsBatch } from "../lib/communication/queue";
import { prisma } from "../lib/prisma";

async function main() {
  const limitRaw = Number(process.env.STAROS_SMS_WORKER_BATCH ?? 20);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 50)
      : 20;

  const result = await processPendingSmsBatch(limit);
  console.log(
    JSON.stringify({
      ok: true,
      claimed: result.claimed,
      sent: result.sent,
      failed: result.failed,
    }),
  );
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
