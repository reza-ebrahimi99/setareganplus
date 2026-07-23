import { FormMode } from "@/generated/prisma/enums";
import { getFormModeLabel } from "@/lib/forms/form-mode-labels";

type RegistrationFormPanelProps = {
  mode: FormMode;
};

/**
 * Foundation panel for Registration Mode inside the Form Builder.
 * Settings and step editing land in later sprint tasks.
 */
export function RegistrationFormPanel({ mode }: RegistrationFormPanelProps) {
  const isRegistration = mode === FormMode.REGISTRATION;

  return (
    <section
      aria-labelledby="registration-form-panel-heading"
      className="space-y-6"
    >
      <div className="rounded-xl border border-border bg-surface px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2
              id="registration-form-panel-heading"
              className="text-base font-semibold text-primary"
            >
              حالت ثبت‌نام
            </h2>
            <p className="text-sm leading-7 text-muted">
              این بخش پایهٔ معماری ثبت‌نام چندمرحله‌ای روی فرم‌ساز موجود است.
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-xl px-3 py-1.5 text-sm font-medium ${
              isRegistration
                ? "bg-secondary/15 text-secondary"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {getFormModeLabel(mode)}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-xl space-y-3 text-center">
          <p className="text-sm font-medium text-primary">چیدمان ثبت‌نام</p>
          <p className="text-sm leading-7 text-muted">
            {isRegistration
              ? "تنظیمات مراحل، فیلدها و جریان ثبت‌نام در این‌جا اضافه می‌شود. فعلاً فقط زیرساخت فعال است."
              : "برای فعال‌سازی این بخش، هنگام ساخت فرم حالت «ثبت‌نام» را انتخاب کنید. فرم‌های استاندارد بدون تغییر کار می‌کنند."}
          </p>
        </div>
      </div>

      <section
        aria-labelledby="registration-settings-heading"
        className="rounded-xl border border-border bg-surface px-4 py-5 sm:px-5"
      >
        <h3
          id="registration-settings-heading"
          className="text-sm font-semibold text-primary"
        >
          تنظیمات ثبت‌نام
        </h3>
        <p className="mt-2 text-sm leading-7 text-muted">
          هنوز تنظیماتی تعریف نشده است. این ناحیه برای گزینه‌های آیندهٔ ثبت‌نام
          آماده شده و روی رفتار عمومی فرم‌ها اثری ندارد.
        </p>
      </section>
    </section>
  );
}
