"use client";

import { useActionState } from "react";
import { RegistrationProductType } from "@/generated/prisma/enums";
import {
  createRegistrationFlowAction,
  type CreateRegistrationFlowState,
} from "@/app/admin/(dashboard)/registrations/flows/actions";
import { PRODUCT_TYPE_LABELS } from "@/lib/registration/flows/constants";

const initialState: CreateRegistrationFlowState = {};

function fieldClassName(hasError: boolean): string {
  const base =
    "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  return hasError
    ? `${base} border-red-400`
    : `${base} border-border`;
}

export function CreateRegistrationFlowForm() {
  const [state, formAction, pending] = useActionState(
    createRegistrationFlowAction,
    initialState,
  );

  const values = state.values;
  const errors = state.fieldErrors;
  // Remount after a failed submit so defaultValue restores submitted values.
  const formKey =
    state.success === false
      ? `err-${values?.title ?? ""}-${values?.slug ?? ""}-${state.formError ?? ""}`
      : "create-flow";

  return (
    <form
      key={formKey}
      action={formAction}
      className="admin-card space-y-4 p-5"
      noValidate
    >
      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {state.formError}
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عنوان *</span>
        <input
          name="title"
          required
          minLength={2}
          defaultValue={values?.title ?? ""}
          aria-invalid={errors?.title ? true : undefined}
          aria-describedby={errors?.title ? "flow-title-error" : undefined}
          className={fieldClassName(Boolean(errors?.title))}
          placeholder="مثلاً ثبت‌نام آزمون پایانی"
          autoComplete="off"
        />
        {errors?.title ? (
          <p id="flow-title-error" className="mt-1.5 text-sm text-red-700">
            {errors.title}
          </p>
        ) : null}
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">نامک (slug)</span>
        <input
          name="slug"
          dir="ltr"
          defaultValue={values?.slug ?? ""}
          aria-invalid={errors?.slug ? true : undefined}
          aria-describedby={errors?.slug ? "flow-slug-error" : undefined}
          className={`${fieldClassName(Boolean(errors?.slug))} font-mono text-sm`}
          placeholder="exam-final-1405"
          autoComplete="off"
        />
        {errors?.slug ? (
          <p id="flow-slug-error" className="mt-1.5 text-sm text-red-700">
            {errors.slug}
          </p>
        ) : (
          <span className="mt-1 block text-xs text-muted">
            اگر خالی بماند از عنوان ساخته می‌شود.
          </span>
        )}
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">توضیح کوتاه</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={values?.description ?? ""}
          className={fieldClassName(false)}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">نوع محصول</span>
        <select
          name="productType"
          defaultValue={
            values?.productType ?? RegistrationProductType.SCHOOL_REGISTRATION
          }
          aria-invalid={errors?.productType ? true : undefined}
          className={fieldClassName(Boolean(errors?.productType))}
        >
          {Object.values(RegistrationProductType).map((type) => (
            <option key={type} value={type}>
              {PRODUCT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {errors?.productType ? (
          <p className="mt-1.5 text-sm text-red-700">{errors.productType}</p>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "در حال ایجاد…" : "ایجاد جریان"}
      </button>
    </form>
  );
}
