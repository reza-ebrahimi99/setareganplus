import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JourneyTracker } from "@/components/guidance/office/JourneyTracker";
import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";
import { loadOfficeJourneyTracker } from "@/lib/guidance/office/tracker-loader";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "نقشه مسیر مشاوره",
  robots: { index: false, follow: false },
};

export default async function MajorOfficeJourneyPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  const model = await loadOfficeJourneyTracker({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!model) redirect(GUIDANCE_ONBOARDING_PATH);

  return <JourneyTracker model={model} />;
}
