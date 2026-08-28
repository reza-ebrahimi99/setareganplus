import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { PERMISSIONS, permissionsForRole } from "@/lib/auth/permissions";
import { isBookCommerceEnabled } from "@/lib/books/flags";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // TODO(auth): password recovery, OTP, multi-org switcher, fine-grained permissions.
  const session = await requireAdminSession();

  const rolePermissions = session.user.isPlatformAdmin
    ? PERMISSIONS
    : [...permissionsForRole(session.membership.role)];

  // Book Commerce ERP nav/pages stay invisible unless the org flag is on, even
  // for roles that structurally hold books.* (owner/admin). The flag is the
  // master switch (default OFF) — RBAC alone must not be enough to see it.
  const bookCommerceOn = await isBookCommerceEnabled(session.organization.id);
  const permissions = bookCommerceOn
    ? rolePermissions
    : rolePermissions.filter((permission) => !permission.startsWith("books."));

  return (
    <AdminShell
      userDisplayName={session.user.displayName}
      organizationName={session.organization.name}
      permissions={permissions}
    >
      {children}
    </AdminShell>
  );
}
