/**
 * Pack the Choice Studio feature. Does not deploy.
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
  "lib/guidance/choice-studio/types.ts",
  "lib/guidance/choice-studio/normalize.ts",
  "lib/guidance/choice-studio/validate.ts",
  "lib/guidance/choice-studio/diff.ts",
  "lib/guidance/choice-studio/status.ts",
  "lib/guidance/choice-studio/excel.ts",
  "lib/guidance/journey-v2/choices.ts",
  "lib/guidance/journey-v2/constants.ts",
  "lib/guidance/journey-v2/labels.ts",
  "lib/guidance/journey-v2/catalog.ts",
  "lib/guidance/journey-v2/render-late-page.tsx",
  "lib/counselor-os/late-journey.ts",
  "app/admin/counselor/late-actions.ts",
  "app/admin/counselor/choices/template.xlsx/route.ts",
  "app/admin/counselor/students/[studentId]/choices/page.tsx",
  "app/admin/counselor/students/[studentId]/choices/export.xlsx/route.ts",
  "app/admin/counselor/students/[studentId]/page.tsx",
  "components/guidance/choice-studio/ChoiceStudio.tsx",
  "components/guidance/choice-studio/ChoiceStatusBadge.tsx",
  "components/guidance/choice-studio/ChoiceConfirmDialog.tsx",
  "components/guidance/choice-studio/ChoiceExcelDropzone.tsx",
  "components/guidance/choice-studio/ChoicePdfHelp.tsx",
  "components/guidance/choice-studio/ChoiceImportPreview.tsx",
  "components/guidance/choice-studio/ChoiceFeedbackSummary.tsx",
  "components/guidance/choice-studio/ChoiceDiffPanel.tsx",
  "components/guidance/choice-studio/ChoiceSanjeshMode.tsx",
  "components/guidance/v2-late/ChoiceReviewWorkspace.tsx",
  "components/guidance/v2-late/InformedConfirmPanel.tsx",
  "components/guidance/v2-late/SanjeshSubmissionPanel.tsx",
  "components/counselor-os/LatePrintDocument.tsx",
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
const start = "/* ===== GUIDANCE CHOICE STUDIO ===== */";
const end = "/* ===== END GUIDANCE CHOICE STUDIO ===== */";
const from = css.indexOf(start);
const to = css.indexOf(end);
if (from < 0 || to < 0 || to <= from) throw new Error("Choice Studio CSS markers missing");
writeFileSync(
  join(here, "guidance-choice-studio.css"),
  css.slice(from, to + end.length).replace(/\r\n/g, "\n") + "\n",
  "utf8",
);

for (const name of ["apply-production.sh", "README.md"]) {
  toLf(join(here, name));
}

console.log(`packed ${files.length} files + CSS fragment`);
