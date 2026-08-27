import { toPersianDigits } from "@/lib/persian";

type ExperienceProfileStripProps = {
  displayName: string;
  interests: string | null;
  membershipLabel?: string;
  membershipLevelLabel?: string;
  completionRatio?: number;
  studentCode?: string | null;
};

export function ExperienceProfileStrip({
  displayName,
  interests,
  membershipLabel,
  membershipLevelLabel,
  completionRatio,
  studentCode,
}: ExperienceProfileStripProps) {
  const percent =
    completionRatio == null
      ? null
      : Math.round(Math.max(0, Math.min(1, completionRatio)) * 100);

  return (
    <section className="admin-card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-primary">پروفایل تجربه</h2>
      <dl className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
          <dt className="text-sm text-muted">نام نمایشی</dt>
          <dd className="text-sm font-medium text-primary">{displayName}</dd>
        </div>
        {studentCode ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
            <dt className="text-sm text-muted">کد دانش‌آموز</dt>
            <dd className="text-sm font-medium text-primary">
              {toPersianDigits(studentCode)}
            </dd>
          </div>
        ) : null}
        {membershipLabel ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
            <dt className="text-sm text-muted">عضویت</dt>
            <dd className="text-sm font-medium text-primary">{membershipLabel}</dd>
          </div>
        ) : null}
        {membershipLevelLabel ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
            <dt className="text-sm text-muted">سطح</dt>
            <dd className="text-sm font-medium text-primary">{membershipLevelLabel}</dd>
          </div>
        ) : null}
        {percent != null ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
            <dt className="text-sm text-muted">تکمیل پروفایل</dt>
            <dd className="text-sm font-medium text-primary">
              {toPersianDigits(percent)}٪
            </dd>
          </div>
        ) : null}
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
