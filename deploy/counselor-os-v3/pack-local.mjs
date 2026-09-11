/**
 * Local-only packer: copies allowlisted Counselor OS v3 sources into files/
 * and extracts the V3 CSS fragment. Does not deploy. Safe to re-run.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
  "schema-counselor-os-v3.prisma",
]) {
  toLf(join(here, name));
}

const files = [
  "lib/counselor-os/advisor.ts",
  "lib/counselor-os/appointments.ts",
  "lib/counselor-os/assignments.ts",
  "lib/counselor-os/auth.ts",
  "lib/counselor-os/booking.ts",
  "lib/counselor-os/constants.ts",
  "lib/counselor-os/corrections.ts",
  "lib/counselor-os/dashboard.ts",
  "lib/counselor-os/finance.ts",
  "lib/counselor-os/follow-ups.ts",
  "lib/counselor-os/holland.ts",
  "lib/counselor-os/host.ts",
  "lib/counselor-os/index.ts",
  "lib/counselor-os/labels.ts",
  "lib/counselor-os/notes.ts",
  "lib/counselor-os/profiles.ts",
  "lib/counselor-os/reports.ts",
  "lib/counselor-os/revenue.ts",
  "lib/counselor-os/sessions.ts",
  "lib/counselor-os/student-advisor.ts",
  "lib/counselor-os/students.ts",
  "lib/counselor-os/v2-catalog.ts",
  "lib/counselor-os/v2-dossier.ts",
  "lib/counselor-os/view-models.ts",
  "lib/guidance/journey-v2/holland/profiles.ts",
  "app/admin/counselor/actions.ts",
  "app/admin/counselor/layout.tsx",
  "app/admin/counselor/page.tsx",
  "app/admin/counselor/appointments/page.tsx",
  "app/admin/counselor/calendar/page.tsx",
  "app/admin/counselor/follow-ups/page.tsx",
  "app/admin/counselor/settings/page.tsx",
  "app/admin/counselor/sessions/[sessionId]/page.tsx",
  "app/admin/counselor/students/page.tsx",
  "app/admin/counselor/students/[studentId]/page.tsx",
  "app/admin/counselor/students/[studentId]/export/[kind]/page.tsx",
  "app/admin/counselor/students/[studentId]/documents/[documentId]/download/route.ts",
  "app/admin/counselor/counselors/page.tsx",
  "app/admin/counselor/counselors/[counselorId]/page.tsx",
  "components/counselor-os/AvailabilityRuleForm.tsx",
  "components/counselor-os/CounselorDetailForms.tsx",
  "components/counselor-os/CounselorHollandPanel.tsx",
  "components/counselor-os/CounselorShell.tsx",
  "components/counselor-os/CounselorStudentCaseTabs.tsx",
  "components/counselor-os/CreateCounselorForm.tsx",
  "components/counselor-os/HollandScoreChart.tsx",
  "components/counselor-os/OpenSessionButton.tsx",
  "components/counselor-os/SessionWorkspaceForm.tsx",
  "components/guidance/journey-v2/HollandResultV2Step.tsx",
  "prisma/migrations/20260904133000_counselor_os_v3_profile/migration.sql",
];

const forbidden = [
  "question-bank.ts",
  "holland/scoring",
  "holland/store",
  "StudentCounselingPanel",
  "StudentCounselingBookingForm",
  "middleware.ts",
];

for (const rel of files) {
  if (forbidden.some((needle) => rel.includes(needle))) {
    throw new Error(`refusing to pack forbidden path: ${rel}`);
  }
  const src = join(root, rel);
  if (!existsSync(src)) throw new Error(`missing ${rel}`);
  const out = join(dest, rel);
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(src, out);
}

const css = readFileSync(join(root, "app/globals.css"), "utf8");
const start = "/* ===== COUNSELOR OS V3 ===== */";
const end = "/* ===== END COUNSELOR OS V3 ===== */";
const from = css.indexOf(start);
const to = css.indexOf(end);
if (from < 0 || to < 0 || to <= from) {
  throw new Error("COUNSELOR OS V3 CSS markers missing in app/globals.css");
}
writeFileSync(
  join(here, "counselor-os-v3.css"),
  `${css.slice(from, to + end.length).trim()}\n`.replace(/\r\n/g, "\n"),
  "utf8",
);

console.log(`packed ${files.length} files into ${dest}`);
