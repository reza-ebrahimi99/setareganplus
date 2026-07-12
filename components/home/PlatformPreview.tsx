import { StatusBadge } from "@/components/ui/StatusBadge";

const previewCards = [
  {
    title: "برنامه آموزشی",
    note: "در نقشه توسعه",
  },
  {
    title: "پیگیری مشاوره",
    note: "زیرساخت در حال آماده‌سازی",
  },
  {
    title: "وضعیت ثبت‌نام",
    note: "فرم آنلاین به‌زودی",
  },
  {
    title: "خدمات آموزشی",
    note: "اطلاعات خدمات فعال",
  },
] as const;

export function PlatformPreview() {
  return (
    <div
      className="preview-shell p-4 sm:p-5"
      aria-label="پیش‌نمایش مفهومی سکو — بخش‌های زیر هنوز به‌صورت کامل عملیاتی نیستند"
    >
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-sm font-semibold text-primary">پیش‌نمایش سکو</p>
          <p className="mt-1 text-xs leading-6 text-muted">
            نمایش مفهومی چشم‌انداز توسعه — نه داده واقعی
          </p>
        </div>
        <StatusBadge tone="development">در حال توسعه</StatusBadge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {previewCards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="mb-3 h-2 w-12 rounded-full bg-secondary/40" />
            <p className="text-sm font-semibold text-primary">{card.title}</p>
            <p className="mt-2 text-xs leading-6 text-muted">{card.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
