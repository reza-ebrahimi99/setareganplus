import { PortalAccountType } from "@/generated/prisma/enums";
import { PortalShell } from "@/components/portal/PortalShell";
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
  const sxpEnabled = await isSxpEnabled(context.organization.id);

  return (
    <PortalShell
      accountType={PortalAccountType.STUDENT}
      userDisplayName={context.user.displayName}
      organizationName={context.organization.name}
      showAccountSwitcher={context.links.length > 1}
      extraNavItems={sxpEnabled ? SXP_STUDENT_NAV : []}
    >
      {children}
    </PortalShell>
  );
}
