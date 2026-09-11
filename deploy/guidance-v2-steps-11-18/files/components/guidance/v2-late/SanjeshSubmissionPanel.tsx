"use client";

import { useActionState } from "react";
import {
  declareSanjeshAction,
  type LateFormState,
} from "@/app/portal/student/services/guidance/journey/steps/actions/late";
import type { SanjeshCaseView } from "@/lib/guidance/journey-v2/sanjesh";

const initial: LateFormState = {};

export function SanjeshSubmissionPanel(props: { view: SanjeshCaseView; locked: boolean }) {
  const [state, action, pending] = useActionState(declareSanjeshAction, initial);

  return (
    <div className="gv2-sanjesh">
      <section className="gv2-panel gv2-panel--accent">
        <h3>ثبت نهایی در سامانه رسمی سازمان سنجش</h3>
        <p>
          ستارگان‌پلاس انتخاب‌ها را به سامانه سنجش ارسال نمی‌کند. این مرحله فقط پیگیری ثبت رسمی شماست.
          هرگز رمز عبور سنجش را اینجا وارد نکنید.
        </p>
        <p>
          وضعیت فعلی: <strong>{props.view.statusLabel}</strong>
        </p>
      </section>

      <section className="gv2-panel">
        <h3>چک‌لیست عملیاتی</h3>
        <ol>
          <li>ورود به سامانه رسمی سازمان سنجش</li>
          <li>وارد کردن انتخاب‌ها مطابق فهرست نهایی تأییدشده</li>
          <li>کنترل کد رشته / دانشگاه در خود سامانه سنجش</li>
          <li>دریافت رسید یا تصویر ثبت و بارگذاری آن در این صفحه</li>
        </ol>
      </section>

      {props.view.reference || props.view.receipt ? (
        <section className="gv2-panel">
          <h3>اطلاعات اعلام‌شده</h3>
          <p>شناسه پیگیری: {props.view.reference || "—"}</p>
          <p>تاریخ اعلام: {props.view.declaredAtLabel || "—"}</p>
          {props.view.receipt ? <p>رسید: {props.view.receipt.filename}</p> : null}
        </section>
      ) : null}

      {props.locked ? (
        <p className="gv2-muted">این مرحله پس از تأیید مشاور/ناظر کامل می‌شود.</p>
      ) : (
        <form action={action} className="gv2-form">
          {state.error ? <p className="gpj-banner gpj-banner--error">{state.error}</p> : null}
          {state.ok ? <p className="gpj-banner">اعلام ثبت شما ذخیره شد و در انتظار بررسی مشاور است.</p> : null}
          <label>
            تاریخ ثبت در سنجش
            <input type="date" name="submittedAt" />
          </label>
          <label>
            شماره پیگیری / کد رهگیری (در صورت وجود)
            <input name="reference" defaultValue={props.view.reference ?? ""} />
          </label>
          <label>
            توضیح
            <textarea name="note" rows={3} defaultValue={props.view.note ?? ""} />
          </label>
          <label>
            رسید / تصویر / PDF ثبت سنجش
            <input type="file" name="file" accept="image/*,application/pdf" />
          </label>
          <button type="submit" className="gjv2-nav__button gjv2-nav__button--next" disabled={pending}>
            {pending ? "در حال ارسال…" : "ثبت در سنجش انجام شد"}
          </button>
        </form>
      )}
    </div>
  );
}
