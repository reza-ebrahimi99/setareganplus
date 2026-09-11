/**
 * Pack the counselor scheduling fix. Does not deploy.
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
  "lib/counselor-os/advisor.ts",
  "lib/counselor-os/profiles.ts",
  "lib/counselor-os/schedule.ts",
  "lib/counselor-os/booking.ts",
  "app/admin/counselor/calendar/page.tsx",
  "app/admin/counselor/settings/page.tsx",
  "app/admin/counselor/actions.ts",
  "components/counselor-os/CounselorScheduleForm.tsx",
  "components/counselor-os/CounselorCalendarSelect.tsx",
];

const forbidden = [
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx",
  "middleware.ts",
  "lib/payment/providers/zibal.ts",
  "lib/payment/providers/zibal-http.ts",
  "lib/guidance/journey/payment.ts",
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
const start = "/* ===== COUNSELOR SCHEDULING FIX ===== */";
const end = "/* ===== END COUNSELOR SCHEDULING FIX ===== */";
const from = css.indexOf(start);
const to = css.indexOf(end);
if (from < 0 || to < 0 || to <= from) throw new Error("scheduling CSS markers missing");
writeFileSync(
  join(here, "counselor-scheduling-fix.css"),
  css.slice(from, to + end.length).replace(/\r\n/g, "\n") + "\n",
  "utf8",
);

for (const name of ["apply-production.sh", "README.md"]) {
  toLf(join(here, name));
}

console.log(`packed ${files.length} files + CSS fragment`);
