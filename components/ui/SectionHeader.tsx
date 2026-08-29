import { toPersianDigits } from "@/lib/persian";

type SectionHeaderProps = {
  heading: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  headingId?: string;
};

export function SectionHeader({
  heading,
  description,
  eyebrow,
  action,
  headingId,
}: SectionHeaderProps) {
  return (
    <div
      className={
        action
          ? "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
          : undefined
      }
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 text-xs font-medium tracking-wide text-secondary">
            {toPersianDigits(eyebrow)}
          </p>
        ) : null}
        <h2
          id={headingId}
          className="text-2xl font-bold text-primary sm:text-3xl"
        >
          {toPersianDigits(heading)}
        </h2>
        {description ? (
          <p className="mt-3 text-base leading-8 text-muted">
            {toPersianDigits(description)}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
