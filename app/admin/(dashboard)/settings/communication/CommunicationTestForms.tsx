"use client";

import { useActionState } from "react";
import {
  sendBookingTestAction,
  sendFormTestAction,
  sendOtpTestAction,
  type CommunicationTestActionState,
} from "./actions";

const initialState: CommunicationTestActionState = {
  status: "idle",
  message: "",
};

type TestAction = (
  previous: CommunicationTestActionState,
  formData: FormData,
) => Promise<CommunicationTestActionState>;

function TestSendForm({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: TestAction;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-border bg-white p-4"
      noValidate
    >
      <h3 className="font-semibold text-primary">{title}</h3>
      <p className="mt-1 text-xs leading-6 text-muted">{description}</p>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-muted">شماره موبایل مقصد</span>
        <input
          name="mobile"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          dir="ltr"
          required
          placeholder="09xxxxxxxxx"
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-left"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "در حال ارسال…" : "ارسال آزمایشی"}
      </button>
      {state.message ? (
        <p
          role="status"
          aria-live="polite"
          className={`mt-3 text-xs leading-6 ${
            state.status === "success"
              ? "text-emerald-700"
              : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function CommunicationTestForms() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <TestSendForm
        title="آزمایش قالب OTP"
        description="یک کد غیرقابل‌نمایش با هدف عمومی ساخته می‌شود و اعتبار ورود کارکنان ایجاد نمی‌کند."
        action={sendOtpTestAction}
      />
      <TestSendForm
        title="آزمایش قالب رزرو"
        description="پارامترهای ساختگی و غیرشخصی نام، تاریخ، زمان و پیگیری ارسال می‌شوند."
        action={sendBookingTestAction}
      />
      <TestSendForm
        title="آزمایش قالب فرم"
        description="پارامترهای ساختگی و غیرشخصی نام و پیگیری ارسال می‌شوند."
        action={sendFormTestAction}
      />
    </div>
  );
}
