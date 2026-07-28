"use client";

import {
  ADMIN_INPUT_CLASS,
  EditorShell,
  FieldError,
} from "@/components/experience/blocks/admin/field-helpers";
import type { RegistrationFormBlockConfig } from "@/lib/experience/blocks/registration-form";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const RegistrationFormBlockAdmin: ExperienceAdminBlockEditor<
  RegistrationFormBlockConfig
> = ({ labelFa, descriptionFa, config, fieldErrors, disabled }) => (
  <EditorShell labelFa={labelFa} descriptionFa={descriptionFa} disabled={disabled}>
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">عنوان مقدمه (اختیاری)</span>
      <input
        name="introHeading"
        defaultValue={config.introHeading ?? ""}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.introHeading} />
    </label>

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">متن مقدمه (اختیاری)</span>
      <textarea
        name="introBody"
        defaultValue={config.introBody ?? ""}
        disabled={disabled}
        rows={4}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.introBody} />
    </label>

    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name="showStartButton"
        defaultChecked={config.showStartButton !== false}
        disabled={disabled}
        value="true"
      />
      نمایش دکمه شروع ثبت‌نام
    </label>
    <FieldError message={fieldErrors.showStartButton} />

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">متن دکمه شروع</span>
      <input
        name="startButtonLabel"
        defaultValue={config.startButtonLabel ?? ""}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.startButtonLabel} />
    </label>
  </EditorShell>
);
