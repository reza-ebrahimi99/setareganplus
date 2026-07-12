import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: readonly BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="مسیر صفحه" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.label} className="flex items-center gap-2">
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
                  className={isLast ? "font-medium text-foreground" : undefined}
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
