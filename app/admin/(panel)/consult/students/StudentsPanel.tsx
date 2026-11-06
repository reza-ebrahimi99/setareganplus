"use client";

import { useActionState, useState } from "react";
import { GRADES } from "@/lib/consult/constants";
import { createStudent, rotateStudent, type StudentFormState } from "./actions";

function CodeReveal({ state }: { state: StudentFormState }) {
  const [copied, setCopied] = useState(false);
  if (!state?.ok) return state && !state.ok ? <p role="alert" className="text-sm font-semibold text-gc">{state.error}</p> : null;
  return (
    <div role="status" className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
      <p className="text-sm font-bold text-navy">کد {state.name} فقط همین یک بار نشان داده می‌شود.</p>
      <p dir="ltr" className="mt-2 text-center text-2xl font-black tracking-[0.2em] text-navy">{state.code}</p>
      <button
        type="button"
        className="mt-2 text-sm font-bold text-edu"
        onClick={() => {
          void navigator.clipboard?.writeText(state.code).then(() => setCopied(true));
        }}
      >
        {copied ? "کپی شد" : "کپی کد"}
      </button>
      <p className="mt-2 text-xs leading-6 text-muted">این کد را به خود دانش‌آموز یا خانواده بدهید. در پایگاه فقط اثر رمزنگاری‌شده‌اش می‌ماند.</p>
    </div>
  );
}

export function NewStudentForm() {
  const [state, action, pending] = useActionState(createStudent, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2"><span className="label">نام و نام خانوادگی</span><input name="fullName" required className="input" /></label>
      <label className="block"><span className="label">موبایل مورد اعتماد مدرسه (اختیاری)</span><input name="mobile" dir="ltr" className="input" placeholder="0912…" /><span className="mt-1 block text-xs text-muted">اگر پر باشد، دانش‌آموز با کد وارد می‌شود و پیامک اضافه برای اثبات مالکیت لازم نیست.</span></label>
      <label className="block"><span className="label">پایه</span><select name="grade" className="input" defaultValue=""><option value="">نامشخص</option>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
      <label className="block sm:col-span-2"><span className="label">یادداشت داخلی</span><textarea name="note" rows={2} className="input" /></label>
      <div className="sm:col-span-2"><CodeReveal state={state} /></div>
      <button className="btn-gold w-fit px-5 py-2.5 text-sm" disabled={pending}>{pending ? "…" : "ثبت و ساخت کد"}</button>
    </form>
  );
}

export function RotateButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(rotateStudent, null);
  const [open, setOpen] = useState(false);
  return (
    <div>
      {open ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="id" value={id} />
          <CodeReveal state={state} />
          <button className="text-xs font-bold text-gc" disabled={pending}>{pending ? "…" : "صدور کد تازه و باطل‌کردن قبلی"}</button>
        </form>
      ) : (
        <button type="button" className="text-xs font-bold text-edu" onClick={() => setOpen(true)}>کد تازه</button>
      )}
    </div>
  );
}
