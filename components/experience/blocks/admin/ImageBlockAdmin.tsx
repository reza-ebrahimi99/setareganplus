"use client";

import {
  ADMIN_INPUT_CLASS,
  EditorShell,
  FieldError,
} from "@/components/experience/blocks/admin/field-helpers";
import type { ImageBlockConfig } from "@/lib/experience/blocks/image";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const ImageBlockAdmin: ExperienceAdminBlockEditor<ImageBlockConfig> = ({
  labelFa,
  descriptionFa,
  config,
  fieldErrors,
  disabled,
}) => (
  <EditorShell labelFa={labelFa} descriptionFa={descriptionFa} disabled={disabled}>
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">عنوان تصویر</span>
      <input
        name="caption"
        defaultValue={config.caption ?? ""}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.caption} />
    </label>

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">متن جایگزین (اختیاری)</span>
      <input
        name="altOverride"
        defaultValue={config.altOverride ?? ""}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.altOverride} />
    </label>

    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">نسبت</span>
        <select
          name="aspect"
          defaultValue={config.aspect}
          disabled={disabled}
          className={ADMIN_INPUT_CLASS}
        >
          <option value="auto">خودکار</option>
          <option value="16/9">۱۶/۹</option>
          <option value="4/3">۴/۳</option>
          <option value="1/1">۱/۱</option>
        </select>
        <FieldError message={fieldErrors.aspect} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">برش</span>
        <select
          name="objectFit"
          defaultValue={config.objectFit}
          disabled={disabled}
          className={ADMIN_INPUT_CLASS}
        >
          <option value="cover">پوشش</option>
          <option value="contain">جا شدن</option>
        </select>
        <FieldError message={fieldErrors.objectFit} />
      </label>
    </div>

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">پیوند (اختیاری)</span>
      <input
        name="linkHref"
        defaultValue={config.linkHref ?? ""}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
        dir="ltr"
      />
      <FieldError message={fieldErrors.linkHref} />
    </label>
  </EditorShell>
);
