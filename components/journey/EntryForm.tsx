"use client";
import { useState } from "react";
import { beginJourney } from "@/app/(site)/safar/actions";
import { FIELDS, GRADE_LABEL, GRADES } from "@/lib/journey/catalog";

export function EntryForm({ error }: { error?: string }) {
  const [grade, setGrade] = useState(9);
  return (
    <form className="sj-card sj-mt" action={beginJourney}>
      <h2>نامت را روی نقشه بنویس</h2>
      <p className="sj-hint">مسیر ذخیره می‌شود و از همان نشان ادامه پیدا می‌کند.</p>
      {error && <p className="sj-err">{error}</p>}
      <label className="sj-label">نام و نام خانوادگی</label>
      <input className="sj-field" name="name" required placeholder="مثلاً محمدحسین مرادی" />
      <label className="sj-label">موبایل دانش‌آموز <i>لازم</i></label>
      <input className="sj-field" name="mobile" required dir="ltr" style={{ textAlign: "right" }} placeholder="۰۹۱۲۳۴۵۶۷۸۹" inputMode="tel" />
      <label className="sj-label">موبایل پدر یا مادر <i>اگر خواستی</i></label>
      <input className="sj-field" name="parent" dir="ltr" style={{ textAlign: "right" }} placeholder="۰۹۳۵…" inputMode="tel" />
      <label className="sj-label">پایه</label>
      <select className="sj-field" name="grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
        {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABEL[g]}</option>)}
      </select>
      {grade >= 10 && (
        <>
          <label className="sj-label">رشته</label>
          <select className="sj-field" name="field" defaultValue="riazi">
            {FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </>
      )}
      <p className="sj-note">
        {grade <= 6 && "عدد منفی، درصد و توان از کتاب‌های بعدی‌اند و در این سفر نیستند. رشته از دهم پرسیده می‌شود."}
        {grade >= 7 && grade <= 9 && "اتحاد، معادلهٔ خط و تابع مال کتاب‌های بعدند. رشته از دهم پرسیده می‌شود."}
        {grade >= 10 && "رشته این‌جا لازم است تا مسیر با کتاب خودت جور باشد."}
      </p>
      <label className="sj-label">نام مدرسه <i>اگر خواستی</i></label>
      <input className="sj-field" name="school" placeholder="مثلاً ستارگان نسیم‌شهر" />
      <button className="sj-btn" type="submit">شروع ماجراجویی</button>
      <p className="sj-fine">برای هر شماره، یک سفر باز می‌ماند.</p>
    </form>
  );
}
