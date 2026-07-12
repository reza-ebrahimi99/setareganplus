import Link from "next/link";
import type { AdminQuickActionItem } from "@/content/admin";

type AdminQuickActionProps = {
  action: AdminQuickActionItem;
};

export function AdminQuickAction({ action }: AdminQuickActionProps) {
  if (action.enabled) {
    return (
      <Link
        href={action.href}
        className="admin-card group flex h-full flex-col p-4 transition-colors hover:border-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:p-5"
      >
        <span className="text-sm font-semibold text-primary group-hover:text-primary">
          {action.label}
        </span>
        <span className="mt-2 text-xs leading-6 text-muted">{action.description}</span>
        <span className="mt-auto pt-4 text-xs font-medium text-secondary">
          مشاهده ←
        </span>
      </Link>
    );
  }

  return (
    <div
      aria-disabled="true"
      className="admin-card flex h-full flex-col border-dashed p-4 opacity-75 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-muted">{action.label}</span>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
          در نقشه توسعه
        </span>
      </div>
      <span className="mt-2 text-xs leading-6 text-muted">{action.description}</span>
    </div>
  );
}
