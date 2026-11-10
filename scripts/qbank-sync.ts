/**
 * Pull questions from the institute bank.
 *   npm run classes:qbank-sync
 * Reads QBANK_API_URL and QBANK_API_TOKEN from .env. The token is never printed.
 * QBANK_FILE=path.json imports a local export instead of calling the API.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../lib/prisma";
import type { BankInput } from "../lib/classes/bank";
import { ensureDefaultChapters, importBankItems, readChapterCatalog, syncQbank } from "../lib/classes/bank-sync";

async function main() {
  const chapters = await readChapterCatalog();
  const mapped = await ensureDefaultChapters(chapters);
  const file = process.env.QBANK_FILE?.trim();
  if (file) {
    const items = JSON.parse(readFileSync(file, "utf8")) as BankInput[];
    const done = await importBankItems(items);
    const maxId = done.maxId;
    await prisma.bankSync.upsert({
      where: { id: "main" },
      create: { id: "main", sinceId: maxId, imported: done.imported, skipped: done.skipped, note: "file" },
      update: { sinceId: maxId, imported: done.imported, skipped: done.skipped, note: "file", ranAt: new Date() },
    });
    console.log(`file import: saved ${done.imported}, skipped ${done.skipped}, chapter links +${mapped}`);
    return;
  }
  const result = await syncQbank();
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(`api sync: saved ${result.imported}, skipped ${result.skipped}, cursor ${result.sinceId}, chapter links +${mapped}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : "sync failed");
    await prisma.$disconnect();
    process.exit(1);
  });
