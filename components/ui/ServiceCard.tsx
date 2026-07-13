import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toPersianDigits } from "@/lib/persian";

type ServiceCardProps = {
  title: string;
  description: string;
  href: string;
  statusLabel?: string;
  statusTone?: "default" | "development" | "enrollment";
};

export function ServiceCard({
  title,
  description,
  href,
  statusLabel,
  statusTone = "default",
}: ServiceCardProps) {
  return (
    <li>
      <Link
        href={href}
        className="premium-card group flex h-full flex-col p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        {statusLabel ? (
          <StatusBadge tone={statusTone}>
            {toPersianDigits(statusLabel)}
          </StatusBadge>
        ) : null}
        <h3 className="mt-4 text-base font-semibold text-primary transition-colors group-hover:text-primary/85">
          {toPersianDigits(title)}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-7 text-muted">
          {toPersianDigits(description)}
        </p>
        <span className="mt-5 text-sm font-medium text-secondary">
          مشاهده اطلاعات
        </span>
      </Link>
    </li>
  );
}
