/**
 * Form Builder admin segment layout.
 *
 * TODO(auth): Authentication and authorization are NOT implemented.
 * These routes must not be considered production-safe until admin session
 * checks and organization-scoped access control are enforced on every
 * Form Builder page and server action.
 */

export const dynamic = "force-dynamic";

export default function AdminFormsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
