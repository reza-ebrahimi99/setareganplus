"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { FIELD_TYPES, FIELD_GROUPS, OPTION_TYPES, CONDITION_TYPES, PRESET_OPTIONS, PRICE_TYPES, optionsOf, fieldTypeLabel, splitSteps, type FieldDef, type FieldType } from "@/lib/forms/types";
import { THEMES } from "@/lib/forms/themes";
import { totals, tomanText, type PayMode } from "@/lib/forms/pricing";
import type { PublicForm, FormState } from "@/lib/forms/public-types";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { FormHero } from "@/components/forms/FormHero";
import { JalaliDateTime } from "./JalaliDateTime";

export type BuilderDiscount = { id?: string; code: string; percent: number | null; amountToman: number | null; maxUses: number | null; active: boolean; expiresAt: string | null; used?: number };
export type BuilderPayload = {
  title: string;
  slug: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  submitLabel: string;
  successMessage: string;
  fields: FieldDef[];
  coverImage: string;
  logo: string;
  theme: string;
  listed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  capacity: number | null;
  uniqueBy: "NONE" | "MOBILE" | "NATIONAL_CODE";
  successTitle: string;
  successRedirect: string;
  smsConfirm: boolean;
  adminNotify: boolean;
  payMode: PayMode;
  basePriceToman: number;
  discounts: BuilderDiscount[];
};
type Upload = (fd: FormData) => Promise<{ url?: string; error?: string }>;

const ICON: Record<FieldType, string> = {
  text: "Aa", phone: "☎", number: "۱۲", select: "▾", radio: "◉", checkbox: "☑", date: "۱۴۰۵", textarea: "¶", file: "⇪",
  nationalCode: "🆔", email: "@", grade: "🎓", major: "◆", section: "§", consent: "✓", image: "🖼", page: "⇥",
};

const QUICK: Omit<FieldDef, "id">[] = [
  { type: "text", label: "نام و نام خانوادگی دانش‌آموز", required: true },
  { type: "phone", label: "شماره موبایل", required: true, half: true },
  { type: "nationalCode", label: "کد ملی دانش‌آموز", half: true },
  { type: "grade", label: "پایهٔ تحصیلی", required: true, half: true },
  { type: "major", label: "رشته", half: true },
];

const TABS = [
  { k: "fields", l: "فیلدها" },
  { k: "look", l: "ظاهر" },
  { k: "schedule", l: "زمان و ظرفیت" },
  { k: "pay", l: "پرداخت و تخفیف" },
  { k: "after", l: "پس از ثبت و پیامک" },
] as const;
type Tab = (typeof TABS)[number]["k"];

const uid = () => "f_" + Math.random().toString(36).slice(2, 8);
const faN = (n: number) => n.toLocaleString("fa-IR");
const toNum = (v: string) => {
  const t = v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
  return t ? Number(t) : null;
};

function ImagePick({ label, value, onChange, upload, hint, name, aspect = "aspect-[16/7]" }: { label: string; value: string; onChange: (v: string) => void; upload: Upload; hint?: string; name: string; aspect?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  async function pick(f?: File | null) {
    if (!f) return;
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.set("file", f);
    const r = await upload(fd).catch(() => ({ error: "بارگذاری ناموفق بود." }) as { url?: string; error?: string });
    setBusy(false);
    if (r.url) onChange(r.url);
    else setErr(r.error ?? "بارگذاری ناموفق بود.");
  }
  return (
    <div>
      <span className="label">{label}</span>
      <div
        className={`relative flex ${aspect} items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-ivory/60 text-sm text-muted`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
      >
        {value ? <img src={value} alt="" className="absolute inset-0 size-full object-cover" /> : <span>{busy ? "در حال بارگذاری…" : "تصویر را اینجا رها کنید یا انتخاب کنید"}</span>}
        <div className="absolute bottom-2 left-2 flex gap-1.5">
          <button type="button" onClick={() => ref.current?.click()} className="rounded-full bg-paper/95 px-3 py-1 text-xs font-bold text-navy shadow">{busy ? "…" : value ? "تغییر" : "انتخاب"}</button>
          {value && <button type="button" onClick={() => onChange("")} className="rounded-full bg-paper/95 px-3 py-1 text-xs font-bold text-gc shadow">حذف</button>}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" data-upload={name} onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {err && <p className="mt-1 text-xs font-semibold text-gc">{err}</p>}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 hover:bg-ivory/50">
      <span className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-navy" : "bg-line"}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${checked ? "right-0.5" : "right-[1.1rem]"}`} />
      </span>
      <span><span className="block text-sm font-bold text-navy">{label}</span>{hint && <span className="block text-xs leading-6 text-muted">{hint}</span>}</span>
    </label>
  );
}

export function FormBuilder({
  id, initial, isSystem, submissions, save, remove, upload, canPayments,
}: {
  id: string;
  initial: BuilderPayload;
  isSystem: boolean;
  submissions: number;
  save: (p: BuilderPayload) => Promise<{ ok: boolean; error?: string; discounts?: BuilderDiscount[] }>;
  remove?: () => Promise<void>;
  upload: Upload;
  canPayments: boolean;
}) {
  const [form, setForm] = useState<BuilderPayload>(initial);
  const [sel, setSel] = useState<string | null>(initial.fields.find((f) => f.type !== "page")?.id ?? null);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>("fields");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const publicUrl = isSystem && form.slug === "pre-registration" ? "/register" : `/f/${form.slug}`;
  const update = (patch: Partial<BuilderPayload>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
    setMsg(null);
  };
  const setField = (fid: string, patch: Partial<FieldDef>) => update({ fields: form.fields.map((f) => (f.id === fid ? { ...f, ...patch } : f)) });

  function insert(f: FieldDef) {
    const i = sel ? form.fields.findIndex((x) => x.id === sel) : -1;
    const arr = [...form.fields];
    arr.splice(i >= 0 ? i + 1 : arr.length, 0, f);
    update({ fields: arr });
    setSel(f.id);
  }
  function add(type: FieldType) {
    insert({
      id: uid(), type,
      label: type === "page" ? `مرحلهٔ ${faN(splitSteps(form.fields).length + 1)}` : type === "consent" ? "قوانین و شرایط را می‌پذیرم" : fieldTypeLabel(type),
      required: type === "consent",
      options: OPTION_TYPES.includes(type) ? ["گزینه ۱", "گزینه ۲"] : undefined,
    });
  }
  function addQuick() {
    const have = new Set(form.fields.map((f) => f.type));
    const extra = QUICK.filter((q) => q.type === "text" || !have.has(q.type)).map((q) => ({ ...q, id: uid() }));
    update({ fields: [...form.fields, ...extra] });
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= form.fields.length || from === to) return;
    const arr = [...form.fields];
    const [x] = arr.splice(from, 1);
    arr.splice(to, 0, x);
    update({ fields: arr });
  }
  function duplicate(i: number) {
    const f = { ...form.fields[i], id: uid(), label: form.fields[i].label + " (کپی)" };
    const arr = [...form.fields];
    arr.splice(i + 1, 0, f);
    update({ fields: arr });
    setSel(f.id);
  }
  function del(fid: string) {
    update({ fields: form.fields.filter((f) => f.id !== fid).map((f) => (f.showIf?.field === fid ? { ...f, showIf: null } : f)) });
    if (sel === fid) setSel(null);
  }
  function setDiscount(i: number, patch: Partial<BuilderDiscount>) {
    update({ discounts: form.discounts.map((d, j) => (j === i ? { ...d, ...patch } : d)) });
  }
  function onSave() {
    start(async () => {
      const r = await save(form);
      setMsg({ ok: r.ok, text: r.ok ? "ذخیره شد." : r.error ?? "خطا" });
      if (r.ok) {
        setDirty(false);
        if (r.discounts) setForm((f) => ({ ...f, discounts: r.discounts! }));
      }
    });
  }

  // What the public page would show
  const preview: PublicForm = useMemo(() => {
    const now = Date.now();
    const state: FormState = form.status === "CLOSED" || (form.closesAt && new Date(form.closesAt).getTime() <= now) ? "closed" : form.opensAt && new Date(form.opensAt).getTime() > now ? "soon" : "open";
    return {
      slug: form.slug, title: form.title, description: form.description, fields: form.fields, submitLabel: form.submitLabel, successMessage: form.successMessage,
      successTitle: form.successTitle, coverImage: form.coverImage || null, logo: form.logo || null, theme: form.theme, payMode: form.payMode,
      basePriceRials: form.basePriceToman * 10, hasDiscounts: form.discounts.some((d) => d.active), state, opensAt: form.opensAt, closesAt: form.closesAt,
      capacity: form.capacity, remaining: form.capacity,
    };
  }, [form]);
  const steps = splitSteps(form.fields);
  const sample = totals({ payMode: form.payMode, basePriceRials: form.basePriceToman * 10 }, form.fields, {}, null);
  let stepNo = 1;

  return (
    <div data-builder>
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/forms" className="text-xs font-semibold text-muted hover:text-ink">→ همه فرم‌ها</Link>
          <input value={form.title} onChange={(e) => update({ title: e.target.value })} className="mt-1 block w-full max-w-xl rounded-lg border border-transparent bg-transparent px-1 text-2xl font-extrabold text-navy hover:border-line focus:border-edu focus:outline-none" aria-label="عنوان فرم" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={form.status} onChange={(e) => update({ status: e.target.value as BuilderPayload["status"] })} className="input w-auto py-2 text-sm" aria-label="وضعیت" data-status>
            <option value="PUBLISHED">منتشرشده</option>
            <option value="DRAFT">پیش‌نویس</option>
            <option value="CLOSED">بسته</option>
          </select>
          <Link href={`/admin/submissions?form=${id}`} className="btn-ghost px-4 py-2 text-sm">پاسخ‌ها ({faN(submissions)})</Link>
          <button onClick={onSave} disabled={pending} className="btn-gold px-6 py-2 text-sm" data-save>{pending ? "در حال ذخیره…" : dirty ? "ذخیره تغییرات •" : "ذخیره"}</button>
        </div>
      </div>
      {msg && <p data-save-msg={msg.ok ? "ok" : "err"} className={`mb-4 rounded-xl px-4 py-2.5 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-gc-soft text-gc"}`}>{msg.text}</p>}

      <div className="grid items-start gap-6 xl:grid-cols-[1.05fr_1fr]">
        {/* Editor */}
        <div className="rounded-2xl border border-line bg-paper">
          <div className="no-scrollbar flex overflow-x-auto border-b border-line px-2 text-sm font-semibold">
            {TABS.map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)} data-tab={t.k} className={`shrink-0 border-b-2 px-3.5 py-3 ${tab === t.k ? "border-navy text-navy" : "border-transparent text-muted hover:text-ink"}`}>
                {t.k === "fields" ? `${t.l} (${faN(form.fields.filter((f) => f.type !== "page").length)})` : t.l}
              </button>
            ))}
          </div>

          {tab === "look" && (
            <div className="space-y-5 p-5">
              <ImagePick label="تصویر کاور" name="cover" value={form.coverImage} onChange={(v) => update({ coverImage: v })} upload={upload} hint="پیشنهاد: افقی، حداقل ۱۶۰۰ پیکسل عرض. روی آن لایهٔ رنگ تم قرار می‌گیرد." />
              <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
                <ImagePick label="لوگو (اختیاری)" name="logo" value={form.logo} onChange={(v) => update({ logo: v })} upload={upload} aspect="aspect-square" />
                <div>
                  <span className="label">تم رنگی</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {THEMES.map((t) => (
                      <button key={t.key} type="button" onClick={() => update({ theme: t.key })} data-theme={t.key} className={`overflow-hidden rounded-xl border-2 text-right text-xs font-bold ${form.theme === t.key ? "border-gold shadow" : "border-line"}`}>
                        <span className="block h-10" style={{ background: `linear-gradient(135deg, ${t.h1}, ${t.h2})` }} />
                        <span className="block px-2 py-1.5">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="block"><span className="label">توضیح فرم</span>
                <textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={6} className="input leading-7" data-desc />
                <span className="mt-1 block text-xs text-muted">پاراگراف اول خلاصهٔ بالای صفحه است. قالب‌بندی: **پررنگ**، - فهرست، ## تیتر، [پیوند](/contact)</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="label">نامک (آدرس فرم)</span><input value={form.slug} disabled={isSystem} onChange={(e) => update({ slug: e.target.value })} dir="ltr" className="input disabled:opacity-60" /></label>
                <label className="block"><span className="label">متن دکمهٔ ارسال (فرم رایگان)</span><input value={form.submitLabel} onChange={(e) => update({ submitLabel: e.target.value })} className="input" /></label>
              </div>
              <Toggle checked={form.listed} onChange={(v) => update({ listed: v })} label="نمایش در صفحهٔ «ثبت‌نام‌ها» و صفحهٔ اصلی" hint="خاموش = فقط با لینک مستقیم در دسترس است." />
              <div className="rounded-xl bg-ivory p-4 text-sm leading-7">
                <p className="font-bold text-navy">انتشار و جای‌گذاری</p>
                <p className="mt-1">نشانی عمومی: <a href={publicUrl} target="_blank" className="font-semibold text-edu" dir="ltr">{publicUrl}</a></p>
                <p className="text-muted">برای نمایش در صفحهٔ یک مرکز، از بخش «مراکز» آن را به‌عنوان فرم صفحه انتخاب کنید.</p>
              </div>
              {remove && <button onClick={() => confirm("این فرم و همه پاسخ‌هایش حذف شود؟") && start(() => remove())} className="text-sm font-semibold text-gc hover:underline">حذف فرم</button>}
            </div>
          )}

          {tab === "schedule" && (
            <div className="space-y-5 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <JalaliDateTime name="opens" label="شروع ثبت‌نام" value={form.opensAt} onChange={(v) => update({ opensAt: v })} hint="قبل از آن، فرم با برچسب «به‌زودی» نمایش داده می‌شود." />
                <JalaliDateTime name="closes" label="پایان ثبت‌نام" value={form.closesAt} onChange={(v) => update({ closesAt: v })} hint="بعد از آن، فرم بسته می‌شود." />
              </div>
              <label className="block max-w-xs"><span className="label">ظرفیت</span>
                <input value={form.capacity ?? ""} onChange={(e) => update({ capacity: toNum(e.target.value) })} inputMode="numeric" dir="ltr" placeholder="نامحدود" className="input" data-capacity-input />
                <span className="mt-1 block text-xs text-muted">ثبت‌نام‌های رایگان، پرداخت‌شده و پرداخت‌های در جریانِ ۳۰ دقیقهٔ اخیر شمرده می‌شوند. با تکمیل، فرم «ظرفیت تکمیل» می‌شود.</span>
              </label>
              <div>
                <span className="label">جلوگیری از ثبت‌نام تکراری</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([["NONE", "آزاد"], ["MOBILE", "یک‌بار با هر موبایل"], ["NATIONAL_CODE", "یک‌بار با هر کد ملی"]] as const).map(([k, l]) => (
                    <button key={k} type="button" onClick={() => update({ uniqueBy: k })} className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold ${form.uniqueBy === k ? "border-navy bg-navy text-white" : "border-line"}`}>{l}</button>
                  ))}
                </div>
                {form.uniqueBy !== "NONE" && !form.fields.some((f) => f.type === (form.uniqueBy === "MOBILE" ? "phone" : "nationalCode")) && (
                  <p className="mt-2 text-xs font-semibold text-gc">این فرم فیلد {form.uniqueBy === "MOBILE" ? "شماره موبایل" : "کد ملی"} ندارد.</p>
                )}
              </div>
            </div>
          )}

          {tab === "pay" && (
            <div className="space-y-5 p-5">
              <div className="grid gap-2 sm:grid-cols-3">
                {([["FREE", "رایگان", "بدون پرداخت"], ["FIXED", "مبلغ ثابت", "یک هزینهٔ ثبت‌نام"], ["OPTIONS", "قیمت با گزینه", "هزینهٔ پایه + قیمت گزینه‌ها"]] as const).map(([k, l, h]) => (
                  <button key={k} type="button" onClick={() => update({ payMode: k })} data-paymode={k} className={`rounded-xl border-2 p-3 text-right ${form.payMode === k ? "border-gold bg-gold/10" : "border-line"}`}>
                    <span className="block font-extrabold text-navy">{l}</span><span className="block text-xs text-muted">{h}</span>
                  </button>
                ))}
              </div>
              {form.payMode !== "FREE" && (
                <>
                  <label className="block max-w-xs"><span className="label">{form.payMode === "FIXED" ? "هزینهٔ ثبت‌نام (تومان)" : "هزینهٔ پایه (تومان، اختیاری)"}</span>
                    <input value={form.basePriceToman || ""} onChange={(e) => update({ basePriceToman: toNum(e.target.value) ?? 0 })} inputMode="numeric" dir="ltr" className="input" data-base-price />
                    <span className="mt-1 block text-xs text-muted">{form.basePriceToman ? tomanText(form.basePriceToman * 10) : "—"}</span>
                  </label>
                  {form.payMode === "OPTIONS" && (
                    <p className="rounded-xl bg-ivory p-3 text-xs leading-6 text-muted">قیمت هر گزینه را در تب «فیلدها»، داخل فیلدهای گزینه‌ای (لیست، تک‌انتخابی، چندانتخابی، پایه، رشته) وارد کنید. جمع با انتخاب کاربر زنده محاسبه می‌شود.
                      {form.fields.filter((f) => PRICE_TYPES.includes(f.type) && Object.values(f.prices ?? {}).some((p) => p > 0)).length === 0 && <b className="block text-gc">هنوز هیچ گزینه‌ای قیمت ندارد.</b>}
                    </p>
                  )}
                  <p className="text-sm">حداقل مبلغ پرداخت: <b>{sample.total ? tomanText(sample.total) : "۰"}</b> <span className="text-xs text-muted">(بدون انتخاب گزینه)</span></p>
                  <div className="rounded-xl bg-navy/5 p-3 text-xs leading-6 text-ink/80">پرداخت با درگاه زیبال (همان تنظیمات فروشگاه). ثبت‌نام تا تأیید پرداخت «در انتظار پرداخت» است و فقط پرداخت‌های تأییدشده شمرده می‌شوند.</div>
                </>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="label mb-0">کدهای تخفیف این فرم</span>
                  <button type="button" onClick={() => update({ discounts: [...form.discounts, { code: "", percent: 10, amountToman: null, maxUses: null, active: true, expiresAt: null }] })} className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold-ink" data-add-discount>+ کد تخفیف</button>
                </div>
                {form.discounts.length === 0 && <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-muted">کد تخفیفی تعریف نشده است.</p>}
                <div className="space-y-2">
                  {form.discounts.map((d, i) => (
                    <div key={d.id ?? `n${i}`} className="grid items-end gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1.2fr_0.7fr_1fr_0.7fr_auto]" data-discount-row={i}>
                      <label className="block"><span className="label text-xs">کد</span><input value={d.code} onChange={(e) => setDiscount(i, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} dir="ltr" className="input py-1.5 text-sm" placeholder="TAKHFIF20" /></label>
                      <label className="block"><span className="label text-xs">درصد</span><input value={d.percent ?? ""} onChange={(e) => setDiscount(i, { percent: toNum(e.target.value) })} dir="ltr" inputMode="numeric" className="input py-1.5 text-sm" /></label>
                      <label className="block"><span className="label text-xs">یا مبلغ (تومان)</span><input value={d.amountToman ?? ""} onChange={(e) => setDiscount(i, { amountToman: toNum(e.target.value) })} dir="ltr" inputMode="numeric" className="input py-1.5 text-sm" /></label>
                      <label className="block"><span className="label text-xs">سقف استفاده</span><input value={d.maxUses ?? ""} onChange={(e) => setDiscount(i, { maxUses: toNum(e.target.value) })} dir="ltr" inputMode="numeric" placeholder="∞" className="input py-1.5 text-sm" /></label>
                      <div className="flex items-center gap-2 pb-1.5 text-xs">
                        <label className="flex items-center gap-1"><input type="checkbox" checked={d.active} onChange={(e) => setDiscount(i, { active: e.target.checked })} className="accent-navy" />فعال</label>
                        <button type="button" onClick={() => update({ discounts: form.discounts.filter((_, j) => j !== i) })} className="font-bold text-gc">حذف</button>
                      </div>
                      <div className="text-[0.7rem] text-muted sm:col-span-5">استفاده‌شده: {faN(d.used ?? 0)}{d.maxUses ? ` از ${faN(d.maxUses)}` : ""}</div>
                      <div className="sm:col-span-5"><JalaliDateTime name={`dexp${i}`} label="انقضا" value={d.expiresAt} onChange={(v) => setDiscount(i, { expiresAt: v })} /></div>
                    </div>
                  ))}
                </div>
              </div>
              {!canPayments && <p className="text-xs text-muted">مشاهدهٔ مبالغ و گزارش درآمد به دسترسی «پرداخت‌های فرم‌ها» نیاز دارد.</p>}
            </div>
          )}

          {tab === "after" && (
            <div className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="label">عنوان پیام موفقیت</span><input value={form.successTitle} onChange={(e) => update({ successTitle: e.target.value })} placeholder="ثبت‌نام شما انجام شد" className="input" /></label>
                <label className="block"><span className="label">انتقال خودکار پس از ثبت (اختیاری)</span><input value={form.successRedirect} onChange={(e) => update({ successRedirect: e.target.value })} dir="ltr" placeholder="/education یا https://…" className="input" /></label>
              </div>
              <label className="block"><span className="label">متن پیام موفقیت</span><textarea value={form.successMessage} onChange={(e) => update({ successMessage: e.target.value })} rows={3} className="input leading-7" /></label>
              <p className="rounded-xl bg-ivory p-3 text-xs leading-6 text-muted">پس از ثبت، رسید با کد پیگیری و QR در نشانی اختصاصی صادر می‌شود؛ در فرم‌های پولی تا تأیید پرداخت همان صفحه دکمهٔ «پرداخت دوباره» دارد.</p>
              <Toggle checked={form.smsConfirm} onChange={(v) => update({ smsConfirm: v })} label="پیامک تأیید به ثبت‌نام‌کننده" hint="به فیلد موبایل فرم، با کد پیگیری. قالب در صفحهٔ «فرم‌ساز» → پیامک فرم‌ها تنظیم می‌شود." />
              <Toggle checked={form.adminNotify} onChange={(v) => update({ adminNotify: v })} label="پیامک اطلاع به مدیر" hint="برای هر ثبت‌نام تأییدشده." />
            </div>
          )}

          {tab === "fields" && (
            <div className="p-4 sm:p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted">افزودن (زیر فیلد انتخاب‌شده)</p>
                <button onClick={addQuick} className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold-ink hover:bg-gold/25">⚡ افزودن سریع: نام، موبایل، کد ملی، پایه، رشته</button>
              </div>
              <div className="mb-5 space-y-2 rounded-xl bg-ivory/70 p-3">
                {Object.entries(FIELD_GROUPS).map(([g, gl]) => (
                  <div key={g} className="flex flex-wrap items-center gap-1.5">
                    <span className="w-20 shrink-0 text-[0.7rem] font-semibold text-muted">{gl}</span>
                    {FIELD_TYPES.filter((t) => t.group === g).map((t) => (
                      <button key={t.type} onClick={() => add(t.type)} data-add={t.type} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold hover:border-navy/40 hover:shadow-sm">
                        <span className="text-[0.7rem] text-edu">{ICON[t.type]}</span>{t.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {steps.length > 1 && <p className="mb-2 text-xs font-bold text-navy">مرحلهٔ ۱ · {steps[0].title}</p>}
              <ol className="space-y-2">
                {form.fields.map((f, i) => {
                  const open = sel === f.id;
                  const others = form.fields.filter((o) => o.id !== f.id && CONDITION_TYPES.includes(o.type));
                  const dropLine = over === i && drag !== null && drag !== i;
                  const dnd = {
                    draggable: true,
                    onDragStart: (e: React.DragEvent) => { setDrag(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", f.id); },
                    onDragOver: (e: React.DragEvent) => { e.preventDefault(); if (over !== i) setOver(i); },
                    onDrop: (e: React.DragEvent) => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null); },
                    onDragEnd: () => { setDrag(null); setOver(null); },
                  };
                  if (f.type === "page") {
                    stepNo++;
                    return (
                      <li key={f.id} {...dnd} data-field={f.id} className={`relative ${drag === i ? "opacity-40" : ""}`}>
                        {dropLine && <span className={`absolute inset-x-0 h-0.5 rounded bg-gold ${drag! < i ? "-bottom-1.5" : "-top-1.5"}`} />}
                        <div className={`flex items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2 ${open ? "border-navy bg-navy/5" : "border-navy/25"}`}>
                          <span className="cursor-grab text-muted select-none">⋮⋮</span>
                          <span className="rounded-full bg-navy px-2 py-0.5 text-[0.7rem] font-bold text-white">مرحلهٔ {faN(stepNo)}</span>
                          <input value={f.label} onChange={(e) => setField(f.id, { label: e.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-bold text-navy focus:outline-none" aria-label="عنوان مرحله" />
                          <button onClick={() => move(i, i - 1)} disabled={i === 0} className="px-1 text-xs disabled:opacity-25" aria-label="بالا">▲</button>
                          <button onClick={() => move(i, i + 1)} disabled={i === form.fields.length - 1} className="px-1 text-xs disabled:opacity-25" aria-label="پایین">▼</button>
                          <button onClick={() => del(f.id)} className="px-1 text-xs font-bold text-gc" aria-label="حذف مرحله">✕</button>
                        </div>
                      </li>
                    );
                  }
                  const priced = form.payMode === "OPTIONS" && PRICE_TYPES.includes(f.type);
                  return (
                    <li key={f.id} {...dnd} data-field={f.id} className={`relative rounded-xl border transition-all ${open ? "border-edu/50 bg-edu-soft/40 shadow-sm" : "border-line bg-paper"} ${drag === i ? "scale-[0.98] opacity-40" : ""}`}>
                      {dropLine && <span className={`absolute inset-x-0 h-0.5 rounded bg-gold ${drag! < i ? "-bottom-1.5" : "-top-1.5"}`} />}
                      <div className="flex items-center gap-2 p-2.5">
                        <span className="cursor-grab px-1 text-muted select-none active:cursor-grabbing" title="بکشید و جابه‌جا کنید">⋮⋮</span>
                        <button onClick={() => setSel(open ? null : f.id)} className="flex min-w-0 flex-1 items-center gap-2 text-right">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ivory text-[0.7rem] font-bold text-edu">{ICON[f.type]}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-navy">{f.label}{f.required && <span className="text-gc"> *</span>}</span>
                            <span className="block text-[0.7rem] text-muted">{fieldTypeLabel(f.type)}{f.showIf?.field ? " · شرطی" : ""}{f.half ? " · نیم‌عرض" : ""}{priced && Object.values(f.prices ?? {}).some((p) => p > 0) ? " · قیمت‌دار" : ""}</span>
                          </span>
                        </button>
                        <span className="flex shrink-0 text-xs">
                          <button onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded px-1.5 py-1 hover:bg-ivory disabled:opacity-25" aria-label="بالا">▲</button>
                          <button onClick={() => move(i, i + 1)} disabled={i === form.fields.length - 1} className="rounded px-1.5 py-1 hover:bg-ivory disabled:opacity-25" aria-label="پایین">▼</button>
                        </span>
                      </div>
                      {open && (
                        <div className="space-y-3 border-t border-line/70 p-3.5">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block sm:col-span-2"><span className="label text-xs">{f.type === "consent" ? "متن تأیید" : f.type === "image" ? "متن جایگزین تصویر" : "عنوان"}</span><input value={f.label} onChange={(e) => setField(f.id, { label: e.target.value })} className="input py-2" /></label>
                            <label className="block"><span className="label text-xs">نوع</span>
                              <select value={f.type} onChange={(e) => { const t = e.target.value as FieldType; setField(f.id, { type: t, options: OPTION_TYPES.includes(t) ? f.options ?? ["گزینه ۱"] : undefined }); }} className="input py-2">
                                {FIELD_TYPES.filter((t) => t.type !== "page").map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                              </select>
                            </label>
                            {!["section", "image", "consent", "radio", "checkbox", "file"].includes(f.type) && <label className="block"><span className="label text-xs">متن داخل کادر</span><input value={f.placeholder ?? ""} onChange={(e) => setField(f.id, { placeholder: e.target.value })} className="input py-2" /></label>}
                            <label className="block sm:col-span-2"><span className="label text-xs">{f.type === "section" ? "متن توضیح" : "توضیح زیر فیلد"}</span>
                              {f.type === "section" ? <textarea value={f.help ?? ""} onChange={(e) => setField(f.id, { help: e.target.value })} rows={3} className="input py-2" /> : <input value={f.help ?? ""} onChange={(e) => setField(f.id, { help: e.target.value })} className="input py-2" />}
                            </label>
                          </div>
                          {f.type === "image" && <ImagePick label="تصویر" name={`img-${f.id}`} value={f.src ?? ""} onChange={(v) => setField(f.id, { src: v || undefined })} upload={upload} />}
                          {f.type === "consent" && <label className="block"><span className="label text-xs">پیوند متن کامل قوانین (اختیاری)</span><input value={f.href ?? ""} onChange={(e) => setField(f.id, { href: e.target.value })} dir="ltr" placeholder="/terms" className="input py-2" /></label>}
                          {PRESET_OPTIONS[f.type] && !priced && <p className="rounded-lg bg-ivory px-3 py-2 text-xs text-muted">گزینه‌ها خودکار است: {PRESET_OPTIONS[f.type]!.join("، ")}</p>}
                          {OPTION_TYPES.includes(f.type) && (
                            <label className="block"><span className="label text-xs">گزینه‌ها (هر خط یکی){f.type === "checkbox" && " — خالی = یک تیک تأیید"}</span>
                              <textarea value={(f.options ?? []).join("\n")} onChange={(e) => setField(f.id, { options: e.target.value.split("\n") })} rows={Math.max(3, (f.options ?? []).length + 1)} className="input py-2 leading-7" />
                            </label>
                          )}
                          {priced && optionsOf(f).filter(Boolean).length > 0 && (
                            <div className="rounded-lg bg-gold/10 p-3" data-prices={f.id}>
                              <p className="mb-2 text-xs font-bold text-gold-ink">قیمت هر گزینه (تومان) — خالی = رایگان</p>
                              <div className="grid gap-1.5 sm:grid-cols-2">
                                {optionsOf(f).filter(Boolean).map((o) => (
                                  <label key={o} className="flex items-center gap-2 text-xs"><span className="w-24 shrink-0 truncate font-semibold">{o}</span>
                                    <input value={f.prices?.[o] ? f.prices[o] / 10 : ""} onChange={(e) => { const v = toNum(e.target.value); const p = { ...(f.prices ?? {}) }; if (v) p[o] = v * 10; else delete p[o]; setField(f.id, { prices: p }); }} inputMode="numeric" dir="ltr" className="input py-1 text-xs" data-price-option={o} />
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                          {!["section", "image"].includes(f.type) && (
                            <div className="flex flex-wrap gap-4 text-sm">
                              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!f.required} onChange={(e) => setField(f.id, { required: e.target.checked })} className="accent-navy" />الزامی</label>
                              {f.type !== "consent" && <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!f.half} onChange={(e) => setField(f.id, { half: e.target.checked })} className="accent-navy" />نیم‌عرض در دسکتاپ</label>}
                            </div>
                          )}
                          <div className="rounded-lg bg-ivory p-3">
                            <p className="mb-2 text-xs font-semibold">نمایش شرطی</p>
                            {others.length === 0 ? (
                              <p className="text-xs text-muted">برای شرط، ابتدا یک فیلد گزینه‌ای اضافه کنید.</p>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2">
                                <select value={f.showIf?.field ?? ""} onChange={(e) => setField(f.id, { showIf: e.target.value ? { field: e.target.value, equals: "" } : null })} className="input py-1.5 text-sm">
                                  <option value="">همیشه نمایش داده شود</option>
                                  {others.map((o) => <option key={o.id} value={o.id}>فقط وقتی «{o.label}»</option>)}
                                </select>
                                {f.showIf?.field && (
                                  <select value={f.showIf.equals} onChange={(e) => setField(f.id, { showIf: { field: f.showIf!.field, equals: e.target.value } })} className="input py-1.5 text-sm">
                                    <option value="">… برابر باشد با</option>
                                    {optionsOf(form.fields.find((o) => o.id === f.showIf!.field) ?? { type: "text" }).filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-4 text-xs font-semibold">
                            <button onClick={() => duplicate(i)} className="text-edu hover:underline">تکثیر</button>
                            <button onClick={() => del(f.id)} className="text-gc hover:underline">حذف</button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
              {form.fields.length === 0 && <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">از دکمه‌های بالا یک فیلد اضافه کنید.</p>}
            </div>
          )}
        </div>

        {/* Live preview */}
        <div className="xl:sticky xl:top-6" data-preview>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
            <span className="flex items-center gap-2">پیش‌نمایش زنده
              <span className="inline-flex rounded-full border border-line bg-paper p-0.5">
                {(["desktop", "mobile"] as const).map((d) => <button key={d} onClick={() => setDevice(d)} data-device={d} className={`rounded-full px-2.5 py-0.5 ${device === d ? "bg-navy text-white" : ""}`}>{d === "desktop" ? "دسکتاپ" : "موبایل"}</button>)}
              </span>
            </span>
            <a href={publicUrl} target="_blank" className="text-edu" dir="ltr">{publicUrl} ↗</a>
          </div>
          <div className="rounded-2xl border border-line bg-ivory p-3">
            <div className={`mx-auto overflow-hidden bg-paper shadow-sm transition-all duration-300 ${device === "mobile" ? "max-w-[390px] rounded-[2rem] border-[6px] border-navy/90" : "rounded-xl"}`}>
              <div className="max-h-[78vh] overflow-y-auto">
                <FormHero form={preview} compact />
                <div className="p-4 sm:p-5">
                  <FormRenderer key={JSON.stringify(form.fields.map((f) => [f.id, f.type, f.options])) + form.payMode} form={{ ...preview, state: "open" }} preview narrow={device === "mobile"} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
