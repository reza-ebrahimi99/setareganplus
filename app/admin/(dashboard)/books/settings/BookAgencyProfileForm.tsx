"use client";

import { useActionState } from "react";
import { updateBookAgencyProfileAction, type BookSettingsActionState } from "./actions";

const initialState: BookSettingsActionState = { status: "idle", message: "" };

type BookAgencyProfileFormProps = {
  legalName: string;
  defaultDepositPercent: number;
  defaultReservationTtlHours: number;
  allowIssueUnpaid: boolean;
  installmentEnabled: boolean;
  countGiftsInGmv: boolean;
  showStudentNamesToTeachers: boolean;
};

function ToggleField({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 size-4 rounded border-border accent-secondary"
      />
      <span>
        <span className="block text-sm font-medium text-primary">{label}</span>
        <span className="mt-0.5 block text-xs leading-6 text-muted">{description}</span>
      </span>
    </label>
  );
}

export function BookAgencyProfileForm(props: BookAgencyProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateBookAgencyProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="admin-card max-w-2xl space-y-5 p-5 sm:p-6" noValidate>
      <div>
        <label className="mb-1 block text-sm font-medium text-primary" htmlFor="legalName">
          نام رسمی آژانس روی اسناد
        </label>
        <input
          id="legalName"
          name="legalName"
          defaultValue={props.legalName}
          maxLength={200}
          placeholder="مثلاً: آژانس کتاب ستارگان پلاس"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-1 block text-sm font-medium text-primary"
            htmlFor="defaultDepositPercent"
          >
            حداقل درصد بیعانه پیش‌فرض
          </label>
          <input
            id="defaultDepositPercent"
            name="defaultDepositPercent"
            type="number"
            min={0}
            max={100}
            defaultValue={props.defaultDepositPercent}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
          />
        </div>
        <div>
          <label
            className="mb-1 block text-sm font-medium text-primary"
            htmlFor="defaultReservationTtlHours"
          >
            مهلت پیش‌فرض رزرو (ساعت)
          </label>
          <input
            id="defaultReservationTtlHours"
            name="defaultReservationTtlHours"
            type="number"
            min={1}
            max={2160}
            defaultValue={props.defaultReservationTtlHours}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
          />
        </div>
      </div>

      <div className="space-y-3">
        <ToggleField
          name="allowIssueUnpaid"
          label="اجازه تحویل با مانده باز"
          description="در فاز فروش استفاده می‌شود؛ در حال حاضر روی هیچ فرآیندی اثر ندارد."
          defaultChecked={props.allowIssueUnpaid}
        />
        <ToggleField
          name="installmentEnabled"
          label="فعال بودن اقساط"
          description="در فاز خزانه استفاده می‌شود."
          defaultChecked={props.installmentEnabled}
        />
        <ToggleField
          name="countGiftsInGmv"
          label="احتساب هدیه/اهدا در گردش فروش"
          description="پیش‌فرض خاموش — گزارش‌های فروش را با اسناد هدیه متورم نمی‌کند."
          defaultChecked={props.countGiftsInGmv}
        />
        <ToggleField
          name="showStudentNamesToTeachers"
          label="نمایش نام دانش‌آموز به معلمان در داشبورد پورسانت"
          description="پیش‌فرض خاموش؛ در فاز پورسانت معلمان/مشاوران اعمال می‌شود."
          defaultChecked={props.showStudentNamesToTeachers}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "در حال ذخیره…" : "ذخیره تنظیمات"}
        </button>
        {state.status === "success" ? (
          <span className="text-sm text-success">{state.message}</span>
        ) : null}
        {state.status === "error" ? (
          <span className="text-sm text-danger">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
