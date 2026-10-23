const MSG: Record<string, string> = { nf: "سفارشی با این مشخصات پیدا نشد.", rate: "تعداد تلاش‌ها زیاد است؛ کمی بعد امتحان کنید.", "1": "هر دو مورد را درست وارد کنید." };
export function LookupForm({ action, error, code, back = "/order" }: { action: (fd: FormData) => Promise<void>; error?: string; code?: string; back?: string }) {
  return (
    <form action={action} className="card mt-6 space-y-4 p-5">
      <input type="hidden" name="back" value={back} />
      <label className="block"><span className="label">کد تحویل یا شماره سفارش</span><input name="code" defaultValue={code} dir="ltr" className="input text-right uppercase" placeholder="AB12CD" /></label>
      <label className="block"><span className="label">شماره موبایل</span><input name="mobile" type="tel" inputMode="numeric" dir="ltr" className="input text-right" placeholder="۰۹۱۲۳۴۵۶۷۸۹" /></label>
      {error && <p className="rounded-xl bg-gc-soft px-4 py-2.5 text-sm text-gc">{MSG[error] ?? MSG["1"]}</p>}
      <button className="btn-gold w-full">مشاهده سفارش</button>
    </form>
  );
}
