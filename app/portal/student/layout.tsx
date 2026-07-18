import { PortalAccountType } from "@/generated/prisma/enums";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function StudentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await requireStudentPortalAccess();

  return (
    <PortalShell
      accountType={PortalAccountType.STUDENT}
      userDisplayName={context.user.displayName}
      organizationName={context.organization.name}
      showAccountSwitcher={context.links.length > 1}
    >
      {children}
    </PortalShell>
  );
}
