import { PortalAccountType } from "@/generated/prisma/enums";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireGuardianPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function ParentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await requireGuardianPortalAccess();

  return (
    <PortalShell
      accountType={PortalAccountType.GUARDIAN}
      userDisplayName={context.user.displayName}
      organizationName={context.organization.name}
      showAccountSwitcher={context.links.length > 1}
    >
      {children}
    </PortalShell>
  );
}
