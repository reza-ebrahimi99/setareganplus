/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { SubmitButton } from "./SubmitButton";

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-paper p-5 sm:p-6 ${className}`}>
      {title && <h2 className="mb-4 font-extrabold text-navy">{title}</h2>}
      {children}
    </section>
  );
}

export function Field({ label, name, defaultValue, hint, type = "text", required, dir, placeholder }: { label: string; name: string; defaultValue?: string | number | null; hint?: string; type?: string; required?: boolean; dir?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} dir={dir} placeholder={placeholder} className="input" />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Area({ label, name, defaultValue, hint, rows = 4, dir }: { label: string; name: string; defaultValue?: string | null; hint?: string; rows?: number; dir?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={rows} dir={dir} className="input leading-7" />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-navy" />
      {label}
    </label>
  );
}

export function ImageInput({ label, name, current }: { label: string; name: string; current?: string | null }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl border border-line bg-ivory">
          {current && <img src={current} alt="" className="size-full object-cover" />}
        </div>
        <div className="space-y-2 text-sm">
          <input type="file" name={name} accept="image/*" className="block text-sm file:ml-3 file:rounded-full file:border-0 file:bg-navy/5 file:px-3 file:py-1.5 file:font-semibold" />
          {current && (
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" name={`${name}_remove`} className="accent-gc" /> حذف تصویر فعلی
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

export function Flash({ ok }: { ok?: string }) {
  if (!ok) return null;
  return <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">✓ تغییرات ذخیره شد.</div>;
}

export function SaveBar({ back, label = "ذخیره تغییرات" }: { back?: string; label?: string }) {
  return (
    <div className="sticky bottom-0 -mx-1 mt-6 flex items-center gap-3 border-t border-line bg-ivory/95 px-1 py-4 backdrop-blur">
      <SubmitButton>{label}</SubmitButton>
      {back && <Link href={back} className="text-sm font-semibold text-muted hover:text-ink">انصراف</Link>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line bg-paper px-6 py-12 text-center text-muted">{children}</div>;
}

export const STATUS: Record<string, { label: string; cls: string }> = {
  NEW: { label: "جدید", cls: "bg-gold/20 text-gold-ink" },
  CONTACTED: { label: "تماس گرفته شد", cls: "bg-edu-soft text-edu" },
  ENROLLED: { label: "ثبت‌نام شد", cls: "bg-emerald-50 text-emerald-700" },
  ARCHIVED: { label: "بایگانی", cls: "bg-line text-muted" },
};
