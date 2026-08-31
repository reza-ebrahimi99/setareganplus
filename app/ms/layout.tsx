import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { MajorOfficeShell } from "@/components/guidance/office/MajorOfficeShell";
import {
  GUIDANCE_ONBOARDING_PATH,
  candidateNeedsGuidanceOnboarding,
} from "@/lib/guidance/external-candidate";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { MAJOR_OFFICE_HOME } from "@/lib/guidance/office/nav";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function MajorOfficeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await requireStudentPortalAccess();
  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) notFound();

  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const needs = await candidateNeedsGuidanceOnboarding({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (needs) {
    redirect(GUIDANCE_ONBOARDING_PATH);
  }

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? MAJOR_OFFICE_HOME;

  return (
    <MajorOfficeShell
      userDisplayName={context.user.displayName}
      statusLabel="دفتر انتخاب رشته"
      pathname={pathname}
    >
      {children}
    </MajorOfficeShell>
  );
}
