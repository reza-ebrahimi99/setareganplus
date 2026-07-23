"use client";

import { RegistrationProductType } from "@/generated/prisma/enums";
import { createRegistrationFlowAction } from "@/app/admin/(dashboard)/registrations/flows/actions";
import { PRODUCT_TYPE_LABELS } from "@/lib/registration/flows/constants";

export function CreateRegistrationFlowForm() {
  return (
    <form action={createRegistrationFlowAction} className="admin-card space-y-4 p-5">
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عنوان *</span>
        <input
          name="title"
          required
          minLength={2}
          className="w-full rounded-xl border border-border px-3 py-2.5"
          placeholder="مثلاً ثبت‌نام آزمون پایانی"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">نامک (slug)</span>
        <input
          name="slug"
          dir="ltr"
          className="w-full rounded-xl border border-border px-3 py-2.5 font-mono text-sm"
          placeholder="exam-final-1405"
        />
        <span className="mt-1 block text-xs text-muted">
          اگر خالی بماند از عنوان ساخته می‌شود.
        </span>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">توضیح کوتاه</span>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-xl border border-border px-3 py-2.5"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">نوع محصول</span>
        <select
          name="productType"
          defaultValue={RegistrationProductType.EXAM}
          className="w-full rounded-xl border border-border px-3 py-2.5"
        >
          {Object.values(RegistrationProductType).map((type) => (
            <option key={type} value={type}>
              {PRODUCT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white"
      >
        ایجاد جریان
      </button>
    </form>
  );
}
