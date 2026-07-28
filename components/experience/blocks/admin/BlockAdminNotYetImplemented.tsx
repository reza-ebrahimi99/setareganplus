"use client";

import type { ExperienceAdminBlockEditorProps } from "@/lib/experience/definition-types";

/**
 * Temporary admin panel when field UI for a block is not wired yet.
 * Registry definitions remain complete; this is presentation-only.
 */
export function BlockAdminNotYetImplemented<Config>({
  labelFa,
  descriptionFa,
  config,
  fieldErrors,
  disabled,
}: ExperienceAdminBlockEditorProps<Config>) {
  const errorKeys = Object.keys(fieldErrors);
  return (
    <div
      className={`rounded-xl border border-dashed border-border bg-white px-4 py-5 ${
        disabled ? "opacity-60" : ""
      }`}
      aria-disabled={disabled || undefined}
    >
      <p className="text-sm font-semibold text-primary">{labelFa}</p>
      {descriptionFa ? (
        <p className="mt-1 text-xs leading-6 text-muted">{descriptionFa}</p>
      ) : null}
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        ویرایشگر فیلدهای این بلوک هنوز پیاده‌سازی نشده است (Not Yet Implemented).
        تعریف رجیستری، پارسر و پیکربندی پیش‌فرض کامل است.
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted">
          پیش‌نمایش پیکربندی تایپ‌شده
        </summary>
        <pre
          className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-5 text-slate-700"
          dir="ltr"
        >
          {JSON.stringify(config, null, 2)}
        </pre>
      </details>
      {errorKeys.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-red-800">
          {errorKeys.map((key) => (
            <li key={key}>
              {key}: {fieldErrors[key]}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
