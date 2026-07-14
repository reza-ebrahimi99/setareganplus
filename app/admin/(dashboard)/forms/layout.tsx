/**
 * Form Builder admin segment layout.
 * Session + organization role checks live in `app/admin/(dashboard)/layout.tsx`.
 */

export const dynamic = "force-dynamic";

export default function AdminFormsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
