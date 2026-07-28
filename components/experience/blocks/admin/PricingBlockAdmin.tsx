"use client";

import {
  ADMIN_INPUT_CLASS,
  EditorShell,
  FieldError,
} from "@/components/experience/blocks/admin/field-helpers";
import type { PricingBlockConfig } from "@/lib/experience/blocks/pricing";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const PricingBlockAdmin: ExperienceAdminBlockEditor<PricingBlockConfig> = ({
  labelFa,
  descriptionFa,
  config,
  fieldErrors,
  disabled,
}) => (
  <EditorShell labelFa={labelFa} descriptionFa={descriptionFa} disabled={disabled}>
    <p className="rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-xs leading-6 text-muted">
      مبالغ و تخفیف از موتور جریان ثبت‌نام خوانده می‌شوند و در این بلوک ذخیره
      نمی‌شوند.
    </p>

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">عنوان بخش (اختیاری)</span>
      <input
        name="sectionTitle"
        defaultValue={config.sectionTitle ?? ""}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.sectionTitle} />
    </label>

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">نوع نمایش</span>
      <select
        name="variant"
        defaultValue={config.variant ?? "card"}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      >
        <option value="card">کارت</option>
        <option value="compact">فشرده</option>
      </select>
      <FieldError message={fieldErrors.variant} />
    </label>

    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name="showPaymentModeLabel"
        defaultChecked={config.showPaymentModeLabel !== false}
        disabled={disabled}
        value="true"
      />
      نمایش برچسب حالت پرداخت
    </label>
    <FieldError message={fieldErrors.showPaymentModeLabel} />
  </EditorShell>
);
