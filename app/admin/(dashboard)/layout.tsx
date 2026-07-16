import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { PERMISSIONS, permissionsForRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // TODO(auth): password recovery, OTP, multi-org switcher, fine-grained permissions.
  const session = await requireAdminSession();

  return (
    <AdminShell
      userDisplayName={session.user.displayName}
      organizationName={session.organization.name}
      permissions={[
        ...(session.user.isPlatformAdmin
          ? PERMISSIONS
          : permissionsForRole(session.membership.role)),
      ]}
    >
      {children}
    </AdminShell>
  );
}
