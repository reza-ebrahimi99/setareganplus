import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";
import { Eyebrow } from "./Eyebrow";

type PageHeroProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: readonly BreadcrumbItem[];
  eyebrow?: string;
  id?: string;
};

export function PageHero({
  title,
  subtitle,
  breadcrumbs,
  eyebrow,
  id = "page-heading",
}: PageHeroProps) {
  return (
    <header className="page-hero mb-10 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h1
        id={id}
        className="text-3xl font-bold tracking-tight text-primary sm:text-4xl"
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 max-w-3xl text-base leading-8 text-muted sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
