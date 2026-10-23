"use client";

import { useMemo, useState } from "react";
import { optionsOf, type FieldDef, type FormValues } from "@/lib/forms/types";
import { checkOne, isVisible, validateValues } from "@/lib/forms/validate";
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
  const days = Number(m) > 0 && Number(m) <= 6 ? 31 : 30;
  const set = (ny = y, nm = m, nd = d) => onChange(ny && nm && nd ? `${ny}/${nm}/${nd}` : `${ny}/${nm}/${nd}`);
  return (
    <div className="grid grid-cols-3 gap-2" id={id}>
      <select className="input min-w-0 !px-2" aria-label="روز" value={d} onChange={(e) => set(y, m, e.target.value)}>
        <option value="">روز</option>
        {Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, "0")).map((v) => <option key={v} value={v}>{fa(Number(v))}</option>)}
      </select>
      <select className="input min-w-0 !px-2" aria-label="ماه" value={m} onChange={(e) => set(y, e.target.value, d)}>
        <option value="">ماه</option>
        {MONTHS.map((name, i) => <option key={name} value={String(i + 1).padStart(2, "0")}>{name}</option>)}
      </select>
      <select className="input min-w-0 !px-2" aria-label="سال" value={y} onChange={(e) => set(e.target.value, m, d)}>
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
  narrow = false,
}: {
  form: PublicForm;
  preview?: boolean;
  narrow?: boolean;
  accent?: "edu" | "gc";
  defaults?: FormValues;
}) {
  const [values, setValues] = useState<FormValues>(defaults ?? {});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [ref, setRef] = useState("");
  const [nonce, setNonce] = useState(0);

  const blur = (f: FieldDef) => {
    const v = values[f.id];
    if (v === undefined || (typeof v === "string" && v.trim() === "")) return; // don't nag on untouched fields
    const r = checkOne(f, v);
    setErrors((p) => {
      const { [f.id]: _, ...rest } = p;
      return r.error ? { ...rest, [f.id]: r.error } : rest;
    });
  };

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
      const first = form.fields.find((f) => errs[f.id]);
      const el = first && document.getElementById(`f-${first.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement | null)?.focus?.({ preventScroll: true });
      setMessage(`${Object.keys(errs).length.toLocaleString("fa-IR")} مورد نیاز به اصلاح دارد.`);
      setState("error");
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
      setRef(json.ref ?? "");
      window.scrollTo({ top: Math.max(0, (document.getElementById(`form-${form.slug}`)?.getBoundingClientRect().top ?? 0) + window.scrollY - 120), behavior: "smooth" });
    } catch {
      setState("error");
      setMessage("اتصال برقرار نشد. لطفاً دوباره تلاش کنید.");
    }
  }

  if (state === "done") {
    return (
      <div id={`form-${form.slug}`} className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-paper p-8 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
          <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <p className="mt-4 text-xl font-extrabold text-emerald-800">با موفقیت ثبت شد</p>
        <p className="mx-auto mt-2 max-w-md leading-7 text-emerald-900/80">{message}</p>
        {ref && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-paper px-4 py-2 text-sm">
            کد پیگیری: <b className="font-mono text-base tracking-widest text-navy" dir="ltr">{ref}</b>
          </p>
        )}
        <div className="mt-6">
          <button type="button" onClick={() => { setValues(defaults ?? {}); setFiles({}); setErrors({}); setRef(""); setState("idle"); setNonce((n) => n + 1); }} className="text-sm font-semibold text-muted underline-offset-4 hover:text-navy hover:underline">ثبت یک پاسخ دیگر</button>
        </div>
      </div>
    );
  }

  const full = narrow ? "" : "sm:col-span-2";
  const ring = accent === "gc" ? "accent-gc" : "accent-edu";

  return (
    <form key={nonce} id={`form-${form.slug}`} onSubmit={submit} noValidate className={`grid grid-cols-1 gap-x-4 gap-y-5 ${narrow ? "" : "sm:grid-cols-2"}`}>
      {form.fields.some((f) => f.required) && <p className={`-mb-1 text-xs text-muted ${full}`}>پر کردن موارد ستاره‌دار (<span className="text-gc">*</span>) الزامی است.</p>}
      <input id={`hp-${form.slug}`} name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {form.fields.map((f) => {
        if (!isVisible(f, values)) return null;
        const err = errors[f.id];
        const id = `f-${f.id}`;
        const v = values[f.id];
        const span = f.half ? "" : full;
        if (f.type === "section") {
          return (
            <div key={f.id} className={`mt-2 border-b border-line pb-2 ${full}`}>
              <p className="flex items-center gap-2 font-extrabold text-navy"><span className="h-4 w-1 rounded-full bg-gold" />{f.label}</p>
              {f.help && <p className="mt-1 text-sm leading-6 text-muted">{f.help}</p>}
            </div>
          );
        }
        const bad = err ? "!border-gc/60 !ring-gc/10 bg-gc-soft/30" : "";
        const labelEl = (
          <label htmlFor={id} className="label">
            {f.label}
            {f.required && <span className="mr-1 text-gc">*</span>}
          </label>
        );
        let control: React.ReactNode = null;
        switch (f.type) {
          case "textarea":
            control = <textarea id={id} rows={4} aria-invalid={!!err} className={`input ${bad}`} onBlur={() => blur(f)} placeholder={f.placeholder} value={(v as string) ?? ""} onChange={(e) => set(f.id, e.target.value)} />;
            break;
          case "select":
          case "grade":
          case "major":
            control = (
              <select id={id} aria-invalid={!!err} className={`input ${bad}`} value={(v as string) ?? ""} onChange={(e) => set(f.id, e.target.value)}>
                <option value="">{f.placeholder || "انتخاب کنید"}</option>
                {optionsOf(f).filter(Boolean).map((o) => <option key={o}>{o}</option>)}
              </select>
            );
            break;
          case "radio":
            control = (
              <div id={id} role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                {optionsOf(f).filter(Boolean).map((o) => (
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
          case "file": {
            const file = files[f.id];
            control = (
              <label htmlFor={id} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition-colors ${file ? "border-emerald-300 bg-emerald-50/50" : err ? "border-gc/50 bg-gc-soft/30" : "border-line bg-ivory/60 hover:border-navy/30"}`}>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${file ? "bg-emerald-500 text-white" : "bg-navy/5 text-navy"}`}>
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{file ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />}</svg>
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-semibold text-navy">{file ? file.name : "انتخاب فایل"}</span>
                  <span className="block text-xs text-muted">{file ? `${(file.size / 1024 / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت — برای تغییر کلیک کنید` : "عکس (JPG، PNG) یا PDF — حداکثر ۵ مگابایت"}</span>
                </span>
                <input
                  id={id}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      setErrors((p) => ({ ...p, [f.id]: "حجم فایل بیش از ۵ مگابایت است." }));
                      e.target.value = "";
                      return;
                    }
                    setErrors(({ [f.id]: _, ...rest }) => rest);
                    setFiles((p) => ({ ...p, [f.id]: file }));
                  }}
                />
              </label>
            );
            break;
          }
          default: {
            const ltr = f.type === "phone" || f.type === "nationalCode" || f.type === "email";
            control = (
              <input
                id={id}
                type={f.type === "phone" ? "tel" : f.type === "email" ? "email" : "text"}
                inputMode={f.type === "phone" ? "tel" : f.type === "number" || f.type === "nationalCode" ? "numeric" : f.type === "email" ? "email" : undefined}
                maxLength={f.type === "nationalCode" ? 10 : f.type === "phone" ? 14 : undefined}
                dir={ltr ? "ltr" : undefined}
                autoComplete={f.type === "phone" ? "tel" : f.type === "email" ? "email" : "off"}
                aria-invalid={!!err}
                className={`input ${ltr ? "text-right placeholder:text-right" : ""} ${bad}`}
                placeholder={f.placeholder || (f.type === "phone" ? "۰۹۱۲۱۲۳۴۵۶۷" : f.type === "nationalCode" ? "۱۰ رقم" : f.type === "email" ? "name@example.com" : undefined)}
                value={(v as string) ?? ""}
                onChange={(e) => set(f.id, e.target.value)}
                onBlur={() => blur(f)}
              />
            );
          }
        }
        return (
          <div key={f.id} className={span}>
            {labelEl}
            {control}
            {f.help && <p className="mt-1.5 text-xs leading-6 text-muted">{f.help}</p>}
            {err && <p className="mt-1.5 flex items-center gap-1 text-sm text-gc"><span aria-hidden>⚠</span>{err}</p>}
          </div>
        );
      })}
      {state === "error" && message && <p className={`rounded-xl bg-gc-soft px-4 py-3 text-sm text-gc ${full}`}>{message}</p>}
      <div className={full}>
        <button type="submit" disabled={state === "sending" || preview} className="btn-gold w-full py-3.5 text-base sm:w-auto sm:min-w-56">
          {state === "sending" ? (
            <span className="inline-flex items-center gap-2"><span className="size-4 animate-spin rounded-full border-2 border-navy/30 border-t-navy" />در حال ارسال…</span>
          ) : form.submitLabel}
        </button>
        {preview && <p className="mt-2 text-xs text-muted">پیش‌نمایش — ارسال غیرفعال است.</p>}
      </div>
    </form>
  );
}
