import "server-only";
import type { AdminUser } from "@/lib/auth";
import { ALL_PERMS, isPerm, type Perm } from "@/lib/perms";

export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

/** Permissions this editor may grant/revoke: owner = all; managers = their own minus users.manage. */
export function grantableBy(me: AdminUser): Perm[] {
  if (me.owner) return ALL_PERMS;
  return ALL_PERMS.filter((p) => p !== "users.manage" && me.perms.has(p));
}

/** Can `me` edit/reset/deactivate/delete this staff user? Managers cannot touch other managers or themselves. */
export function canManageUser(me: AdminUser, target: { id: string; permissions: string[] }) {
  if (me.owner) return true;
  if (!me.perms.has("users.manage")) return false;
  if (target.id === me.id) return false;
  return !target.permissions.includes("users.manage");
}

/** Merge submitted perms with the ones the editor is not allowed to change. */
export function mergePerms(me: AdminUser, old: string[], submitted: string[]): Perm[] {
  const g = new Set<string>(grantableBy(me));
  const keep = old.filter((p) => isPerm(p) && !g.has(p));
  const add = submitted.filter((p) => isPerm(p) && g.has(p));
  return [...new Set([...keep, ...add])] as Perm[];
}
