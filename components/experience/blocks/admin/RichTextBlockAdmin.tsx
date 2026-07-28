"use client";

import {
  ADMIN_INPUT_CLASS,
  EditorShell,
  FieldError,
} from "@/components/experience/blocks/admin/field-helpers";
import type { RichTextBlockConfig } from "@/lib/experience/blocks/rich-text";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const RichTextBlockAdmin: ExperienceAdminBlockEditor<RichTextBlockConfig> = ({
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
        name="title"
        defaultValue={config.title ?? ""}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.title} />
    </label>

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">متن</span>
      <textarea
        name="body"
        defaultValue={config.body}
        disabled={disabled}
        required
        rows={8}
        className={ADMIN_INPUT_CLASS}
      />
      <span className="mt-1 block text-xs text-muted">
        HTML مجاز نیست؛ خطوط جدید حفظ می‌شوند.
      </span>
      <FieldError message={fieldErrors.body} />
    </label>

    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">چینش</span>
        <select
          name="textAlign"
          defaultValue={config.textAlign}
          disabled={disabled}
          className={ADMIN_INPUT_CLASS}
        >
          <option value="start">شروع</option>
          <option value="center">وسط</option>
        </select>
        <FieldError message={fieldErrors.textAlign} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عرض</span>
        <select
          name="maxWidth"
          defaultValue={config.maxWidth}
          disabled={disabled}
          className={ADMIN_INPUT_CLASS}
        >
          <option value="prose">متن</option>
          <option value="wide">عریض</option>
          <option value="full">کامل</option>
        </select>
        <FieldError message={fieldErrors.maxWidth} />
      </label>
    </div>
  </EditorShell>
);
