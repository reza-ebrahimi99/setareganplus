/**
 * Pack the guidance Zibal callback hotfix. Does not deploy.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function toLf(file) {
  writeFileSync(file, readFileSync(file, "utf8").replace(/\r\n/g, "\n"), "utf8");
}

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const dest = join(here, "files");

const files = [
  "lib/payment/providers/zibal.ts",
  "lib/guidance/journey/payment.ts",
];

const forbidden = [
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx",
  "middleware.ts",
  "lib/payment/providers/zibal-http.ts",
  "app/payments/callback/zibal/page.tsx",
  "app/payments/callback/guidance/page.tsx",
];

for (const rel of forbidden) {
  if (files.includes(rel)) throw new Error(`refusing to pack forbidden file: ${rel}`);
}

function copyRel(rel) {
  const from = join(root, rel);
  const to = join(dest, rel);
  if (!existsSync(from)) throw new Error(`missing source: ${rel}`);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

mkdirSync(dest, { recursive: true });
for (const rel of files) copyRel(rel);

for (const name of ["apply-production.sh", "README.md"]) {
  toLf(join(here, name));
}

console.log(`packed ${files.length} files`);
