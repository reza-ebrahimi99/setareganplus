"use client";

import { useActionState } from "react";
import {
  createCounselorAction,
  type CounselorActionState,
} from "@/app/admin/counselor/actions";

const initial: CounselorActionState = {};

export function CreateCounselorForm() {
  const [state, action, pending] = useActionState(createCounselorAction, initial);
  return (
    <form action={action} className="cos-form-stack">
      <div className="cos-form-grid">
        <label>
          نام
          <input name="firstName" required />
        </label>
        <label>
          نام خانوادگی
          <input name="lastName" required />
        </label>
        <label>
          موبایل ورود
          <input name="mobile" required inputMode="tel" placeholder="09xxxxxxxxx" />
        </label>
        <label>
          عنوان
          <input name="title" placeholder="مشاور انتخاب رشته" />
        </label>
        <label>
          تخصص
          <input name="specialty" />
        </label>
        <label>
          ظرفیت
          <input name="capacity" type="number" min={0} placeholder="خالی = نامحدود" />
        </label>
      </div>
      <label>
        معرفی کوتاه
        <textarea name="bio" rows={3} />
      </label>
      <button type="submit" className="cos-btn cos-btn--primary" disabled={pending}>
        {pending ? "در حال ایجاد…" : "ایجاد مشاور"}
      </button>
      {state.error ? <p className="cos-error">{state.error}</p> : null}
      {state.success ? <p className="cos-success">{state.success}</p> : null}
    </form>
  );
}
