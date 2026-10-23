"use client";
import { useActionState, useState } from "react";
import { BRANCHES, GRADES, MAJORS, gradeHasMajor, PICKUP_HOURS } from "@/lib/shop/config";
import type { CheckoutState } from "@/app/(site)/shop/actions";

type Props = { productId: string; action: (s: CheckoutState, fd: FormData) => Promise<CheckoutState>; priceLabel: string; disabled?: string | null; defaultGrade?: string | null };

export function CheckoutForm({ productId, action, priceLabel, disabled, defaultGrade }: Props) {
  const [state, run, pending] = useActionState(action, { errors: {} });
  const v = state.values ?? {};
  const [grade, setGrade] = useState(v.grade ?? defaultGrade ?? "");
  const [branch, setBranch] = useState(v.branch ?? "");
  const err = (k: string) => state.errors[k] && <p className="mt-1.5 text-sm text-gc">{state.errors[k]}</p>;
  return (
    <form action={run} noValidate className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label">نام و نام خانوادگی دانش‌آموز <span className="text-gc">*</span></span>
          <input name="buyerName" defaultValue={v.buyerName} autoComplete="name" className="input" placeholder="مثلاً علی رضایی" />
          {err("buyerName")}
        </label>
        <label className="block">
          <span className="label">شماره موبایل <span className="text-gc">*</span></span>
          <input name="mobile" defaultValue={v.mobile} type="tel" inputMode="numeric" autoComplete="tel" dir="ltr" className="input text-right" placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" />
          <span className="mt-1 block text-xs text-muted">رسید و پیامک «آماده تحویل» به این شماره ارسال می‌شود.</span>
          {err("mobile")}
        </label>
        <label className="block">
          <span className="label">کد ملی <span className="text-xs font-normal text-muted">(اختیاری)</span></span>
          <input name="nationalCode" defaultValue={v.nationalCode} inputMode="numeric" dir="ltr" maxLength={10} className="input text-right" placeholder="۱۰ رقم" />
          {err("nationalCode")}
        </label>
        <label className="block">
          <span className="label">پایه <span className="text-gc">*</span></span>
          <select name="grade" value={grade} onChange={(e) => setGrade(e.target.value)} className="input">
            <option value="">انتخاب کنید</option>
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>
          {err("grade")}
        </label>
        {gradeHasMajor(grade) ? (
          <label className="block">
            <span className="label">رشته <span className="text-gc">*</span></span>
            <select name="major" defaultValue={v.major ?? ""} className="input">
              <option value="">انتخاب کنید</option>
              {MAJORS.map((m) => <option key={m}>{m}</option>)}
            </select>
            {err("major")}
          </label>
        ) : (
          <label className="block">
            <span className="label">نام ولی <span className="text-xs font-normal text-muted">(اختیاری)</span></span>
            <input name="parentName" defaultValue={v.parentName} className="input" />
          </label>
        )}
      </div>

      <fieldset>
        <legend className="label">محل تحویل جزوه <span className="text-gc">*</span></legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {(Object.keys(BRANCHES) as (keyof typeof BRANCHES)[]).map((k) => (
            <label key={k} className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors ${branch === k ? "border-navy bg-navy/[0.03] ring-1 ring-navy" : "border-line bg-paper hover:border-navy/30"}`}>
              <input type="radio" name="branch" value={k} checked={branch === k} onChange={() => setBranch(k)} className="mt-1.5 size-4 accent-navy" />
              <span className="text-sm leading-6"><b className="block text-navy">{BRANCHES[k].name}</b><span className="text-muted">{BRANCHES[k].address}</span></span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">ساعت تحویل: {PICKUP_HOURS.join(" · ")}</p>
        {err("branch")}
      </fieldset>

      <label className="block">
        <span className="label">توضیحات <span className="text-xs font-normal text-muted">(اختیاری)</span></span>
        <textarea name="customerNote" defaultValue={v.customerNote} rows={2} className="input" placeholder="اگر نکته‌ای دربارهٔ سفارش دارید بنویسید" />
      </label>

      {state.error && <p className="rounded-xl bg-gc-soft px-4 py-3 text-sm text-gc">{state.error}</p>}
      <button type="submit" disabled={pending || !!disabled} className="btn-gold w-full py-3.5 text-base">
        {disabled ? disabled : pending ? "در حال انتقال به درگاه…" : `پرداخت ${priceLabel} و ثبت سفارش`}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 10V8a6 6 0 1112 0v2M5 10h14v10H5z" /></svg>
        پرداخت امن با درگاه زیبال · تحویل حضوری در شعبه
      </p>
    </form>
  );
}
