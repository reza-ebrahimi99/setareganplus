"use client";

import {
  ADMIN_INPUT_CLASS,
  EditorShell,
  FieldError,
} from "@/components/experience/blocks/admin/field-helpers";
import type { CountdownBlockConfig } from "@/lib/experience/blocks/countdown";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const CountdownBlockAdmin: ExperienceAdminBlockEditor<CountdownBlockConfig> = ({
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

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">هدف شمارش معکوس</span>
      <select
        name="targetKind"
        defaultValue={config.targetKind ?? "AUTO"}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      >
        <option value="AUTO">خودکار</option>
        <option value="DISCOUNT">پایان تخفیف</option>
        <option value="REGISTRATION_CLOSE">پایان ثبت‌نام</option>
      </select>
      <FieldError message={fieldErrors.targetKind} />
    </label>

    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name="showWhenInactive"
        defaultChecked={Boolean(config.showWhenInactive)}
        disabled={disabled}
        value="true"
      />
      نمایش حتی وقتی شمارش معکوس غیرفعال است
    </label>
    <FieldError message={fieldErrors.showWhenInactive} />
  </EditorShell>
);
