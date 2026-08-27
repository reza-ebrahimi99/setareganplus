import type { Metadata } from "next";
import { ExperienceCardPage } from "@/components/sxp/ExperienceCardPage";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadExperienceCards } from "@/lib/sxp/hub/load-card";
import { assertSxpEnabledOrNotFound } from "@/lib/sxp/hub/require";

export const metadata: Metadata = {
  title: "کارت دیجیتال",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentExperienceCardPage() {
  const context = await requireStudentPortalAccess();
  await assertSxpEnabledOrNotFound(context.organization.id);
  const page = await loadExperienceCards(context);
  return <ExperienceCardPage page={page} />;
}
