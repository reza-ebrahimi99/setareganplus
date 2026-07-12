import { AdminBreadcrumbs } from "./AdminBreadcrumbs";
import { AdminNotice } from "./AdminNotice";
import type { AdminBreadcrumbItem } from "@/content/admin";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  id?: string;
  breadcrumbs?: readonly AdminBreadcrumbItem[];
  showNotice?: boolean;
  compact?: boolean;
};

export function AdminPageHeader({
  title,
  description,
  id = "admin-page-heading",
  breadcrumbs,
  showNotice = false,
  compact = false,
}: AdminPageHeaderProps) {
  return (
    <header className={`${compact ? "mb-5" : "mb-6"} border-b border-border pb-5`}>
      {breadcrumbs ? <AdminBreadcrumbs items={breadcrumbs} /> : null}
      <h1
        id={id}
        className={`font-bold text-primary ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}
      >
        {title}
      </h1>
      {description ? (
        <p
          className={`mt-2 max-w-3xl leading-7 text-muted ${compact ? "text-sm" : "text-sm sm:text-base"}`}
        >
          {description}
        </p>
      ) : null}
      {showNotice ? (
        <div className="mt-4">
          <AdminNotice />
        </div>
      ) : null}
    </header>
  );
}
