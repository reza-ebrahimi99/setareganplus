import { requirePermission } from "@/lib/auth/require-admin";

/**
 * Form Builder admin segment layout.
 * Session + organization role checks live in `app/admin/(dashboard)/layout.tsx`.
 */

export const dynamic = "force-dynamic";

export default async function AdminFormsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requirePermission("forms.manage");
  return children;
}
