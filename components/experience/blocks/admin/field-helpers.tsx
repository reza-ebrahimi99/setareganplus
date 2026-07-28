import type { ReactNode } from "react";

export const ADMIN_INPUT_CLASS =
  "min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full";

export function EditorHeader({
  labelFa,
  descriptionFa,
}: {
  labelFa: string;
  descriptionFa: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-primary">{labelFa}</p>
      {descriptionFa ? (
        <p className="mt-1 text-xs leading-6 text-muted">{descriptionFa}</p>
      ) : null}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-700">{message}</p>;
}

export function CtaButtonFields({
  prefix,
  label,
  defaults,
  disabled,
  fieldErrors,
}: {
  prefix: string;
  label: string;
  defaults?: { label: string; href: string };
  disabled?: boolean;
  fieldErrors: Partial<Record<string, string>>;
}) {
  return (
    <fieldset className="space-y-2 rounded-xl border border-border p-3" disabled={disabled}>
      <legend className="px-1 text-sm text-muted">{label}</legend>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">متن دکمه</span>
        <input
          name={`${prefix}Label`}
          defaultValue={defaults?.label ?? ""}
          disabled={disabled}
          className={ADMIN_INPUT_CLASS}
        />
        <FieldError message={fieldErrors[`${prefix}Label`] ?? fieldErrors[`${prefix}.label`]} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">پیوند</span>
        <input
          name={`${prefix}Href`}
          defaultValue={defaults?.href ?? ""}
          disabled={disabled}
          className={ADMIN_INPUT_CLASS}
          dir="ltr"
        />
        <FieldError message={fieldErrors[`${prefix}Href`] ?? fieldErrors[`${prefix}.href`]} />
      </label>
      <FieldError message={fieldErrors[prefix]} />
    </fieldset>
  );
}

export function EditorShell({
  labelFa,
  descriptionFa,
  disabled,
  children,
}: {
  labelFa: string;
  descriptionFa: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`space-y-3 ${disabled ? "opacity-60" : ""}`}
      aria-disabled={disabled || undefined}
    >
      <EditorHeader labelFa={labelFa} descriptionFa={descriptionFa} />
      {children}
    </div>
  );
}
