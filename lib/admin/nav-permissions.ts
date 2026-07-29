/**
 * Pure admin navigation permission helpers (safe for Node unit tests).
 */

export type NavPermissionChild = {
  href: string;
  label: string;
  permission?: string;
};

export type NavPermissionParent = {
  href: string;
  permission?: string;
  children?: readonly NavPermissionChild[];
};

function hasNavPermission(
  permissions: readonly string[],
  permission: string | undefined,
): boolean {
  return !permission || permissions.includes(permission);
}

/** Child links are gated only by their own permission — never inherited from the parent. */
export function filterAdminNavChildren<T extends NavPermissionChild>(
  children: readonly T[] | undefined,
  permissions: readonly string[],
): T[] {
  return (children ?? []).filter((child) =>
    hasNavPermission(permissions, child.permission),
  );
}

/**
 * Parent is visible if the user has the parent permission OR any visible child permission.
 * Avoids hiding specialized commerce links behind commerce.view alone.
 */
export function resolveEnabledAdminNavItem<T extends NavPermissionChild>(
  item: NavPermissionParent & { children?: readonly T[] },
  permissions: readonly string[],
): {
  visible: boolean;
  href: string;
  children: T[];
} {
  const children = filterAdminNavChildren(item.children, permissions);
  const hasParentPermission = hasNavPermission(permissions, item.permission);
  const visible = hasParentPermission || children.length > 0;
  const href =
    hasParentPermission || children.length === 0
      ? item.href
      : children[0]!.href;

  return { visible, href, children };
}
