import { PortalAccountType } from "@/generated/prisma/enums";
import { PortalShell } from "@/components/portal/PortalShell";
import { SxpMobileTabBar } from "@/components/sxp/SxpMobileTabBar";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { isSxpEnabled, isSxpFilesEnabled } from "@/lib/sxp/flags";
import { SXP_STUDENT_MORE_NAV, studentSxpNav } from "@/lib/sxp/nav";
import { SXP_STUDENT_PATHS } from "@/lib/sxp/hub/paths";

export const dynamic = "force-dynamic";

export default async function StudentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await requireStudentPortalAccess();
  const sxpEnabled = await isSxpEnabled(context.organization.id);
  const filesEnabled = sxpEnabled
    ? await isSxpFilesEnabled(context.organization.id)
    : false;

  return (
    <PortalShell
      accountType={PortalAccountType.STUDENT}
      userDisplayName={context.user.displayName}
      organizationName={context.organization.name}
      showAccountSwitcher={context.links.length > 1}
      extraNavItems={sxpEnabled ? studentSxpNav(filesEnabled) : []}
      hideNavOnMobile={sxpEnabled}
      mobileTabBar={
        sxpEnabled ? (
          <SxpMobileTabBar
            homeHref={SXP_STUDENT_PATHS.experience}
            timelineHref={SXP_STUDENT_PATHS.timeline}
            cardHref={SXP_STUDENT_PATHS.card}
            filesHref={filesEnabled ? SXP_STUDENT_PATHS.files : undefined}
            moreItems={SXP_STUDENT_MORE_NAV}
          />
        ) : null
      }
    >
      {children}
    </PortalShell>
  );
}
