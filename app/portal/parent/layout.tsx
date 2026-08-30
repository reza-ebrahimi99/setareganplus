import { PortalAccountType } from "@/generated/prisma/enums";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireGuardianPortalAccess } from "@/lib/portal/auth";
import { isSxpEnabled } from "@/lib/sxp/flags";
import { SXP_PARENT_NAV } from "@/lib/sxp/nav";

export const dynamic = "force-dynamic";

export default async function ParentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await requireGuardianPortalAccess();
  const sxpEnabled = await isSxpEnabled(context.organization.id);

  return (
    <PortalShell
      accountType={PortalAccountType.GUARDIAN}
      userDisplayName={context.user.displayName}
      organizationName={context.organization.name}
      showAccountSwitcher={context.links.length > 1}
      extraNavItems={sxpEnabled ? SXP_PARENT_NAV : []}
    >
      {children}
    </PortalShell>
  );
}
