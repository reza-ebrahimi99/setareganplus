/**
 * Canonical student Guidance home.
 * Renders GuidancePlatformDashboard as the student entry screen.
 */

import { notFound, redirect } from "next/navigation";
import { GuidancePlatformDashboard } from "@/components/guidance/platform/GuidancePlatformDashboard";
import { GuidanceUniversitiesHub } from "@/components/guidance/platform/GuidanceUniversitiesHub";
import { ensureGuidanceCase } from "@/lib/guidance/external-candidate";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

type GuidancePortalServicePageProps = {
  searchParams?: Promise<{ view?: string; payment?: string }>;
};

function canonicalStep10Path(payment?: string): string {
  const base = guidanceJourneyV2StepPath(10);
  if (
    payment === "success" ||
    payment === "cancelled" ||
    payment === "failed" ||
    payment === "already-paid"
  ) {
    return `${base}?payment=${encodeURIComponent(payment)}`;
  }
  return base;
}

export default async function GuidancePortalServicePage({
  searchParams,
}: GuidancePortalServicePageProps) {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const guidanceOn = await isGuidanceEnabled(context.organization.id);
  if (!guidanceOn) {
    notFound();
  }

  // Creates the case on first visit. Does not bounce to onboarding.
  await ensureGuidanceCase({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
    flow: "guidance-dashboard",
  });

  const params = searchParams ? await searchParams : {};
  const view = params.view ?? "dashboard";

  if (view === "majors") {
    redirect("/discover/majors");
  }

  if (view === "plans") {
    redirect(canonicalStep10Path(params.payment));
  }

  if (view === "universities") {
    return <GuidanceUniversitiesHub />;
  }

  const authorized = context.authorizedStudents.find(
    (row) => row.studentId === studentId,
  );

  return (
    <GuidancePlatformDashboard
      studentName={authorized?.studentName || context.user.displayName}
      journey={null}
      analysis={null}
    />
  );
}
