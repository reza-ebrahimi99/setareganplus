import { FormMode } from "@/generated/prisma/enums";
import { RegistrationStepBuilder } from "@/components/admin/forms/RegistrationStepBuilder";
import { getFormModeLabel } from "@/lib/forms/form-mode-labels";
import type { EditorField, EditorStep } from "@/lib/forms/load-form-editor";

type RegistrationFormPanelProps = {
  mode: FormMode;
  formId: string;
  editable: boolean;
  steps: EditorStep[];
  fields: EditorField[];
};

/**
 * Registration Mode panel inside the Form Builder.
 * Hosts the admin Step Builder for REGISTRATION forms.
 */
export function RegistrationFormPanel({
  mode,
  formId,
  editable,
  steps,
  fields,
}: RegistrationFormPanelProps) {
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
              مدیریت مراحل چندصفحه‌ای ثبت‌نام روی همین فرم‌ساز، بدون تغییر رفتار
              عمومی فرم‌های استاندارد.
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

      {isRegistration ? (
        <RegistrationStepBuilder
          formId={formId}
          editable={editable}
          steps={steps}
          fields={fields}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-xl space-y-3 text-center">
            <p className="text-sm font-medium text-primary">چیدمان ثبت‌نام</p>
            <p className="text-sm leading-7 text-muted">
              برای فعال‌سازی سازنده مراحل، هنگام ساخت فرم حالت «ثبت‌نام» را انتخاب
              کنید. فرم‌های استاندارد بدون تغییر کار می‌کنند.
            </p>
          </div>
        </div>
      )}

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
          تنظیمات پیشرفتهٔ ثبت‌نام (پرداخت، مدارک و ظرفیت) در وظایف بعدی اضافه
          می‌شود و روی رفتار عمومی فرم‌ها اثری ندارد.
        </p>
      </section>
    </section>
  );
}
