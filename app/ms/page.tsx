import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OfficeHome } from "@/components/guidance/office/OfficeHome";
import { loadOfficeDashboard } from "@/lib/guidance/office/dashboard";
import {
  GUIDANCE_ONBOARDING_PATH,
  ensureGuidanceCase,
} from "@/lib/guidance/external-candidate";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دفتر انتخاب رشته",
  robots: { index: false, follow: false },
};

export default async function MajorOfficeHomePage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  await ensureGuidanceCase({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
    flow: "office-home",
  });

  const model = await loadOfficeDashboard({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!model) redirect(GUIDANCE_ONBOARDING_PATH);

  return <OfficeHome model={model} />;
}
