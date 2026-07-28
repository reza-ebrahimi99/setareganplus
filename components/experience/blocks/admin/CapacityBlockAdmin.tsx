"use client";

import {
  ADMIN_INPUT_CLASS,
  EditorShell,
  FieldError,
} from "@/components/experience/blocks/admin/field-helpers";
import type { CapacityBlockConfig } from "@/lib/experience/blocks/capacity";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const CapacityBlockAdmin: ExperienceAdminBlockEditor<CapacityBlockConfig> = ({
  labelFa,
  descriptionFa,
  config,
  fieldErrors,
  disabled,
}) => (
  <EditorShell labelFa={labelFa} descriptionFa={descriptionFa} disabled={disabled}>
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">عنوان (اختیاری)</span>
      <input
        name="heading"
        defaultValue={config.heading ?? ""}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.heading} />
    </label>

    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name="showRemaining"
        defaultChecked={config.showRemaining !== false}
        disabled={disabled}
        value="true"
      />
      نمایش ظرفیت باقی‌مانده
    </label>
    <FieldError message={fieldErrors.showRemaining} />

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">پیام تکمیل ظرفیت (اختیاری)</span>
      <textarea
        name="fullMessage"
        defaultValue={config.fullMessage ?? ""}
        disabled={disabled}
        rows={2}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.fullMessage} />
    </label>
  </EditorShell>
);
