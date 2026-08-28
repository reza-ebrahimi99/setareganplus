import { redirect } from "next/navigation";
import type { Permission } from "@/lib/auth/permissions";
import { requirePermission, type AdminSessionContext } from "@/lib/auth/require-admin";
import { isBookCommerceEnabled } from "@/lib/books/flags";

/**
 * Hard gate for every /admin/books/* page: RBAC permission AND the org's
 * bookCommerce flag. A role holding books.* is not enough on its own — the
 * flag stays the master switch (default OFF), same as direct URL access.
 */
export async function requireBookCommerceAccess(
  permission: Permission,
): Promise<AdminSessionContext> {
  const session = await requirePermission(permission);
  const enabled = await isBookCommerceEnabled(session.organization.id);
  if (!enabled) {
    redirect("/admin/forbidden");
  }
  return session;
}
