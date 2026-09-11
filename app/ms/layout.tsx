/**
 * Legacy Major Office layout (/ms).
 *
 * Every page beneath this layout is now a compatibility redirect, so the
 * layout is a pass-through: no Major Office chrome, no onboarding guard, and
 * no dashboard queries for a screen that never renders. MajorOfficeShell and
 * the rail helpers stay in the tree for historical/admin use.
 */

export const dynamic = "force-dynamic";

export default function MajorOfficeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
