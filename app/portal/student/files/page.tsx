import type { Metadata } from "next";
import { ExperienceFilesList } from "@/components/sxp/ExperienceFilesList";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadExperienceFiles } from "@/lib/sxp/hub/load-files";
import { assertSxpFilesEnabledOrNotFound } from "@/lib/sxp/hub/require";

export const metadata: Metadata = {
  title: "فایل‌ها",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentExperienceFilesPage() {
  const context = await requireStudentPortalAccess();
  await assertSxpFilesEnabledOrNotFound(context.organization.id);
  const page = await loadExperienceFiles(context);
  return <ExperienceFilesList page={page} />;
}
