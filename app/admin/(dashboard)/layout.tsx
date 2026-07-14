import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/lib/auth/require-admin";

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
    >
      {children}
    </AdminShell>
  );
}
