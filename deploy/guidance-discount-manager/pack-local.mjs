/**
 * Local packer for the guidance discount-code manager. Does not deploy.
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
  "lib/guidance/discounts/packages.ts",
  "lib/guidance/discounts/money.ts",
  "lib/guidance/discounts/legacy.ts",
  "lib/guidance/discounts/generate.ts",
  "lib/guidance/discounts/quote.ts",
  "lib/guidance/discounts/store.ts",
  "lib/guidance/discounts/student.ts",
  "lib/guidance/journey/payment.ts",
  "app/admin/(dashboard)/guidance/discounts/page.tsx",
  "app/admin/(dashboard)/guidance/discounts/actions.ts",
  "components/admin/guidance/DiscountCodeManager.tsx",
  "prisma/migrations/20260905220000_guidance_discount_codes/migration.sql",
];

const forbidden = [
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx",
  "middleware.ts",
  "lib/payment/providers/zibal.ts",
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

const css = readFileSync(join(root, "app/globals.css"), "utf8");
const start = "/* ===== GUIDANCE DISCOUNT MANAGER ===== */";
const end = "/* ===== END GUIDANCE DISCOUNT MANAGER ===== */";
const from = css.indexOf(start);
const to = css.indexOf(end);
if (from < 0 || to < 0 || to <= from) throw new Error("discount CSS markers missing");
writeFileSync(
  join(here, "guidance-discount-manager.css"),
  css.slice(from, to + end.length).replace(/\r\n/g, "\n") + "\n",
  "utf8",
);

for (const name of [
  "apply-production.sh",
  "merge_schema.py",
  "patch_step10.py",
  "README.md",
  "schema-guidance-discount.prisma",
]) {
  toLf(join(here, name));
}

console.log(`packed ${files.length} files + CSS fragment`);
