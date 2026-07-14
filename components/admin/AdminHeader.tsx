"use client";

import { usePathname } from "next/navigation";
import { logoutAdminAction } from "@/app/admin/login/actions";
import { adminHeaderCopy, getAdminPageContext } from "@/content/admin";

type AdminHeaderProps = {
  userDisplayName: string;
  organizationName: string;
};

export function AdminHeader({
  userDisplayName,
  organizationName,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const { title } = getAdminPageContext(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">{adminHeaderCopy.panelLabel}</p>
            <p className="truncate text-sm font-semibold text-primary sm:text-base">
              {title}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted">
              {organizationName}
            </span>
            <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              {userDisplayName}
            </span>
            <form action={logoutAdminAction}>
              <button
                type="submit"
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-slate-50"
              >
                خروج
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label
              htmlFor="admin-global-search"
              className="mb-1.5 block text-xs font-medium text-muted"
            >
              {adminHeaderCopy.searchLabel}
            </label>
            <input
              id="admin-global-search"
              type="search"
              disabled
              aria-disabled="true"
              placeholder={adminHeaderCopy.searchPlaceholder}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted md:max-w-md"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
