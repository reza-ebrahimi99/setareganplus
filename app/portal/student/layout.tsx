import { PortalAccountType } from "@/generated/prisma/enums";
import { PortalShell } from "@/components/portal/PortalShell";
import { GUIDANCE_STUDENT_PORTAL_NAV } from "@/lib/guidance/portal-nav";
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

  const extraNavItems = [
    ...(sxpEnabled ? SXP_STUDENT_NAV : []),
    ...(guidanceEnabled ? GUIDANCE_STUDENT_PORTAL_NAV : []),
  ];

  return (
    <PortalShell
      accountType={PortalAccountType.STUDENT}
      userDisplayName={context.user.displayName}
      organizationName={context.organization.name}
      showAccountSwitcher={context.links.length > 1}
      extraNavItems={extraNavItems}
    >
      {children}
    </PortalShell>
  );
}
