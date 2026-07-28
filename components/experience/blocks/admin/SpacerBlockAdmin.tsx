"use client";

import {
  ADMIN_INPUT_CLASS,
  EditorShell,
  FieldError,
} from "@/components/experience/blocks/admin/field-helpers";
import type { SpacerBlockConfig } from "@/lib/experience/blocks/spacer";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const SpacerBlockAdmin: ExperienceAdminBlockEditor<SpacerBlockConfig> = ({
  labelFa,
  descriptionFa,
  config,
  fieldErrors,
  disabled,
}) => (
  <EditorShell labelFa={labelFa} descriptionFa={descriptionFa} disabled={disabled}>
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">اندازه</span>
      <select
        name="size"
        defaultValue={config.size}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      >
        <option value="sm">کوچک</option>
        <option value="md">متوسط</option>
        <option value="lg">بزرگ</option>
        <option value="xl">خیلی بزرگ</option>
      </select>
      <FieldError message={fieldErrors.size} />
    </label>
  </EditorShell>
);
