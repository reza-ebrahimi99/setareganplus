import { FormFieldType } from "@/generated/prisma/enums";
import {
  readChoiceConfig,
  type ChoiceOption,
} from "@/lib/forms/choice-options";
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
    "mt-2 w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  return hasError
    ? `${base} border-red-400`
    : `${base} border-border`;
}

function FieldChrome({
  field,
  error,
  children,
}: {
  field: PublicFormFieldData;
  error?: string;
  children: React.ReactNode;
}) {
  const helpId = field.helpText ? `field-help-${field.fieldKey}` : undefined;
  const errorId = error ? `field-error-${field.fieldKey}` : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <label
          htmlFor={
            field.type === FormFieldType.SINGLE_CHOICE ||
            field.type === FormFieldType.MULTIPLE_CHOICE ||
            field.type === FormFieldType.INFORMATIONAL
              ? undefined
              : `field-input-${field.fieldKey}`
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
      {field.helpText ? (
        <p id={helpId} className="text-xs leading-6 text-muted">
          {field.helpText}
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
}: {
  field: PublicFormFieldData;
  type: string;
  inputMode?: TextInputMode;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <input
      id={`field-input-${field.fieldKey}`}
      name={field.fieldKey}
      type={type}
      inputMode={inputMode}
      required={field.required}
      placeholder={field.placeholder ?? undefined}
      defaultValue={defaultValue}
      aria-invalid={error ? true : undefined}
      aria-describedby={
        [field.helpText ? `field-help-${field.fieldKey}` : null, error ? `field-error-${field.fieldKey}` : null]
          .filter(Boolean)
          .join(" ") || undefined
      }
      className={controlClassName(Boolean(error))}
      autoComplete="off"
    />
  );
}

function OptionsSelect({
  field,
  options,
  defaultValue,
  error,
}: {
  field: PublicFormFieldData;
  options: ChoiceOption[];
  defaultValue?: string;
  error?: string;
}) {
  return (
    <select
      id={`field-input-${field.fieldKey}`}
      name={field.fieldKey}
      required={field.required}
      defaultValue={defaultValue ?? ""}
      aria-invalid={error ? true : undefined}
      aria-describedby={
        [field.helpText ? `field-help-${field.fieldKey}` : null, error ? `field-error-${field.fieldKey}` : null]
          .filter(Boolean)
          .join(" ") || undefined
      }
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
};

export function PublicFormField({
  field,
  error,
  defaultValue,
}: PublicFormFieldProps) {
  if (field.type === FormFieldType.INFORMATIONAL) {
    return (
      <div
        role="note"
        className="rounded-xl border border-border bg-slate-50 px-4 py-3"
      >
        <p className="text-sm font-medium text-primary">{field.label}</p>
        {field.helpText ? (
          <p className="mt-1.5 text-sm leading-7 text-muted">{field.helpText}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === FormFieldType.CONSENT) {
    return (
      <div className="rounded-xl border border-border bg-white px-4 py-3">
        <label className="flex items-start gap-3 text-sm leading-7 text-foreground">
          <input
            id={`field-input-${field.fieldKey}`}
            name={field.fieldKey}
            type="checkbox"
            value="yes"
            required={field.required}
            defaultChecked={asBoolean(defaultValue)}
            aria-invalid={error ? true : undefined}
            className="mt-1 size-4 shrink-0 rounded border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          />
          <span>
            {field.label}
            {field.required ? (
              <span className="ms-1 text-danger" aria-hidden="true">
                *
              </span>
            ) : null}
            {field.helpText ? (
              <span className="mt-1 block text-xs text-muted">{field.helpText}</span>
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
      <FieldChrome field={field} error={error}>
        {!options ? (
          <ChoiceUnavailable label={field.label} />
        ) : field.type === FormFieldType.DROPDOWN ? (
          <OptionsSelect
            field={field}
            options={options}
            defaultValue={singleDefault}
            error={error}
          />
        ) : field.type === FormFieldType.SINGLE_CHOICE ? (
          <fieldset className="mt-2 space-y-2">
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
                  className="size-4 border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <fieldset className="mt-2 space-y-2">
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
      <FieldChrome field={field} error={error}>
        {options ? (
          <OptionsSelect
            field={field}
            options={options}
            defaultValue={value}
            error={error}
          />
        ) : (
          <TextInput
            field={field}
            type="text"
            defaultValue={value}
            error={error}
          />
        )}
      </FieldChrome>
    );
  }

  const value = asString(defaultValue);

  return (
    <FieldChrome field={field} error={error}>
      {field.type === FormFieldType.LONG_TEXT ? (
        <textarea
          id={`field-input-${field.fieldKey}`}
          name={field.fieldKey}
          required={field.required}
          rows={4}
          placeholder={field.placeholder ?? undefined}
          defaultValue={value}
          aria-invalid={error ? true : undefined}
          className={controlClassName(Boolean(error))}
        />
      ) : field.type === FormFieldType.MOBILE ? (
        <TextInput
          field={field}
          type="tel"
          inputMode="tel"
          defaultValue={value}
          error={error}
        />
      ) : field.type === FormFieldType.EMAIL ? (
        <TextInput
          field={field}
          type="email"
          inputMode="email"
          defaultValue={value}
          error={error}
        />
      ) : field.type === FormFieldType.NUMBER ? (
        <TextInput
          field={field}
          type="number"
          inputMode="decimal"
          defaultValue={value}
          error={error}
        />
      ) : field.type === FormFieldType.DATE ? (
        <TextInput
          field={field}
          type="date"
          defaultValue={value}
          error={error}
        />
      ) : (
        <TextInput
          field={field}
          type="text"
          defaultValue={value}
          error={error}
        />
      )}
    </FieldChrome>
  );
}
