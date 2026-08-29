import Link from "next/link";
import type { AdminBreadcrumbItem } from "@/content/admin";

type AdminBreadcrumbsProps = {
  items: readonly AdminBreadcrumbItem[];
};

export function AdminBreadcrumbs({ items }: AdminBreadcrumbsProps) {
  return (
    <nav aria-label="مسیر صفحه" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted sm:text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden="true" className="text-border">
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "font-medium text-primary" : undefined}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
