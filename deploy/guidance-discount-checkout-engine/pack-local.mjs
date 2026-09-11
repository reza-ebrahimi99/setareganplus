/**
 * Pack the discount + checkout engine. Does not deploy.
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
  "lib/guidance/discounts/engine.ts",
  "lib/guidance/discounts/money.ts",
  "lib/guidance/discounts/quote.ts",
  "lib/guidance/discounts/student.ts",
  "lib/guidance/discounts/store.ts",
  "lib/guidance/discounts/legacy.ts",
  "lib/guidance/discounts/status.ts",
  "lib/guidance/discounts/validate.ts",
  "lib/guidance/discounts/generate.ts",
  "lib/guidance/discounts/packages.ts",
  "lib/guidance/packages/resolve-payable.ts",
  "lib/guidance/checkout/financials.ts",
  "lib/guidance/journey/payment.ts",
  "app/admin/(dashboard)/guidance/discounts/page.tsx",
  "app/admin/(dashboard)/guidance/discounts/actions.ts",
  "components/admin/guidance/DiscountCodeManager.tsx",
  "components/guidance/journey-v2/PackagePaymentV2Step.tsx",
  "components/guidance/journey-v2/GuidanceJourneyV2Nav.tsx",
  "app/portal/student/services/guidance/journey/steps/actions/step10.ts",
  "app/payments/callback/guidance/page.tsx",
  "app/payments/mock/guidance-checkout/[sessionId]/actions.ts",
  "scripts/guidance-discount-engine-unit-tests.ts",
  "scripts/guidance-checkout-handoff-unit-tests.ts",
];

const forbidden = [
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx",
  "middleware.ts",
  "lib/payment/providers/zibal.ts",
  "lib/payment/providers/zibal-http.ts",
  "lib/guidance/journey-v2/steps/step10-packages.ts",
  "prisma/schema.prisma",
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

const spinner = [
  ".gjv2-nav__spinner {",
  "  width: 1rem;",
  "  height: 1rem;",
  "  border: 2px solid rgb(255 255 255 / 0.35);",
  "  border-top-color: #fff;",
  "  border-radius: 999px;",
  "  animation: gjv2-spin 0.7s linear infinite;",
  "}",
  "@keyframes gjv2-spin {",
  "  to { transform: rotate(360deg); }",
  "}",
].join("\n");
writeFileSync(join(here, "guidance-checkout-spinner.css"), `${spinner}\n`, "utf8");

for (const name of ["apply-production.sh", "patch_step10_checkout.py", "README.md"]) {
  const path = join(here, name);
  if (existsSync(path)) toLf(path);
}

console.log(`packed ${files.length} files + CSS fragments`);
