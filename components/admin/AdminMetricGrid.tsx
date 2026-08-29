import { AdminStatCard } from "./AdminStatCard";
import type { AdminStatIcon } from "@/content/admin";

type AdminMetricGridProps = {
  items: ReadonlyArray<{
    label: string;
    icon?: AdminStatIcon;
    value?: string | number | null;
    hint?: string | null;
  }>;
  headingId?: string;
  heading?: string;
  compact?: boolean;
};

export function AdminMetricGrid({
  items,
  headingId,
  heading,
  compact = false,
}: AdminMetricGridProps) {
  return (
    <section aria-labelledby={headingId}>
      {heading && headingId ? (
        <h2 id={headingId} className="sr-only">
          {heading}
        </h2>
      ) : null}
      <ul
        className={
          compact
            ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            : "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        }
      >
        {items.map((item) => (
          <li key={item.label}>
            <AdminStatCard
              label={item.label}
              icon={item.icon}
              compact={compact}
              value={item.value}
              hint={item.hint}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
