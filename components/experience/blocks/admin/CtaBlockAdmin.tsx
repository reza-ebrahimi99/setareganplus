"use client";

import {
  ADMIN_INPUT_CLASS,
  CtaButtonFields,
  EditorShell,
  FieldError,
} from "@/components/experience/blocks/admin/field-helpers";
import type { CtaBlockConfig } from "@/lib/experience/blocks/cta";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const CtaBlockAdmin: ExperienceAdminBlockEditor<CtaBlockConfig> = ({
  labelFa,
  descriptionFa,
  config,
  fieldErrors,
  disabled,
}) => (
  <EditorShell labelFa={labelFa} descriptionFa={descriptionFa} disabled={disabled}>
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">عنوان</span>
      <input
        name="title"
        defaultValue={config.title}
        disabled={disabled}
        required
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.title} />
    </label>

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">توضیح</span>
      <textarea
        name="description"
        defaultValue={config.description ?? ""}
        disabled={disabled}
        rows={3}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.description} />
    </label>

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">چینش</span>
      <select
        name="align"
        defaultValue={config.align}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      >
        <option value="start">شروع</option>
        <option value="center">وسط</option>
      </select>
      <FieldError message={fieldErrors.align} />
    </label>

    <CtaButtonFields
      prefix="primaryCta"
      label="دکمه اصلی"
      defaults={config.primaryCta}
      disabled={disabled}
      fieldErrors={fieldErrors}
    />
    <CtaButtonFields
      prefix="secondaryCta"
      label="دکمه فرعی"
      defaults={config.secondaryCta}
      disabled={disabled}
      fieldErrors={fieldErrors}
    />
  </EditorShell>
);
