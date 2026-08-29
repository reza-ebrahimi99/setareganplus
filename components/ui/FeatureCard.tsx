import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";

type FeatureCardProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: string;
  metric?: string;
  year?: string;
  date?: string;
  href?: string;
};

const cardClassName = "premium-card h-full p-6";
const linkClassName = `${cardClassName} group flex flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary`;

function FeatureCardContent({
  title,
  description,
  icon,
  badge,
  metric,
  year,
  date,
}: Omit<FeatureCardProps, "href">) {
  return (
    <>
      {icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-background text-primary">
          {icon}
        </div>
      ) : null}
      {metric ? (
        <p className="mb-2 text-3xl font-bold tracking-tight text-secondary">
          {toPersianDigits(metric)}
        </p>
      ) : null}
      {year ? (
        <p className="mb-3 text-xs font-medium text-muted">{toPersianDigits(year)}</p>
      ) : null}
      {date ? (
        <time className="mb-3 block text-xs font-medium text-muted">
          {toPersianDigits(date)}
        </time>
      ) : null}
      {badge ? (
        <p className="mb-3 text-xs font-medium text-secondary">
          {toPersianDigits(badge)}
        </p>
      ) : null}
      <h3 className="text-base font-semibold text-primary">
        {toPersianDigits(title)}
      </h3>
      <p className="mt-2 text-sm leading-7 text-muted">
        {toPersianDigits(description)}
      </p>
    </>
  );
}

export function FeatureCard({
  title,
  description,
  icon,
  badge,
  metric,
  year,
  date,
  href,
}: FeatureCardProps) {
  if (href) {
    return (
      <Link href={href} className={linkClassName}>
        <FeatureCardContent
          title={title}
          description={description}
          icon={icon}
          badge={badge}
          metric={metric}
          year={year}
          date={date}
        />
      </Link>
    );
  }

  return (
    <article className={cardClassName}>
      <FeatureCardContent
        title={title}
        description={description}
        icon={icon}
        badge={badge}
        metric={metric}
        year={year}
        date={date}
      />
    </article>
  );
}
