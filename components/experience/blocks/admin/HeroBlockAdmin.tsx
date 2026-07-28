"use client";

import {
  ADMIN_INPUT_CLASS,
  CtaButtonFields,
  EditorShell,
  FieldError,
} from "@/components/experience/blocks/admin/field-helpers";
import type { HeroBlockConfig } from "@/lib/experience/blocks/hero";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const HeroBlockAdmin: ExperienceAdminBlockEditor<HeroBlockConfig> = ({
  labelFa,
  descriptionFa,
  config,
  fieldErrors,
  disabled,
}) => (
  <EditorShell labelFa={labelFa} descriptionFa={descriptionFa} disabled={disabled}>
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">ابرو (اختیاری)</span>
      <input
        name="eyebrow"
        defaultValue={config.eyebrow ?? ""}
        disabled={disabled}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.eyebrow} />
    </label>

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">عنوان</span>
      <input
        name="headline"
        defaultValue={config.headline}
        disabled={disabled}
        required
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.headline} />
    </label>

    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">زیرعنوان</span>
      <textarea
        name="subheadline"
        defaultValue={config.subheadline ?? ""}
        disabled={disabled}
        rows={2}
        className={ADMIN_INPUT_CLASS}
      />
      <FieldError message={fieldErrors.subheadline} />
    </label>

    <div className="grid gap-3 sm:grid-cols-2">
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
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">پوشش</span>
        <select
          name="overlay"
          defaultValue={config.overlay}
          disabled={disabled}
          className={ADMIN_INPUT_CLASS}
        >
          <option value="none">بدون پوشش</option>
          <option value="soft">نرم</option>
          <option value="strong">قوی</option>
        </select>
        <FieldError message={fieldErrors.overlay} />
      </label>
    </div>

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
