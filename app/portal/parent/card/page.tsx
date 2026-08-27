import type { Metadata } from "next";
import { ExperienceCardPage } from "@/components/sxp/ExperienceCardPage";
import { requireGuardianPortalAccess } from "@/lib/portal/auth";
import { loadExperienceCards } from "@/lib/sxp/hub/load-card";
import { assertSxpEnabledOrNotFound } from "@/lib/sxp/hub/require";

export const metadata: Metadata = {
  title: "کارت دیجیتال",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ParentExperienceCardPage() {
  const context = await requireGuardianPortalAccess();
  await assertSxpEnabledOrNotFound(context.organization.id);
  const page = await loadExperienceCards(context);
  return <ExperienceCardPage page={page} />;
}
