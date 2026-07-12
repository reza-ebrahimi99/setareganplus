import Link from "next/link";

type ServiceCardProps = {
  title: string;
  description: string;
  href: string;
  statusLabel?: string;
};

export function ServiceCard({
  title,
  description,
  href,
  statusLabel,
}: ServiceCardProps) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-full flex-col rounded-xl border border-border bg-background p-5 shadow-sm transition-colors hover:border-secondary/60 hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        {statusLabel ? (
          <span className="mb-3 inline-block w-fit rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted">
            {statusLabel}
          </span>
        ) : null}
        <h3 className="text-base font-semibold text-primary">{title}</h3>
        <p className="mt-2 flex-1 text-sm leading-7 text-muted">{description}</p>
        <span className="mt-4 text-sm font-medium text-secondary">
          اطلاعات بیشتر
        </span>
      </Link>
    </li>
  );
}
