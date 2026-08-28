type ExperienceProfileStripProps = {
  displayName: string;
  interests: string | null;
};

export function ExperienceProfileStrip({
  displayName,
  interests,
}: ExperienceProfileStripProps) {
  return (
    <section className="admin-card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-primary">پروفایل تجربه</h2>
      <dl className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
          <dt className="text-sm text-muted">نام نمایشی</dt>
          <dd className="text-sm font-medium text-primary">{displayName}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
          <dt className="text-sm text-muted">علاقه‌مندی‌ها</dt>
          <dd className="text-sm font-medium text-primary">
            {interests?.trim() ? interests : "ثبت نشده"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
