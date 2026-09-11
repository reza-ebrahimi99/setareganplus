/**
 * Local-only packer: copies allowlisted Guidance V2 Steps 11–18 sources into files/
 * and extracts the CSS fragment. Does not deploy. Safe to re-run.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

function toLf(file) {
  writeFileSync(file, readFileSync(file, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n"), "utf8");
}

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const dest = join(here, "files");

for (const name of [
  "apply-production.sh",
  "merge_schema.py",
  "README.md",
  ".gitattributes",
  "schema-guidance-v2-late.prisma",
]) {
  toLf(join(here, name));
}

const files = [
  "lib/guidance/journey-v2/catalog.ts",
  "lib/guidance/journey-v2/constants.ts",
  "lib/guidance/journey-v2/labels.ts",
  "lib/guidance/journey-v2/plan.ts",
  "lib/guidance/journey-v2/state.ts",
  "lib/guidance/journey-v2/guard.ts",
  "lib/guidance/journey-v2/advance.ts",
  "lib/guidance/journey-v2/appointments.ts",
  "lib/guidance/journey-v2/documents.ts",
  "lib/guidance/journey-v2/konkur.ts",
  "lib/guidance/journey-v2/konkur-shared.ts",
  "lib/booking/generate-slots.ts",
  "lib/counselor-os/schedule.ts",
  "lib/forms/file-upload-config.ts",
  "components/guidance/shared/GuidanceFileUploadField.tsx",
  "components/counselor-os/CounselorScheduleForm.tsx",
  "app/admin/counselor/actions.ts",
  "app/admin/counselor/calendar/page.tsx",
  "app/admin/counselor/settings/page.tsx",
  "lib/guidance/journey-v2/choices.ts",
  "lib/guidance/journey-v2/sanjesh.ts",
  "lib/guidance/journey-v2/completion.ts",
  "lib/guidance/journey-v2/render-late-page.tsx",
  "lib/counselor-os/booking.ts",
  "lib/counselor-os/dashboard.ts",
  "lib/counselor-os/appointments.ts",
  "lib/counselor-os/reports.ts",
  "lib/counselor-os/late-journey.ts",
  "lib/counselor-os/late-reports.ts",
  "app/portal/student/services/guidance/steps/page.tsx",
  "app/portal/student/services/guidance/journey/steps/page.tsx",
  "app/portal/student/services/guidance/journey/steps/[step]/page.tsx",
  "app/portal/student/services/guidance/journey/steps/actions/late.ts",
  "app/portal/student/services/guidance/journey/advisor-photo/route.ts",
  "app/portal/student/services/guidance/documents/[documentId]/download/route.ts",
  "app/admin/counselor/late-actions.ts",
  "app/admin/counselor/appointments/page.tsx",
  "app/admin/counselor/students/[studentId]/page.tsx",
  "app/admin/counselor/students/[studentId]/choices/page.tsx",
  "app/admin/counselor/students/[studentId]/export/[kind]/page.tsx",
  "components/guidance/v2-late/LateStepShell.tsx",
  "components/guidance/v2-late/SessionBookingPanel.tsx",
  "components/guidance/v2-late/KonkurResultForm.tsx",
  "components/guidance/v2-late/WaitingStatusCard.tsx",
  "components/guidance/v2-late/ChoiceReviewWorkspace.tsx",
  "components/guidance/v2-late/InformedConfirmPanel.tsx",
  "components/guidance/v2-late/SanjeshSubmissionPanel.tsx",
  "components/guidance/v2-late/JourneyCompleteCard.tsx",
  "components/counselor-os/ChoiceWorkspace.tsx",
  "components/counselor-os/CounselorLateJourneyPanel.tsx",
  "components/counselor-os/CounselorStudentCaseTabs.tsx",
  "components/counselor-os/LatePrintDocument.tsx",
  "prisma/migrations/20260904180000_guidance_v2_steps_11_18/migration.sql",
];

const forbidden = [
  "lib/guidance/journey-v2/holland/question-bank.ts",
  "lib/guidance/journey-v2/holland/scoring.ts",
  "lib/guidance/journey-v2/holland/store.ts",
  "lib/guidance/journey-v2/steps.ts",
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx",
  "middleware.ts",
  "lib/payment/providers/zibal.ts",
];

for (const rel of forbidden) {
  if (files.includes(rel)) {
    throw new Error(`refusing to pack forbidden file: ${rel}`);
  }
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
const start = "/* ===== GUIDANCE V2 STEPS 11-18 ===== */";
const end = "/* ===== END GUIDANCE V2 STEPS 11-18 ===== */";
const from = css.indexOf(start);
const to = css.indexOf(end);
if (from < 0 || to < 0 || to <= from) {
  throw new Error("CSS markers missing in app/globals.css");
}
const fragment = css.slice(from, to + end.length).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
writeFileSync(join(here, "guidance-v2-late.css"), fragment.endsWith("\n") ? fragment : `${fragment}\n`, "utf8");

toLf(join(here, "apply-production.sh"));
toLf(join(here, "guidance-v2-late.css"));
toLf(join(root, "prisma/migrations/20260904180000_guidance_v2_steps_11_18/migration.sql"));
toLf(join(dest, "prisma/migrations/20260904180000_guidance_v2_steps_11_18/migration.sql"));

console.log(`packed ${files.length} files + CSS fragment`);
