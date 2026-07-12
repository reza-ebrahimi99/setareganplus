import type { AdminStatIcon } from "@/content/admin";
import { AdminStatIconComponent } from "./AdminIcons";

type AdminStatCardProps = {
  label: string;
  icon?: AdminStatIcon;
  compact?: boolean;
};

export function AdminStatCard({ label, icon, compact = false }: AdminStatCardProps) {
  return (
    <article className={`admin-card ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon ? (
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-primary"
          >
            <AdminStatIconComponent name={icon} />
          </span>
        ) : null}
      </div>
      <p
        className={`font-bold tracking-tight text-primary ${compact ? "mt-2 text-2xl" : "mt-3 text-3xl"}`}
        aria-label={`${label}: داده‌ای موجود نیست`}
      >
        —
      </p>
      <p className="mt-2 text-xs text-muted">
        پس از اتصال داده نمایش داده می‌شود
      </p>
    </article>
  );
}
