/**
 * Pack counselor workflow master fix. Does not deploy.
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
  "lib/guidance/journey-v2/booking-gate.ts",
  "lib/guidance/journey-v2/choice-feedback-map.ts",
  "lib/guidance/journey-v2/advance.ts",
  "lib/guidance/journey-v2/appointments.ts",
  "lib/guidance/journey-v2/choices.ts",
  "lib/guidance/journey-v2/constants.ts",
  "lib/guidance/choice-studio/status.ts",
  "lib/counselor-os/schedule-windows.ts",
  "lib/counselor-os/booking.ts",
  "lib/counselor-os/schedule.ts",
  "lib/counselor-os/follow-ups.ts",
  "lib/counselor-os/late-journey.ts",
  "lib/booking/generate-slots.ts",
  "app/portal/student/services/guidance/journey/steps/actions/late.ts",
  "app/admin/counselor/actions.ts",
  "app/admin/counselor/late-actions.ts",
  "app/admin/counselor/calendar/page.tsx",
  "app/admin/counselor/settings/page.tsx",
  "app/admin/counselor/follow-ups/page.tsx",
  "components/guidance/v2-late/SessionBookingPanel.tsx",
  "components/guidance/v2-late/ChoiceReviewWorkspace.tsx",
  "components/guidance/choice-studio/ChoiceStudio.tsx",
  "components/guidance/choice-studio/ChoiceConfirmDialog.tsx",
  "components/counselor-os/CounselorScheduleForm.tsx",
  "components/counselor-os/CounselorStudentCaseTabs.tsx",
  "components/counselor-os/SessionWorkspaceForm.tsx",
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
const fragments = [
  ["guidance-v2-late.css", "/* ===== GUIDANCE V2 STEPS 11-18 ===== */", "/* ===== END GUIDANCE V2 STEPS 11-18 ===== */"],
  ["guidance-choice-studio.css", "/* ===== GUIDANCE CHOICE STUDIO ===== */", "/* ===== END GUIDANCE CHOICE STUDIO ===== */"],
];
for (const [name, start, end] of fragments) {
  const from = css.indexOf(start);
  const to = css.indexOf(end);
  if (from < 0 || to < 0 || to <= from) throw new Error(`CSS markers missing for ${name}`);
  writeFileSync(
    join(here, name),
    css.slice(from, to + end.length).replace(/\r\n/g, "\n") + "\n",
    "utf8",
  );
}

for (const name of ["apply-production.sh", "README.md"]) {
  toLf(join(here, name));
}

console.log(`packed ${files.length} files + 2 CSS fragments`);
