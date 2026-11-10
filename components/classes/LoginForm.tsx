"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GRADES } from "@/lib/consult/constants";
import { FIELDS, MAJOR_GRADES } from "@/lib/classes/catalog";
import { startLogin, verifyLogin } from "@/app/(site)/classes/actions";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "code">("form");
  const [otpId, setOtpId] = useState("");
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [grade, setGrade] = useState("g12");
  const [pending, start] = useTransition();
  const needField = MAJOR_GRADES.has(grade);

  return (
    <form
      className="cl-card mx-auto max-w-lg space-y-4 p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const fd = new FormData(e.currentTarget);
        start(async () => {
          if (step === "form") {
            const res = await startLogin({
              firstName: String(fd.get("firstName") || ""),
              lastName: String(fd.get("lastName") || ""),
              grade: String(fd.get("grade") || ""),
              field: String(fd.get("field") || ""),
              mobile: String(fd.get("mobile") || ""),
            });
            if (!res.ok) return setError(res.error);
            setOtpId(res.otpId);
            setDevCode(res.devCode || "");
            setStep("code");
            return;
          }
          const res = await verifyLogin(otpId, String(fd.get("code") || ""), next);
          if (!res.ok) return setError(res.error);
          router.push(res.next);
          router.refresh();
        });
      }}
    >
      {step === "form" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold">نام<input name="firstName" required className="cl-input mt-1" autoComplete="given-name" /></label>
            <label className="block text-sm font-bold">نام خانوادگی<input name="lastName" required className="cl-input mt-1" autoComplete="family-name" /></label>
          </div>
          <label className="block text-sm font-bold">پایه
            <select name="grade" className="cl-input mt-1" value={grade} onChange={(e) => setGrade(e.target.value)}>
              {GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </label>
          {needField && (
            <label className="block text-sm font-bold">رشته
              <select name="field" className="cl-input mt-1" defaultValue="riazi">
                {FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </label>
          )}
          <label className="block text-sm font-bold">موبایل
            <input name="mobile" required inputMode="tel" dir="ltr" className="cl-input mt-1 text-left" placeholder="09123456789" autoComplete="tel" />
          </label>
        </>
      ) : (
        <>
          <label className="block text-sm font-bold">کد پیامک‌شده
            <input name="code" required inputMode="numeric" dir="ltr" className="cl-input mt-1 text-center text-lg tracking-[0.3em]" autoFocus />
          </label>
          {devCode && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">حالت توسعه: کد {devCode}</p>}
        </>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</p>}
      <button className="btn-gold w-full" disabled={pending}>{pending ? "لطفاً صبر کنید…" : step === "form" ? "دریافت کد" : "ورود"}</button>
    </form>
  );
}
