import { PortalAccountType } from "@/generated/prisma/enums";
import { PortalShell } from "@/components/portal/PortalShell";
import { SxpMobileTabBar } from "@/components/sxp/SxpMobileTabBar";
import { requireGuardianPortalAccess } from "@/lib/portal/auth";
import { isSxpEnabled, isSxpFilesEnabled } from "@/lib/sxp/flags";
import { SXP_PARENT_MORE_NAV, parentSxpNav } from "@/lib/sxp/nav";
import { SXP_PARENT_PATHS } from "@/lib/sxp/hub/paths";

export const dynamic = "force-dynamic";

export default async function ParentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await requireGuardianPortalAccess();
  const sxpEnabled = await isSxpEnabled(context.organization.id);
  const filesEnabled = sxpEnabled
    ? await isSxpFilesEnabled(context.organization.id)
    : false;

  return (
    <PortalShell
      accountType={PortalAccountType.GUARDIAN}
      userDisplayName={context.user.displayName}
      organizationName={context.organization.name}
      showAccountSwitcher={context.links.length > 1}
      extraNavItems={sxpEnabled ? parentSxpNav(filesEnabled) : []}
      hideNavOnMobile={sxpEnabled}
      mobileTabBar={
        sxpEnabled ? (
          <SxpMobileTabBar
            homeHref={SXP_PARENT_PATHS.experience}
            timelineHref={SXP_PARENT_PATHS.timeline}
            cardHref={SXP_PARENT_PATHS.card}
            filesHref={filesEnabled ? SXP_PARENT_PATHS.files : undefined}
            moreItems={SXP_PARENT_MORE_NAV}
          />
        ) : null
      }
    >
      {children}
    </PortalShell>
  );
}
