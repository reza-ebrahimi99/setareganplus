import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { StudentPortalShell } from "@/components/portal/StudentPortalShell";
import { buildStudentPortalNavSections } from "@/components/portal/nav/types";
import {
  GUIDANCE_ONBOARDING_PATH,
  candidateNeedsGuidanceOnboarding,
} from "@/lib/guidance/external-candidate";
import {
  GUIDANCE_PLATFORM_NAV_SECTIONS,
  GUIDANCE_STUDENT_PORTAL_NAV,
} from "@/lib/guidance/portal-nav";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { isSxpEnabled } from "@/lib/sxp/flags";
import { SXP_STUDENT_NAV } from "@/lib/sxp/nav";

export const dynamic = "force-dynamic";

export default async function StudentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await requireStudentPortalAccess();
  const [sxpEnabled, guidanceEnabled] = await Promise.all([
    isSxpEnabled(context.organization.id),
    isGuidanceEnabled(context.organization.id),
  ]);

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  const onGuidance = pathname.startsWith("/portal/student/services/guidance");
  const onOnboarding = pathname.startsWith(GUIDANCE_ONBOARDING_PATH);
  const studentId = context.activeLink.studentId;

  if (guidanceEnabled && studentId && pathname && !onOnboarding) {
    const needsOnboarding = await candidateNeedsGuidanceOnboarding({
      organizationId: context.organization.id,
      userId: context.user.id,
      studentId,
    });
    if (needsOnboarding) {
      redirect(GUIDANCE_ONBOARDING_PATH);
    }
  }

  if (onOnboarding) {
    return children;
  }

  const sections = buildStudentPortalNavSections({
    experienceItems: sxpEnabled ? SXP_STUDENT_NAV : undefined,
    serviceItems: guidanceEnabled ? GUIDANCE_STUDENT_PORTAL_NAV : undefined,
  });

  return (
    <StudentPortalShell
      sections={sections}
      guidanceSections={
        guidanceEnabled ? GUIDANCE_PLATFORM_NAV_SECTIONS : null
      }
      userDisplayName={context.user.displayName}
      organizationName={context.organization.name}
      showAccountSwitcher={context.links.length > 1}
    >
      {children}
    </StudentPortalShell>
  );
}
