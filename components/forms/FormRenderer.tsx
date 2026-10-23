"use client";

import { useMemo, useState } from "react";
import type { FieldDef, FormValues } from "@/lib/forms/types";
import { isVisible, validateValues } from "@/lib/forms/validate";
import { fa } from "@/lib/format";

export type PublicForm = {
  slug: string;
  title: string;
  description?: string | null;
  fields: FieldDef[];
  submitLabel: string;
  successMessage: string;
};

const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

function JalaliDate({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const [y, m, d] = (value || "//").split("/");
  const thisYear = Number(new Intl.DateTimeFormat("en-u-ca-persian", { year: "numeric" }).format(new Date()).replace(/\D/g, "")) || 1405;
  const years = useMemo(() => Array.from({ length: 90 }, (_, i) => String(thisYear + 2 - i)), [thisYear]);
  const days = Number(m) > 0 && Number(m) <= 6 ? 31 : Number(m) === 12 ? 30 : 30;
  const set = (ny = y, nm = m, nd = d) => onChange(ny && nm && nd ? `${ny}/${nm}/${nd}` : `${ny}/${nm}/${nd}`);
  return (
    <div className="grid grid-cols-3 gap-2" id={id}>
      <select className="input" aria-label="روز" value={d} onChange={(e) => set(y, m, e.target.value)}>
        <option value="">روز</option>
        {Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, "0")).map((v) => <option key={v} value={v}>{fa(Number(v))}</option>)}
      </select>
      <select className="input" aria-label="ماه" value={m} onChange={(e) => set(y, e.target.value, d)}>
        <option value="">ماه</option>
        {MONTHS.map((name, i) => <option key={name} value={String(i + 1).padStart(2, "0")}>{name}</option>)}
      </select>
      <select className="input" aria-label="سال" value={y} onChange={(e) => set(e.target.value, m, d)}>
        <option value="">سال</option>
        {years.map((v) => <option key={v} value={v}>{fa(v)}</option>)}
      </select>
    </div>
  );
}

export function FormRenderer({
  form,
  preview = false,
  accent = "edu",
  defaults,
}: {
  form: PublicForm;
  preview?: boolean;
  accent?: "edu" | "gc";
  defaults?: FormValues;
}) {
  const [values, setValues] = useState<FormValues>(defaults ?? {});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const set = (id: string, v: string | string[]) => {
    setValues((prev) => ({ ...prev, [id]: v }));
    if (errors[id]) setErrors(({ [id]: _, ...rest }) => rest);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) return;
    const v = structuredClone(values);
    const errs = validateValues(form.fields, v);
    for (const f of form.fields) {
      if (f.type === "file" && f.required && isVisible(f, values) && !files[f.id]) errs[f.id] = "بارگذاری فایل الزامی است.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`f-${Object.keys(errs)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setState("sending");
    const fd = new FormData();
    fd.set("__values", JSON.stringify(v));
    fd.set("__hp", (document.getElementById(`hp-${form.slug}`) as HTMLInputElement | null)?.value ?? "");
    for (const [id, file] of Object.entries(files)) if (file && isVisible(form.fields.find((f) => f.id === id)!, values)) fd.set(`file_${id}`, file);
    try {
      const res = await fetch(`/api/forms/${form.slug}`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setErrors(json.errors ?? {});
        setMessage(json.error ?? "ارسال انجام نشد. لطفاً دوباره تلاش کنید.");
        setState("error");
        return;
      }
      setState("done");
      setMessage(json.message);
    } catch {
      setState("error");
      setMessage("اتصال برقرار نشد. لطفاً دوباره تلاش کنید.");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-lg font-extrabold text-emerald-800">✓ ثبت شد</p>
        <p className="mt-2 text-emerald-900/80">{message}</p>
      </div>
    );
  }

  const ring = accent === "gc" ? "accent-gc" : "accent-edu";

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
      <input id={`hp-${form.slug}`} name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {form.fields.map((f) => {
        if (!isVisible(f, values)) return null;
        const err = errors[f.id];
        const id = `f-${f.id}`;
        const v = values[f.id];
        const span = f.half ? "" : "sm:col-span-2";
        const labelEl = (
          <label htmlFor={id} className="label">
            {f.label}
            {f.required && <span className="mr-1 text-gc">*</span>}
          </label>
        );
        let control: React.ReactNode = null;
        switch (f.type) {
          case "textarea":
            control = <textarea id={id} rows={4} className="input" placeholder={f.placeholder} value={(v as string) ?? ""} onChange={(e) => set(f.id, e.target.value)} />;
            break;
          case "select":
            control = (
              <select id={id} className="input" value={(v as string) ?? ""} onChange={(e) => set(f.id, e.target.value)}>
                <option value="">انتخاب کنید</option>
                {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
              </select>
            );
            break;
          case "radio":
            control = (
              <div id={id} role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                {(f.options ?? []).map((o) => (
                  <label key={o} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[0.95rem] transition-colors ${v === o ? "border-navy bg-navy/[0.03]" : "border-line bg-paper hover:border-navy/30"}`}>
                    <input type="radio" name={id} className={`size-4 ${ring}`} checked={v === o} onChange={() => set(f.id, o)} />
                    {o}
                  </label>
                ))}
              </div>
            );
            break;
          case "checkbox":
            if (f.options?.length) {
              const arr = Array.isArray(v) ? v : [];
              control = (
                <div id={id} className="grid gap-2 sm:grid-cols-2">
                  {f.options.map((o) => (
                    <label key={o} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[0.95rem]">
                      <input type="checkbox" className={`size-4 ${ring}`} checked={arr.includes(o)} onChange={(e) => set(f.id, e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />
                      {o}
                    </label>
                  ))}
                </div>
              );
            } else {
              return (
                <div key={f.id} className={span}>
                  <label id={id} className="flex cursor-pointer items-start gap-2.5 text-[0.95rem]">
                    <input type="checkbox" className={`mt-1.5 size-4 ${ring}`} checked={v === "بله"} onChange={(e) => set(f.id, e.target.checked ? "بله" : "")} />
                    <span>{f.label}{f.required && <span className="mr-1 text-gc">*</span>}</span>
                  </label>
                  {f.help && <p className="mt-1.5 text-xs text-muted">{f.help}</p>}
                  {err && <p className="mt-1.5 text-sm text-gc">{err}</p>}
                </div>
              );
            }
            break;
          case "date":
            control = <JalaliDate id={id} value={(v as string) ?? ""} onChange={(nv) => set(f.id, nv)} />;
            break;
          case "file":
            control = (
              <input
                id={id}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="input file:ml-3 file:rounded-full file:border-0 file:bg-navy/5 file:px-3 file:py-1 file:text-sm file:font-semibold"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && file.size > 5 * 1024 * 1024) {
                    setErrors((p) => ({ ...p, [f.id]: "حجم فایل بیش از ۵ مگابایت است." }));
                    e.target.value = "";
                    return;
                  }
                  setFiles((p) => ({ ...p, [f.id]: file }));
                }}
              />
            );
            break;
          default:
            control = (
              <input
                id={id}
                type={f.type === "phone" ? "tel" : "text"}
                inputMode={f.type === "phone" || f.type === "number" ? "numeric" : undefined}
                dir={f.type === "phone" ? "ltr" : undefined}
                autoComplete={f.type === "phone" ? "tel" : undefined}
                className={`input ${f.type === "phone" ? "text-right" : ""}`}
                placeholder={f.placeholder}
                value={(v as string) ?? ""}
                onChange={(e) => set(f.id, e.target.value)}
              />
            );
        }
        return (
          <div key={f.id} className={span}>
            {labelEl}
            {control}
            {f.help && <p className="mt-1.5 text-xs leading-6 text-muted">{f.help}</p>}
            {err && <p className="mt-1.5 text-sm text-gc">{err}</p>}
          </div>
        );
      })}
      {state === "error" && message && <p className="rounded-xl bg-gc-soft px-4 py-3 text-sm text-gc sm:col-span-2">{message}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={state === "sending" || preview} className="btn-gold w-full sm:w-auto sm:min-w-48">
          {state === "sending" ? "در حال ارسال…" : form.submitLabel}
        </button>
        {preview && <p className="mt-2 text-xs text-muted">پیش‌نمایش — ارسال غیرفعال است.</p>}
      </div>
    </form>
  );
}
