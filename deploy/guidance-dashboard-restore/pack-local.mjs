import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const dest = join(root, "deploy/guidance-dashboard-restore/files");
const list = readFileSync(
  join(root, "deploy/guidance-dashboard-restore/COPY_FILES.txt"),
  "utf8",
)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

for (const rel of list) {
  if (
    rel.includes("page.early.tsx") ||
    rel.includes("middleware.ts") ||
    rel.includes("zibal") ||
    rel.includes("schema.prisma") ||
    rel.includes("migrations/")
  ) {
    throw new Error(`refusing to pack protected path: ${rel}`);
  }
  const from = join(root, rel);
  const to = join(dest, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

console.log(`packed ${list.length} files`);
