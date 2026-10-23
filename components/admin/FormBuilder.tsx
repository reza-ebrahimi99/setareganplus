"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { FIELD_TYPES, FIELD_GROUPS, OPTION_TYPES, CONDITION_TYPES, PRESET_OPTIONS, optionsOf, fieldTypeLabel, type FieldDef, type FieldType } from "@/lib/forms/types";
import { FormRenderer } from "@/components/forms/FormRenderer";

export type BuilderPayload = {
  title: string;
  slug: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  submitLabel: string;
  successMessage: string;
  fields: FieldDef[];
};

const ICON: Record<FieldType, string> = {
  text: "Aa",
  phone: "☎",
  number: "۱۲",
  select: "▾",
  radio: "◉",
  checkbox: "☑",
  date: "۱۴۰۵",
  textarea: "¶",
  file: "⇪",
  nationalCode: "🆔",
  email: "@",
  grade: "🎓",
  major: "◆",
  section: "§",
};

/** One click adds the usual student-info block. */
const QUICK: Omit<FieldDef, "id">[] = [
  { type: "text", label: "نام و نام خانوادگی دانش‌آموز", required: true },
  { type: "phone", label: "شماره موبایل", required: true, half: true },
  { type: "nationalCode", label: "کد ملی دانش‌آموز", half: true },
  { type: "grade", label: "پایهٔ تحصیلی", required: true, half: true },
  { type: "major", label: "رشته", half: true },
];

const uid = () => "f_" + Math.random().toString(36).slice(2, 8);

export function FormBuilder({
  id,
  initial,
  isSystem,
  submissions,
  save,
  remove,
}: {
  id: string;
  initial: BuilderPayload;
  isSystem: boolean;
  submissions: number;
  save: (p: BuilderPayload) => Promise<{ ok: boolean; error?: string }>;
  remove?: () => Promise<void>;
}) {
  const [form, setForm] = useState<BuilderPayload>(initial);
  const [sel, setSel] = useState<string | null>(initial.fields[0]?.id ?? null);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<"fields" | "settings">("fields");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const publicUrl = isSystem && form.slug === "pre-registration" ? "/register" : `/f/${form.slug}`;
  const update = (patch: Partial<BuilderPayload>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
    setMsg(null);
  };
  const setField = (fid: string, patch: Partial<FieldDef>) =>
    update({ fields: form.fields.map((f) => (f.id === fid ? { ...f, ...patch } : f)) });

  function add(type: FieldType) {
    const f: FieldDef = {
      id: uid(),
      type,
      label: fieldTypeLabel(type),
      required: false,
      options: OPTION_TYPES.includes(type) ? ["گزینه ۱", "گزینه ۲"] : undefined,
    };
    update({ fields: [...form.fields, f] });
    setSel(f.id);
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
  function onSave() {
    start(async () => {
      const r = await save(form);
      setMsg({ ok: r.ok, text: r.ok ? "ذخیره شد." : r.error ?? "خطا" });
      if (r.ok) setDirty(false);
    });
  }

  const previewForm = useMemo(() => ({ ...form, fields: form.fields }), [form]);

  return (
    <div>
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/forms" className="text-xs font-semibold text-muted hover:text-ink">→ همه فرم‌ها</Link>
          <input
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            className="mt-1 block w-full max-w-xl rounded-lg border border-transparent bg-transparent px-1 text-2xl font-extrabold text-navy hover:border-line focus:border-edu focus:outline-none"
            aria-label="عنوان فرم"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={form.status} onChange={(e) => update({ status: e.target.value as BuilderPayload["status"] })} className="input w-auto py-2 text-sm">
            <option value="PUBLISHED">منتشرشده</option>
            <option value="DRAFT">پیش‌نویس</option>
            <option value="CLOSED">بسته</option>
          </select>
          <Link href={`/admin/submissions?form=${id}`} className="btn-ghost px-4 py-2 text-sm">پاسخ‌ها ({submissions.toLocaleString("fa-IR")})</Link>
          <button onClick={onSave} disabled={pending} className="btn-gold px-6 py-2 text-sm">{pending ? "در حال ذخیره…" : dirty ? "ذخیره تغییرات •" : "ذخیره"}</button>
        </div>
      </div>
      {msg && <p className={`mb-4 rounded-xl px-4 py-2.5 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-gc-soft text-gc"}`}>{msg.text}</p>}

      <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_1fr]">
        {/* Editor */}
        <div className="rounded-2xl border border-line bg-paper">
          <div className="flex border-b border-line px-2 text-sm font-semibold">
            {(["fields", "settings"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-4 py-3 ${tab === t ? "border-navy text-navy" : "border-transparent text-muted"}`}>
                {t === "fields" ? `فیلدها (${form.fields.length.toLocaleString("fa-IR")})` : "تنظیمات و انتشار"}
              </button>
            ))}
          </div>

          {tab === "settings" ? (
            <div className="space-y-4 p-5">
              <label className="block"><span className="label">نامک (آدرس فرم)</span>
                <input value={form.slug} disabled={isSystem} onChange={(e) => update({ slug: e.target.value })} dir="ltr" className="input disabled:opacity-60" />
              </label>
              <label className="block"><span className="label">توضیح بالای فرم</span>
                <textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={3} className="input" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="label">متن دکمه ارسال</span><input value={form.submitLabel} onChange={(e) => update({ submitLabel: e.target.value })} className="input" /></label>
                <label className="block"><span className="label">پیام پس از ارسال</span><input value={form.successMessage} onChange={(e) => update({ successMessage: e.target.value })} className="input" /></label>
              </div>
              <div className="rounded-xl bg-ivory p-4 text-sm leading-7">
                <p className="font-bold text-navy">انتشار و جای‌گذاری</p>
                <p className="mt-1">نشانی عمومی: <a href={publicUrl} target="_blank" className="font-semibold text-edu" dir="ltr">{publicUrl}</a></p>
                <p className="text-muted">برای نمایش این فرم در صفحه یک مرکز، از بخش «مراکز» آن را به‌عنوان فرم صفحه انتخاب کنید.</p>
              </div>
              {remove && (
                <button onClick={() => confirm("این فرم و همه پاسخ‌هایش حذف شود؟") && start(() => remove())} className="text-sm font-semibold text-gc hover:underline">حذف فرم</button>
              )}
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              {/* palette */}
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted">افزودن فیلد</p>
                <button onClick={addQuick} className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold-ink hover:bg-gold/25">⚡ افزودن سریع: نام، موبایل، کد ملی، پایه، رشته</button>
              </div>
              <div className="mb-5 space-y-2 rounded-xl bg-ivory/70 p-3">
                {Object.entries(FIELD_GROUPS).map(([g, gl]) => (
                  <div key={g} className="flex flex-wrap items-center gap-1.5">
                    <span className="w-20 shrink-0 text-[0.7rem] font-semibold text-muted">{gl}</span>
                    {FIELD_TYPES.filter((t) => t.group === g).map((t) => (
                      <button key={t.type} onClick={() => add(t.type)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold hover:border-navy/40 hover:shadow-sm">
                        <span className="text-[0.7rem] text-edu">{ICON[t.type]}</span>{t.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              <ol className="space-y-2">
                {form.fields.map((f, i) => {
                  const open = sel === f.id;
                  const others = form.fields.filter((o) => o.id !== f.id && CONDITION_TYPES.includes(o.type));
                  return (
                    <li
                      key={f.id}
                      draggable
                      onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = "move"; }}
                      onDragOver={(e) => { e.preventDefault(); setOver(i); }}
                      onDragLeave={() => setOver(null)}
                      onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null); }}
                      onDragEnd={() => { setDrag(null); setOver(null); }}
                      className={`rounded-xl border transition-colors ${open ? "border-edu/50 bg-edu-soft/40" : "border-line bg-paper"} ${over === i && drag !== i ? "ring-2 ring-gold" : ""} ${drag === i ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-2 p-2.5">
                        <span className="cursor-grab px-1 text-muted select-none" title="بکشید و جابه‌جا کنید">⋮⋮</span>
                        <button onClick={() => setSel(open ? null : f.id)} className="flex min-w-0 flex-1 items-center gap-2 text-right">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ivory text-[0.7rem] font-bold text-edu">{ICON[f.type]}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-navy">{f.label}{f.required && <span className="text-gc"> *</span>}</span>
                            <span className="block text-[0.7rem] text-muted">{fieldTypeLabel(f.type)}{f.showIf?.field ? " · شرطی" : ""}{f.half ? " · نیم‌عرض" : ""}</span>
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
                            <label className="block sm:col-span-2"><span className="label text-xs">عنوان فیلد</span><input value={f.label} onChange={(e) => setField(f.id, { label: e.target.value })} className="input py-2" /></label>
                            <label className="block"><span className="label text-xs">نوع</span>
                              <select value={f.type} onChange={(e) => { const t = e.target.value as FieldType; setField(f.id, { type: t, options: OPTION_TYPES.includes(t) ? f.options ?? ["گزینه ۱"] : undefined }); }} className="input py-2">
                                {FIELD_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                              </select>
                            </label>
                            <label className="block"><span className="label text-xs">متن راهنمای داخل کادر</span><input value={f.placeholder ?? ""} onChange={(e) => setField(f.id, { placeholder: e.target.value })} className="input py-2" /></label>
                            <label className="block sm:col-span-2"><span className="label text-xs">توضیح زیر فیلد</span><input value={f.help ?? ""} onChange={(e) => setField(f.id, { help: e.target.value })} className="input py-2" /></label>
                          </div>
                          {PRESET_OPTIONS[f.type] && <p className="rounded-lg bg-ivory px-3 py-2 text-xs text-muted">گزینه‌ها خودکار است: {PRESET_OPTIONS[f.type]!.join("، ")}</p>}
                          {OPTION_TYPES.includes(f.type) && (
                            <label className="block"><span className="label text-xs">گزینه‌ها (هر خط یکی){f.type === "checkbox" && " — خالی بگذارید تا یک تیک تأیید باشد"}</span>
                              <textarea value={(f.options ?? []).join("\n")} onChange={(e) => setField(f.id, { options: e.target.value.split("\n") })} rows={Math.max(3, (f.options ?? []).length + 1)} className="input py-2 leading-7" />
                            </label>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm">
                            <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!f.required} onChange={(e) => setField(f.id, { required: e.target.checked })} className="accent-navy" />الزامی</label>
                            <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!f.half} onChange={(e) => setField(f.id, { half: e.target.checked })} className="accent-navy" />نیم‌عرض در دسکتاپ</label>
                          </div>
                          <div className="rounded-lg bg-ivory p-3">
                            <p className="mb-2 text-xs font-semibold">نمایش شرطی</p>
                            {others.length === 0 ? (
                              <p className="text-xs text-muted">برای شرط، ابتدا یک فیلد گزینه‌ای (لیست، تک‌انتخابی، پایه یا رشته) اضافه کنید.</p>
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
                            <button onClick={() => del(f.id)} className="text-gc hover:underline">حذف فیلد</button>
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
        <div className="xl:sticky xl:top-6">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
            <span className="flex items-center gap-2">پیش‌نمایش زنده
              <span className="inline-flex rounded-full border border-line bg-paper p-0.5">
                {(["desktop", "mobile"] as const).map((d) => <button key={d} onClick={() => setDevice(d)} className={`rounded-full px-2.5 py-0.5 ${device === d ? "bg-navy text-white" : ""}`}>{d === "desktop" ? "دسکتاپ" : "موبایل"}</button>)}
              </span>
            </span>
            <a href={publicUrl} target="_blank" className="text-edu" dir="ltr">{publicUrl} ↗</a>
          </div>
          <div className="rounded-2xl border border-line bg-ivory p-3">
            <div className={`mx-auto rounded-xl bg-paper p-5 shadow-sm transition-all ${device === "mobile" ? "max-w-[380px]" : ""}`}>
              <h3 className="text-lg font-extrabold text-navy">{form.title}</h3>
              {form.description && <p className="mt-1 mb-4 text-sm text-muted">{form.description}</p>}
              <div className="mt-4"><FormRenderer key={JSON.stringify(form.fields.map((f) => [f.id, f.type, f.options]))} form={previewForm} preview narrow={device === "mobile"} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
