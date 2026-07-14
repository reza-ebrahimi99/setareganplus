import type { FormResponseStats } from "@/lib/forms/load-form-response-stats";
import { toPersianDigits } from "@/lib/persian";

function formatDate(value: Date | null): string {
  if (!value) {
    return "—";
  }
  return toPersianDigits(
    value.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  );
}

export function ResponseStatsCards({ stats }: { stats: FormResponseStats }) {
  const cards = [
    { label: "کل پاسخ‌ها", value: toPersianDigits(stats.total) },
    { label: "امروز", value: toPersianDigits(stats.today) },
    { label: "تکراری", value: toPersianDigits(stats.duplicates) },
    {
      label: "موبایل یکتا",
      value: toPersianDigits(stats.uniqueMobiles),
    },
    {
      label: "آخرین پاسخ",
      value: formatDate(stats.latestSubmittedAt),
    },
  ];

  return (
    <section
      aria-label="خلاصه آمار پاسخ‌ها"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      {cards.map((card) => (
        <div key={card.label} className="admin-card px-4 py-4">
          <p className="text-xs font-medium text-muted">{card.label}</p>
          <p className="mt-2 text-lg font-semibold text-primary">{card.value}</p>
        </div>
      ))}
    </section>
  );
}
