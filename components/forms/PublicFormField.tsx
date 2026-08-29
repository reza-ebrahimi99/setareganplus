import { FormFieldType } from "@/generated/prisma/enums";
import { JalaliDateField } from "@/components/datetime/JalaliDateField";
import { PublicFormFileUpload } from "@/components/forms/PublicFormFileUpload";
import {
  readChoiceConfig,
  type ChoiceOption,
} from "@/lib/forms/choice-options";
import { resolveFieldDisplayHints } from "@/lib/forms/field-display-config";
import {
  parseFormFileUploadAnswer,
  parseFormFileUploadAnswerFromFormValue,
} from "@/lib/forms/file-upload-config";
import type { PublicFormField as PublicFormFieldData } from "@/lib/forms/load-public-form";
import type { PreservedFieldValue } from "@/lib/forms/validate-public-submission";

type TextInputMode =
  | "text"
  | "tel"
  | "email"
  | "decimal"
  | "numeric"
  | "search"
  | "url"
  | "none";

function controlClassName(hasError: boolean): string {
  const base =
    "mt-2 w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60";
  return hasError
    ? `${base} border-red-400`
    : `${base} border-border`;
}

function inputId(idPrefix: string, fieldKey: string): string {
  return `${idPrefix}-field-input-${fieldKey}`;
}

function describedBy(
  fieldKey: string,
  helpText: string | null,
  error: string | undefined,
  idPrefix: string,
): string | undefined {
  return (
    [
      helpText ? `${idPrefix}-field-help-${fieldKey}` : null,
      error ? `${idPrefix}-field-error-${fieldKey}` : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

function FieldChrome({
  field,
  helpText,
  error,
  children,
  idPrefix,
}: {
  field: PublicFormFieldData;
  helpText: string | null;
  error?: string;
  children: React.ReactNode;
  idPrefix: string;
}) {
  const helpId = helpText ? `${idPrefix}-field-help-${field.fieldKey}` : undefined;
  const errorId = error ? `${idPrefix}-field-error-${field.fieldKey}` : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <label
          htmlFor={
            field.type === FormFieldType.SINGLE_CHOICE ||
            field.type === FormFieldType.MULTIPLE_CHOICE ||
            field.type === FormFieldType.INFORMATIONAL
              ? undefined
              : inputId(idPrefix, field.fieldKey)
          }
          className="text-sm font-medium text-primary"
        >
          {field.label}
          {field.required ? (
            <span className="ms-1 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {field.required ? (
          <span className="text-[11px] text-muted">الزامی</span>
        ) : null}
      </div>
      {helpText ? (
        <p id={helpId} className="text-xs leading-6 text-muted">
          {helpText}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChoiceUnavailable({ label }: { label: string }) {
  return (
    <p
      role="status"
      className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-7 text-amber-950"
    >
      گزینه‌های سؤال «{label}» در حال حاضر قابل نمایش نیست. لطفاً بعداً دوباره
      تلاش کنید.
    </p>
  );
}

function getSafeOptions(field: PublicFormFieldData): ChoiceOption[] | null {
  const config = readChoiceConfig(field.config);
  if (!config) {
    console.error(
      `[public-form] Invalid choice config for fieldKey="${field.fieldKey}"`,
    );
    return null;
  }
  return config.options;
}

function asString(value: PreservedFieldValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: PreservedFieldValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function asBoolean(value: PreservedFieldValue | undefined): boolean {
  return value === true;
}

function TextInput({
  field,
  type,
  inputMode,
  defaultValue,
  error,
  helpText,
  placeholder,
  prefix,
  disabled,
  autoComplete,
  dir,
  maxLength,
  idPrefix,
}: {
  field: PublicFormFieldData;
  type: string;
  inputMode?: TextInputMode;
  defaultValue?: string;
  error?: string;
  helpText: string | null;
  placeholder: string | null;
  prefix: string | null;
  disabled?: boolean;
  autoComplete?: string;
  dir?: "ltr" | "rtl";
  maxLength?: number;
  idPrefix: string;
}) {
  if (prefix) {
    return (
      <div
        className={`mt-2 flex overflow-hidden rounded-xl border bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-secondary ${
          error ? "border-red-400" : "border-border"
        }`}
      >
        <span
          className="inline-flex shrink-0 items-center border-e border-border bg-slate-50 px-3 text-sm text-muted"
          dir="ltr"
        >
          {prefix}
        </span>
        <input
          id={inputId(idPrefix, field.fieldKey)}
          name={field.fieldKey}
          type={type}
          inputMode={inputMode}
          required={field.required}
          placeholder={placeholder ?? undefined}
          defaultValue={defaultValue}
          disabled={disabled}
          autoComplete={autoComplete ?? "off"}
          dir={dir}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(field.fieldKey, helpText, error, idPrefix)}
          className="w-full border-0 bg-transparent px-3.5 py-3 text-sm text-foreground outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    );
  }

  return (
    <input
      id={inputId(idPrefix, field.fieldKey)}
      name={field.fieldKey}
      type={type}
      inputMode={inputMode}
      required={field.required}
      placeholder={placeholder ?? undefined}
      defaultValue={defaultValue}
      disabled={disabled}
      autoComplete={autoComplete ?? "off"}
      dir={dir}
      maxLength={maxLength}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(field.fieldKey, helpText, error, idPrefix)}
      className={controlClassName(Boolean(error))}
    />
  );
}

function OptionsSelect({
  field,
  options,
  defaultValue,
  error,
  helpText,
  disabled,
  idPrefix,
}: {
  field: PublicFormFieldData;
  options: ChoiceOption[];
  defaultValue?: string;
  error?: string;
  helpText: string | null;
  disabled?: boolean;
  idPrefix: string;
}) {
  return (
    <select
      id={inputId(idPrefix, field.fieldKey)}
      name={field.fieldKey}
      required={field.required}
      defaultValue={defaultValue ?? ""}
      disabled={disabled}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(field.fieldKey, helpText, error, idPrefix)}
      className={controlClassName(Boolean(error))}
    >
      <option value="" disabled>
        انتخاب کنید
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

type PublicFormFieldProps = {
  field: PublicFormFieldData;
  error?: string;
  defaultValue?: PreservedFieldValue;
  disabled?: boolean;
  idPrefix?: string;
  formSlug?: string;
};

export function PublicFormField({
  field,
  error,
  defaultValue,
  disabled = false,
  idPrefix = "pf",
  formSlug,
}: PublicFormFieldProps) {
  const display = resolveFieldDisplayHints(field);
  const { helpText, placeholder, prefix } = display;

  if (field.type === FormFieldType.INFORMATIONAL) {
    return (
      <div
        role="note"
        className="rounded-xl border border-border bg-slate-50 px-4 py-3"
      >
        <p className="text-sm font-medium text-primary">{field.label}</p>
        {helpText ? (
          <p className="mt-1.5 text-sm leading-7 text-muted">{helpText}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === FormFieldType.FILE_UPLOAD) {
    const uploadDefault =
      (typeof defaultValue === "string"
        ? parseFormFileUploadAnswerFromFormValue(defaultValue)
        : parseFormFileUploadAnswer(defaultValue)) ?? undefined;
    return (
      <FieldChrome
        field={field}
        helpText={helpText}
        error={error}
        idPrefix={idPrefix}
      >
        {formSlug ? (
          <PublicFormFileUpload
            field={field}
            formSlug={formSlug}
            error={error}
            defaultValue={uploadDefault}
            disabled={disabled}
            idPrefix={idPrefix}
          />
        ) : (
          <p className="text-sm text-red-700" role="alert">
            بارگذاری فایل در این زمینه در دسترس نیست.
          </p>
        )}
      </FieldChrome>
    );
  }

  if (field.type === FormFieldType.CONSENT) {
    return (
      <div className="rounded-xl border border-border bg-white px-4 py-3">
        <label className="flex items-start gap-3 text-sm leading-7 text-foreground">
          <input
            id={inputId(idPrefix, field.fieldKey)}
            name={field.fieldKey}
            type="checkbox"
            value="yes"
            required={field.required}
            defaultChecked={asBoolean(defaultValue)}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            className="mt-1 size-4 shrink-0 rounded border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-60"
          />
          <span>
            {field.label}
            {field.required ? (
              <span className="ms-1 text-danger" aria-hidden="true">
                *
              </span>
            ) : null}
            {helpText ? (
              <span className="mt-1 block text-xs text-muted">{helpText}</span>
            ) : null}
            {error ? (
              <span className="mt-1 block text-sm text-red-700" role="alert">
                {error}
              </span>
            ) : null}
          </span>
        </label>
      </div>
    );
  }

  if (
    field.type === FormFieldType.SINGLE_CHOICE ||
    field.type === FormFieldType.MULTIPLE_CHOICE ||
    field.type === FormFieldType.DROPDOWN
  ) {
    const options = getSafeOptions(field);
    const singleDefault = asString(defaultValue);
    const multiDefault = asStringArray(defaultValue);

    return (
      <FieldChrome field={field} helpText={helpText} error={error} idPrefix={idPrefix}>
        {!options ? (
          <ChoiceUnavailable label={field.label} />
        ) : field.type === FormFieldType.DROPDOWN ? (
          <OptionsSelect
            field={field}
            options={options}
            defaultValue={singleDefault}
            error={error}
            helpText={helpText}
            disabled={disabled}
            idPrefix={idPrefix}
          />
        ) : field.type === FormFieldType.SINGLE_CHOICE ? (
          <fieldset className="mt-2 space-y-2" disabled={disabled}>
            <legend className="sr-only">{field.label}</legend>
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
              >
                <input
                  type="radio"
                  name={field.fieldKey}
                  value={option.value}
                  required={field.required}
                  defaultChecked={singleDefault === option.value}
                  disabled={disabled}
                  className="size-4 border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <fieldset className="mt-2 space-y-2" disabled={disabled}>
            <legend className="sr-only">{field.label}</legend>
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  name={field.fieldKey}
                  value={option.value}
                  defaultChecked={multiDefault.includes(option.value)}
                  disabled={disabled}
                  className="size-4 rounded border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        )}
      </FieldChrome>
    );
  }

  if (
    field.type === FormFieldType.GRADE ||
    field.type === FormFieldType.ACADEMIC_TRACK
  ) {
    const options = readChoiceConfig(field.config)?.options ?? null;
    const value = asString(defaultValue);

    return (
      <FieldChrome field={field} helpText={helpText} error={error} idPrefix={idPrefix}>
        {options ? (
          <OptionsSelect
            field={field}
            options={options}
            defaultValue={value}
            error={error}
            helpText={helpText}
            disabled={disabled}
            idPrefix={idPrefix}
          />
        ) : (
          <TextInput
            field={field}
            type="text"
            defaultValue={value}
            error={error}
            helpText={helpText}
            placeholder={placeholder}
            prefix={prefix}
            disabled={disabled}
            idPrefix={idPrefix}
          />
        )}
      </FieldChrome>
    );
  }

  const value = asString(defaultValue);

  return (
    <FieldChrome field={field} helpText={helpText} error={error} idPrefix={idPrefix}>
      {field.type === FormFieldType.LONG_TEXT ? (
        <textarea
          id={inputId(idPrefix, field.fieldKey)}
          name={field.fieldKey}
          required={field.required}
          rows={4}
          placeholder={placeholder ?? undefined}
          defaultValue={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(field.fieldKey, helpText, error, idPrefix)}
          className={controlClassName(Boolean(error))}
        />
      ) : field.type === FormFieldType.MOBILE ? (
        <TextInput
          field={field}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          dir="ltr"
          maxLength={16}
          defaultValue={value}
          error={error}
          helpText={helpText}
          placeholder={placeholder}
          prefix={prefix}
          disabled={disabled}
          idPrefix={idPrefix}
        />
      ) : field.type === FormFieldType.NATIONAL_ID ? (
        <TextInput
          field={field}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          maxLength={10}
          defaultValue={value}
          error={error}
          helpText={helpText}
          placeholder={placeholder}
          prefix={prefix}
          disabled={disabled}
          idPrefix={idPrefix}
        />
      ) : field.type === FormFieldType.EMAIL ? (
        <TextInput
          field={field}
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          defaultValue={value}
          error={error}
          helpText={helpText}
          placeholder={placeholder}
          prefix={prefix}
          disabled={disabled}
          idPrefix={idPrefix}
        />
      ) : field.type === FormFieldType.NUMBER ? (
        <TextInput
          field={field}
          type="number"
          inputMode="decimal"
          dir="ltr"
          defaultValue={value}
          error={error}
          helpText={helpText}
          placeholder={placeholder}
          prefix={prefix}
          disabled={disabled}
          idPrefix={idPrefix}
        />
      ) : field.type === FormFieldType.DATE ? (
        <JalaliDateField
          id={inputId(idPrefix, field.fieldKey)}
          name={field.fieldKey}
          defaultValue={value || null}
          disabled={disabled}
          hasError={Boolean(error)}
          required={field.required}
          aria-describedby={describedBy(
            field.fieldKey,
            helpText,
            error,
            idPrefix,
          )}
        />
      ) : (
        <TextInput
          field={field}
          type="text"
          defaultValue={value}
          error={error}
          helpText={helpText}
          placeholder={placeholder}
          prefix={prefix}
          disabled={disabled}
          idPrefix={idPrefix}
        />
      )}
    </FieldChrome>
  );
}
