"use client";

import { useMemo, useRef, useState } from "react";
import { optionsOf, splitSteps, type FieldDef, type FormValues } from "@/lib/forms/types";
import { checkOne, isVisible, validateValues } from "@/lib/forms/validate";
import { totals, isPaidMode, tomanText, type Discount } from "@/lib/forms/pricing";
import { themeVars } from "@/lib/forms/themes";
import type { PublicForm } from "@/lib/forms/public-types";
import { fa, jalaliDateTime } from "@/lib/format";

export type { PublicForm } from "@/lib/forms/public-types";

const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

function JalaliDate({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const [y, m, d] = (value || "//").split("/");
  const thisYear = Number(new Intl.DateTimeFormat("en-u-ca-persian", { year: "numeric" }).format(new Date()).replace(/\D/g, "")) || 1405;
  const years = useMemo(() => Array.from({ length: 90 }, (_, i) => String(thisYear + 2 - i)), [thisYear]);
  const days = Number(m) > 0 && Number(m) <= 6 ? 31 : 30;
  const set = (ny = y, nm = m, nd = d) => onChange(`${ny}/${nm}/${nd}`);
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

const Check = ({ on }: { on: boolean }) => (
  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${on ? "border-[var(--fa)] bg-[var(--fa)] text-white" : "border-line bg-paper"}`}>
    {on && <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
  </span>
);

/** Shown instead of the form when registration is not open. */
export function FormStateCard({ form }: { form: PublicForm }) {
  const s = form.state ?? "open";
  if (s === "open") return null;
  const view = {
    soon: { icon: "⏳", t: "ثبت‌نام به‌زودی آغاز می‌شود", d: form.opensAt ? `شروع ثبت‌نام: ${jalaliDateTime(form.opensAt)}` : "" },
    closed: { icon: "🔒", t: "مهلت ثبت‌نام به پایان رسیده است", d: form.closesAt ? `پایان ثبت‌نام: ${jalaliDateTime(form.closesAt)}` : "این فرم دیگر پاسخ نمی‌پذیرد." },
    full: { icon: "🎟", t: "ظرفیت تکمیل شد", d: "همهٔ جاهای این ثبت‌نام پر شده است. برای فهرست انتظار با ما تماس بگیرید." },
  }[s];
  return (
    <div data-form-state={s} className="rounded-2xl border border-line bg-[var(--fa-soft)] p-8 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-paper text-3xl shadow-sm" aria-hidden>{view.icon}</span>
      <p className="mt-4 text-xl font-black text-navy">{view.t}</p>
      {view.d && <p className="mt-2 text-sm leading-7 text-muted">{view.d}</p>}
      <a href="/forms" className="btn-ghost mt-5 inline-flex px-5 py-2 text-sm">ثبت‌نام‌های باز دیگر</a>
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
  const [state, setState] = useState<"idle" | "sending" | "paying" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<{ ref: string; receipt?: string; redirect?: string | null } | null>(null);
  const [failReceipt, setFailReceipt] = useState("");
  const [nonce, setNonce] = useState(0);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"next" | "back">("next");
  const [code, setCode] = useState("");
  const [disc, setDisc] = useState<(Discount & { code: string }) | null>(null);
  const [discMsg, setDiscMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const theme = form.theme && form.theme !== "navy" ? form.theme : accent === "gc" ? "crimson" : form.theme;
  const steps = useMemo(() => splitSteps(form.fields, "اطلاعات"), [form.fields]);
  const cur = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;
  const pricing = { payMode: form.payMode ?? "FREE", basePriceRials: form.basePriceRials ?? 0 };
  const paid = isPaidMode(pricing);
  const priced = form.payMode === "OPTIONS";
  const t = totals(pricing, form.fields, values, disc);
  const willPay = paid && t.total > 0;

  if (!preview && form.state && form.state !== "open") return <div style={themeVars(theme)}><FormStateCard form={form} /></div>;

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
  const scrollTop = () => {
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 80) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: "smooth" });
  };

  /** Errors for a list of fields (visible ones only) incl. required files. */
  function errorsFor(fields: FieldDef[]) {
    const v = structuredClone(values);
    const errs = validateValues(fields, v);
    for (const f of fields) if (f.type === "file" && f.required && isVisible(f, values) && !files[f.id]) errs[f.id] = "بارگذاری فایل الزامی است.";
    return errs;
  }
  function showErrors(errs: Record<string, string>) {
    setErrors(errs);
    const first = form.fields.find((f) => errs[f.id]);
    const el = first && document.getElementById(`f-${first.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    (el as HTMLElement | null)?.focus?.({ preventScroll: true });
    setMessage(`${Object.keys(errs).length.toLocaleString("fa-IR")} مورد نیاز به اصلاح دارد.`);
    setState("error");
  }
  function go(to: number) {
    setDir(to > step ? "next" : "back");
    setStep(to);
    setMessage("");
    setState("idle");
    requestAnimationFrame(scrollTop);
  }
  function next() {
    if (!preview) {
      const errs = errorsFor(cur.fields);
      if (Object.keys(errs).length) return showErrors(errs);
    }
    go(step + 1);
  }

  async function applyCode() {
    if (preview) return;
    setDiscMsg(null);
    const res = await fetch(`/api/forms/${form.slug}/discount`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setDisc(null);
      setDiscMsg({ ok: false, t: json.error ?? "بررسی کد انجام نشد." });
      return;
    }
    setDisc({ code: json.code, percent: json.percent, amountRials: json.amountRials });
    setDiscMsg({ ok: true, t: `کد «${json.code}» اعمال شد.` });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!last) return next();
    if (preview) return;
    const v = structuredClone(values);
    const errs = errorsFor(form.fields);
    validateValues(form.fields, v);
    if (Object.keys(errs).length) {
      const at = steps.findIndex((s) => s.fields.some((f) => errs[f.id]));
      if (at >= 0 && at !== step) go(at);
      setTimeout(() => showErrors(errs), 50);
      return;
    }
    setState("sending");
    setFailReceipt("");
    const fd = new FormData();
    fd.set("__values", JSON.stringify(v));
    fd.set("__hp", (document.getElementById(`hp-${form.slug}`) as HTMLInputElement | null)?.value ?? "");
    if (disc) fd.set("__discount", disc.code);
    for (const [id, file] of Object.entries(files)) if (file && isVisible(form.fields.find((f) => f.id === id)!, values)) fd.set(`file_${id}`, file);
    try {
      const res = await fetch(`/api/forms/${form.slug}`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setErrors(json.errors ?? {});
        if (json.errors?.__discount) { setDisc(null); setDiscMsg({ ok: false, t: json.errors.__discount }); }
        setMessage(json.error ?? "ارسال انجام نشد. لطفاً دوباره تلاش کنید.");
        if (json.receipt) setFailReceipt(json.receipt);
        setState("error");
        return;
      }
      if (json.pay) {
        setState("paying");
        window.location.href = json.pay;
        return;
      }
      setDone({ ref: json.ref ?? "", receipt: json.receipt, redirect: json.redirect });
      setMessage(json.message);
      setState("done");
      requestAnimationFrame(scrollTop);
      if (json.redirect) setTimeout(() => { window.location.href = json.redirect; }, 6000);
    } catch {
      setState("error");
      setMessage("اتصال برقرار نشد. لطفاً دوباره تلاش کنید.");
    }
  }

  if (state === "done" && done) {
    return (
      <div ref={top} style={themeVars(theme)} id={`form-${form.slug}`} data-form-done className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-paper p-8 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 [animation:pop_.5s_ease-out]">
          <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <p className="mt-4 text-xl font-extrabold text-emerald-800">{form.successTitle || "با موفقیت ثبت شد"}</p>
        <p className="mx-auto mt-2 max-w-md leading-7 text-emerald-900/80">{message}</p>
        {done.ref && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-paper px-4 py-2 text-sm">
            کد پیگیری: <b className="font-mono text-base tracking-widest text-navy" dir="ltr">{done.ref}</b>
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {done.receipt && <a href={done.receipt} className="btn-gold px-5 py-2 text-sm">مشاهده و چاپ رسید</a>}
          {done.redirect ? (
            <a href={done.redirect} className="btn-ghost px-5 py-2 text-sm">ادامه (انتقال خودکار…)</a>
          ) : (
            <button type="button" onClick={() => { setValues(defaults ?? {}); setFiles({}); setErrors({}); setDone(null); setStep(0); setDisc(null); setCode(""); setState("idle"); setNonce((n) => n + 1); }} className="text-sm font-semibold text-muted underline-offset-4 hover:text-navy hover:underline">ثبت یک پاسخ دیگر</button>
          )}
        </div>
      </div>
    );
  }

  const full = narrow ? "" : "sm:col-span-2";
  const priceTag = (f: FieldDef, o: string) => (priced && f.prices?.[o] ? f.prices[o] : 0);
  const busy = state === "sending" || state === "paying";
  const actionLabel = !last ? "مرحلهٔ بعد" : willPay ? `پرداخت ${tomanText(t.total)}` : form.submitLabel;

  return (
    <div ref={top} style={themeVars(theme)} data-form-steps={steps.length}>
      {steps.length > 1 && (
        <div className="mb-6" data-progress>
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--fa)]">مرحلهٔ {fa(step + 1)} از {fa(steps.length)}</span>
            <span className="text-muted">{cur.title}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line/70">
            <div className="h-full rounded-full bg-gradient-to-l from-gold to-[var(--fa)] transition-[width] duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          <ol className={`mt-3 hidden gap-2 text-[0.7rem] ${narrow ? "" : "sm:flex"}`}>
            {steps.map((s, i) => (
              <li key={i} className={`flex items-center gap-1.5 ${i <= step ? "font-bold text-navy" : "text-muted"}`}>
                <span className={`flex size-5 items-center justify-center rounded-full text-[0.65rem] ${i < step ? "bg-[var(--fa)] text-white" : i === step ? "bg-gold text-navy" : "bg-line"}`}>{i < step ? "✓" : fa(i + 1)}</span>
                {s.title}
                {i < steps.length - 1 && <span className="mx-1 h-px w-5 bg-line" />}
              </li>
            ))}
          </ol>
        </div>
      )}
      <form key={nonce} id={`form-${form.slug}`} onSubmit={submit} noValidate>
        <input id={`hp-${form.slug}`} name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <div key={step} className={`grid grid-cols-1 gap-x-4 gap-y-5 ${narrow ? "" : "sm:grid-cols-2"} ${steps.length > 1 ? (dir === "next" ? "step-next" : "step-back") : ""}`}>
          {steps.length > 1 && cur.help && <p className={`-mt-2 text-sm leading-7 text-muted ${full}`}>{cur.help}</p>}
          {cur.fields.some((f) => f.required) && step === 0 && <p className={`-mb-1 text-xs text-muted ${full}`}>پر کردن موارد ستاره‌دار (<span className="text-gc">*</span>) الزامی است.</p>}
          {cur.fields.map((f) => {
            if (!isVisible(f, values)) return null;
            const err = errors[f.id];
            const id = `f-${f.id}`;
            const v = values[f.id];
            const span = f.half ? "" : full;
            if (f.type === "section") {
              return (
                <div key={f.id} className={`mt-2 border-b border-line pb-2 ${full}`}>
                  <p className="flex items-center gap-2 text-lg font-extrabold text-navy"><span className="h-5 w-1 rounded-full bg-gold" />{f.label}</p>
                  {f.help && <p className="mt-1 text-sm leading-7 whitespace-pre-line text-muted">{f.help}</p>}
                </div>
              );
            }
            if (f.type === "image") {
              return f.src ? (
                <figure key={f.id} className={span || full}>
                  <img src={f.src} alt={f.label} className="w-full rounded-2xl object-cover shadow-sm" loading="lazy" />
                  {f.help && <figcaption className="mt-1.5 text-center text-xs text-muted">{f.help}</figcaption>}
                </figure>
              ) : null;
            }
            if (f.type === "consent") {
              return (
                <div key={f.id} className={full}>
                  <label id={id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-[0.95rem] transition-colors ${v === "بله" ? "border-[var(--fa)] bg-[var(--fa-soft)]" : err ? "border-gc/50 bg-gc-soft/30" : "border-line bg-ivory/50"}`}>
                    <input type="checkbox" className="sr-only" checked={v === "بله"} onChange={(e) => set(f.id, e.target.checked ? "بله" : "")} />
                    <span className="mt-0.5"><Check on={v === "بله"} /></span>
                    <span className="leading-7">
                      <b className="text-navy">{f.label}</b>{f.required && <span className="mr-1 text-gc">*</span>}
                      {f.help && <span className="mt-1 block text-sm whitespace-pre-line text-muted">{f.help}</span>}
                      {f.href && <a href={f.href} target="_blank" rel="noopener" className="mt-1 inline-block text-sm font-semibold text-[var(--fa)] underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>مطالعهٔ متن کامل</a>}
                    </span>
                  </label>
                  {err && <p className="mt-1.5 text-sm text-gc">{err}</p>}
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
                    {optionsOf(f).filter(Boolean).map((o) => <option key={o} value={o}>{o}{priceTag(f, o) ? ` (+${tomanText(priceTag(f, o))})` : ""}</option>)}
                  </select>
                );
                break;
              case "radio":
                control = (
                  <div id={id} role="radiogroup" className={`grid gap-2.5 ${narrow ? "" : "sm:grid-cols-2"}`}>
                    {optionsOf(f).filter(Boolean).map((o) => (
                      <label key={o} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all ${v === o ? "border-[var(--fa)] bg-[var(--fa-soft)] shadow-sm" : "border-line bg-paper hover:border-[var(--fa)]/40"}`}>
                        <input type="radio" name={id} className="sr-only" checked={v === o} onChange={() => set(f.id, o)} />
                        <Check on={v === o} />
                        <span className="flex-1 font-semibold">{o}</span>
                        {priceTag(f, o) > 0 && <span className="chip bg-gold/20 text-gold-ink">{tomanText(priceTag(f, o))}</span>}
                      </label>
                    ))}
                  </div>
                );
                break;
              case "checkbox":
                if (f.options?.filter(Boolean).length) {
                  const arr = Array.isArray(v) ? v : [];
                  control = (
                    <div id={id} className={`grid gap-2.5 ${narrow ? "" : "sm:grid-cols-2"}`}>
                      {f.options.filter(Boolean).map((o) => (
                        <label key={o} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all ${arr.includes(o) ? "border-[var(--fa)] bg-[var(--fa-soft)]" : "border-line bg-paper hover:border-[var(--fa)]/40"}`}>
                          <input type="checkbox" className="sr-only" checked={arr.includes(o)} onChange={(e) => set(f.id, e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />
                          <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 ${arr.includes(o) ? "border-[var(--fa)] bg-[var(--fa)] text-white" : "border-line"}`}>{arr.includes(o) && <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}</span>
                          <span className="flex-1 font-semibold">{o}</span>
                          {priceTag(f, o) > 0 && <span className="chip bg-gold/20 text-gold-ink">+{tomanText(priceTag(f, o))}</span>}
                        </label>
                      ))}
                    </div>
                  );
                } else {
                  return (
                    <div key={f.id} className={span}>
                      <label id={id} className="flex cursor-pointer items-start gap-2.5 text-[0.95rem]">
                        <input type="checkbox" className="mt-1.5 size-4 accent-[var(--fa)]" checked={v === "بله"} onChange={(e) => set(f.id, e.target.checked ? "بله" : "")} />
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
                const img = file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
                control = (
                  <label htmlFor={id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-4 transition-colors ${file ? "border-emerald-300 bg-emerald-50/50" : err ? "border-gc/50 bg-gc-soft/30" : "border-line bg-ivory/60 hover:border-[var(--fa)]/40"}`}>
                    {img ? <img src={img} alt="" className="size-12 shrink-0 rounded-xl object-cover" /> : (
                      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${file ? "bg-emerald-500 text-white" : "bg-[var(--fa-soft)] text-[var(--fa)]"}`}>
                        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{file ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />}</svg>
                      </span>
                    )}
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-semibold text-navy">{file ? file.name : f.placeholder || "انتخاب فایل یا عکس"}</span>
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

          {last && paid && (
            <div className={`rounded-2xl border border-line bg-ivory/60 p-4 sm:p-5 ${full}`} data-price-summary>
              <p className="mb-3 flex items-center gap-2 font-extrabold text-navy"><span className="h-4 w-1 rounded-full bg-gold" />خلاصهٔ هزینه</p>
              <ul className="space-y-1.5 text-sm">
                {t.lines.length === 0 && <li className="text-muted">با انتخاب گزینه‌ها، مبلغ اینجا محاسبه می‌شود.</li>}
                {t.lines.map((l, i) => <li key={i} className="flex justify-between gap-4"><span className="text-muted">{l.label}</span><span className="font-semibold">{tomanText(l.rials)}</span></li>)}
                {t.discount > 0 && <li className="flex justify-between gap-4 text-emerald-700"><span>تخفیف ({disc?.code})</span><span className="font-semibold">− {tomanText(t.discount)}</span></li>}
              </ul>
              {form.hasDiscounts && (
                <div className="mt-4 flex gap-2">
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="کد تخفیف" dir="ltr" aria-label="کد تخفیف" className="input min-w-0 flex-1 py-2 text-left uppercase" />
                  <button type="button" onClick={applyCode} className="btn-ghost shrink-0 px-4 py-2 text-sm" data-apply-code>اعمال</button>
                </div>
              )}
              {discMsg && <p className={`mt-2 text-sm ${discMsg.ok ? "text-emerald-700" : "text-gc"}`}>{discMsg.t}</p>}
              <p className="mt-3 flex items-center justify-between border-t border-line pt-3 text-lg font-black text-navy"><span>جمع قابل پرداخت</span><span data-total>{t.total > 0 ? tomanText(t.total) : "رایگان"}</span></p>
            </div>
          )}
          {state === "error" && message && (
            <p className={`rounded-xl bg-gc-soft px-4 py-3 text-sm text-gc ${full}`}>
              {message}
              {failReceipt && <a href={failReceipt} className="mr-2 font-bold underline">صفحهٔ رسید و پرداخت دوباره</a>}
            </p>
          )}
        </div>

        {/* Sticky action bar with the live total */}
        <div className="sticky bottom-3 z-20 mt-6 flex items-center gap-3 rounded-2xl border border-line bg-paper/95 p-2.5 shadow-[0_12px_40px_-12px_rgb(10_26_63/0.35)] backdrop-blur" data-action-bar>
          {paid && (
            <div className={`min-w-0 flex-1 px-2 leading-tight ${last && willPay ? "hidden sm:block" : ""}`}>
              <span className="block whitespace-nowrap text-[0.7rem] text-muted">{t.discount > 0 ? <><span className="sm:hidden">با تخفیف</span><span className="hidden sm:inline">جمع پس از تخفیف</span></> : "جمع کل"}</span>
              <b className="block whitespace-nowrap text-[0.95rem] text-navy sm:text-lg" data-bar-total>{t.total > 0 ? tomanText(t.total) : t.lines.length ? "رایگان" : "—"}</b>
            </div>
          )}
          {!paid && steps.length > 1 && <span className="flex-1 px-2 text-xs text-muted">مرحلهٔ {fa(step + 1)} از {fa(steps.length)}</span>}
          {step > 0 && <button type="button" onClick={() => go(step - 1)} className="btn-ghost shrink-0 px-3 py-3 text-sm sm:px-4">قبلی</button>}
          <button type="submit" disabled={busy || (preview && last)} className={`btn-gold shrink-0 whitespace-nowrap py-3 text-[0.95rem] sm:text-base ${last && willPay ? "flex-1 sm:flex-none " : ""}${paid || steps.length > 1 ? "px-4 sm:px-6" : "w-full sm:w-auto sm:min-w-56"}`} data-submit>
            {busy ? (
              <span className="inline-flex items-center gap-2"><span className="size-4 animate-spin rounded-full border-2 border-navy/30 border-t-navy" />{state === "paying" ? "انتقال به درگاه…" : "در حال ارسال…"}</span>
            ) : actionLabel}
          </button>
        </div>
        {preview && <p className="mt-2 text-xs text-muted">پیش‌نمایش — ارسال غیرفعال است.</p>}
      </form>
    </div>
  );
}

