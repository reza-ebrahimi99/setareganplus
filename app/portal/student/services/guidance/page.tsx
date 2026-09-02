/**
 * Guidance Platform — student dashboard home.
 * Presentation + lightweight view routing only.
 */

import { notFound, redirect } from "next/navigation";
import { GuidanceStudentDashboardPanels } from "@/components/guidance/office/GuidanceStudentDashboardPanels";
import { GuidanceUniversitiesHub } from "@/components/guidance/platform/GuidanceUniversitiesHub";
import { prisma } from "@/lib/prisma";
import {
  GUIDANCE_ONBOARDING_PATH,
  candidateNeedsGuidanceOnboarding,
  ensureGuidanceCase,
} from "@/lib/guidance/external-candidate";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { GUIDANCE_STEPS_ENTRY } from "@/lib/guidance/portal-nav";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { loadOfficeDashboard } from "@/lib/guidance/office/dashboard";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

type GuidancePortalServicePageProps = {
  searchParams?: Promise<{ view?: string }>;
};

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

  const needs = await candidateNeedsGuidanceOnboarding({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (needs) {
    redirect(GUIDANCE_ONBOARDING_PATH);
  }

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

  if (view === "universities") {
    return <GuidanceUniversitiesHub />;
  }

  if (view === "appointments") {
    const { StudentCounselingPanel } = await import(
      "@/components/counselor-os/StudentCounselingPanel"
    );
    const student = await prisma.student.findFirst({
      where: {
        organizationId: context.organization.id,
        id: studentId,
        deletedAt: null,
      },
      select: { firstName: true, lastName: true },
    });
    return (
      <StudentCounselingPanel
        organizationId={context.organization.id}
        studentId={studentId}
        userId={context.user.id}
        studentFirstName={student?.firstName ?? context.user.firstName}
        studentLastName={student?.lastName ?? context.user.lastName}
        mobile={context.user.mobile ?? ""}
        mode="full"
      />
    );
  }

  const [model, plan, counselingCard] = await Promise.all([
    loadOfficeDashboard({
      organizationId: context.organization.id,
      userId: context.user.id,
      studentId,
    }),
    loadGuidanceJourneyPlan({
      organizationId: context.organization.id,
      userId: context.user.id,
      studentId,
    }),
    (async () => {
      const { StudentCounselingPanel } = await import(
        "@/components/counselor-os/StudentCounselingPanel"
      );
      const student = await prisma.student.findFirst({
        where: {
          organizationId: context.organization.id,
          id: studentId,
          deletedAt: null,
        },
        select: { firstName: true, lastName: true },
      });
      return StudentCounselingPanel({
        organizationId: context.organization.id,
        studentId,
        userId: context.user.id,
        studentFirstName: student?.firstName ?? context.user.firstName,
        studentLastName: student?.lastName ?? context.user.lastName,
        mobile: context.user.mobile ?? "",
        mode: "card",
      });
    })(),
  ]);
  if (!model || !plan) {
    redirect(GUIDANCE_ONBOARDING_PATH);
  }

  return (
    <GuidanceStudentDashboardPanels
      model={model}
      userDisplayName={model.studentName}
      journeyContinueHref={GUIDANCE_STEPS_ENTRY}
      counselingCard={counselingCard}
    />
  );
}
