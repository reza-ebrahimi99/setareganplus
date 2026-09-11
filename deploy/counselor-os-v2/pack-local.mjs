/**
 * Local-only packer: copies the allowlisted Counselor OS v2 sources into files/.
 * Does not deploy. Safe to re-run.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const dest = join(here, "files");

const files = [
  "lib/counselor-os/advisor.ts",
  "lib/counselor-os/appointments.ts",
  "lib/counselor-os/auth.ts",
  "lib/counselor-os/booking.ts",
  "lib/counselor-os/constants.ts",
  "lib/counselor-os/corrections.ts",
  "lib/counselor-os/dashboard.ts",
  "lib/counselor-os/finance.ts",
  "lib/counselor-os/follow-ups.ts",
  "lib/counselor-os/host.ts",
  "lib/counselor-os/index.ts",
  "lib/counselor-os/labels.ts",
  "lib/counselor-os/notes.ts",
  "lib/counselor-os/reports.ts",
  "lib/counselor-os/sessions.ts",
  "lib/counselor-os/student-advisor.ts",
  "lib/counselor-os/students.ts",
  "lib/counselor-os/v2-catalog.ts",
  "lib/counselor-os/v2-dossier.ts",
  "lib/counselor-os/view-models.ts",
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
  "components/counselor-os/AvailabilityRuleForm.tsx",
  "components/counselor-os/CounselorShell.tsx",
  "components/counselor-os/CounselorStudentCaseTabs.tsx",
  "components/counselor-os/OpenSessionButton.tsx",
  "components/counselor-os/SessionWorkspaceForm.tsx",
  "content/admin.ts",
  "prisma/migrations/20260904080000_counselor_os_case_corrections/migration.sql",
];

for (const rel of files) {
  const src = join(root, rel);
  if (!existsSync(src)) throw new Error(`missing ${rel}`);
  const out = join(dest, rel);
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(src, out);
}
console.log(`packed ${files.length} files into ${dest}`);
