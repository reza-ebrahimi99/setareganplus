"use client";

import { useActionState } from "react";
import {
  declareSanjeshAction,
  type LateFormState,
} from "@/app/portal/student/services/guidance/journey/steps/actions/late";
import type { SanjeshCaseView } from "@/lib/guidance/journey-v2/sanjesh";
import { CHOICE_STUDIO_BRAND } from "@/lib/guidance/choice-studio/types";

const initial: LateFormState = {};

export function SanjeshSubmissionPanel(props: { view: SanjeshCaseView; locked: boolean }) {
  const [state, action, pending] = useActionState(declareSanjeshAction, initial);

  return (
    <div className="gv2-sanjesh gcs-student">
      <header className="gcs-student__hero">
        <p>{CHOICE_STUDIO_BRAND}</p>
        <h2>حالت ثبت سنجش</h2>
        <p>
          ستارگان‌پلاس به سامانه سنجش متصل نیست و انتخاب‌ها را ارسال نمی‌کند. اپراتور کدها را دستی
          وارد می‌کند. هرگز رمز عبور سنجش، رمز درگاه ملی یا اطلاعات بانکی را اینجا وارد نکنید.
        </p>
      </header>

      <section className="gv2-panel gv2-panel--accent">
        <p>
          وضعیت فعلی: <strong>{props.view.statusLabel}</strong>
        </p>
        {props.view.status === "VERIFIED" ? (
          <p>ثبت نهایی سنجش تأیید شده است.</p>
        ) : props.view.reference || props.view.receipt ? (
          <p>ثبت توسط اپراتور اعلام شده — در انتظار تأیید</p>
        ) : (
          <p>هنوز رسید یا شماره پیگیری رسمی ثبت نشده است.</p>
        )}
      </section>

      <section className="gv2-panel">
        <h3>چک‌لیست عملیاتی</h3>
        <ol>
          <li>ورود به سامانه رسمی سازمان سنجش</li>
          <li>وارد کردن کدها مطابق فهرست نهایی تأییدشده</li>
          <li>کنترل کد رشته و دانشگاه در خود سامانه سنجش</li>
          <li>دریافت رسید و ثبت شماره پیگیری در این صفحه</li>
        </ol>
      </section>

      {props.view.reference || props.view.receipt ? (
        <section className="gv2-panel">
          <h3>شواهد اعلام‌شده</h3>
          <p>شناسه پیگیری: {props.view.reference || "—"}</p>
          <p>تاریخ اعلام: {props.view.declaredAtLabel || "—"}</p>
          {props.view.receipt ? <p>رسید: {props.view.receipt.filename}</p> : null}
        </section>
      ) : null}

      {props.locked ? (
        <p className="gv2-muted">پس از تأیید نهایی مشاور/ناظر، مسیر انتخاب رشته کامل می‌شود.</p>
      ) : (
        <form action={action} className="gv2-form">
          {state.error ? <p className="gpj-banner gpj-banner--error">{state.error}</p> : null}
          {state.ok ? (
            <p className="gpj-banner">اعلام ثبت ذخیره شد و در انتظار تأیید است. این تأیید سنجش نیست.</p>
          ) : null}
          <label>
            تاریخ ثبت در سنجش
            <input type="date" name="submittedAt" />
          </label>
          <label>
            شماره پیگیری / کد رهگیری
            <input name="reference" defaultValue={props.view.reference ?? ""} />
          </label>
          <label>
            توضیح اپراتور
            <textarea name="note" rows={3} defaultValue={props.view.note ?? ""} />
          </label>
          <label>
            رسید / تصویر / PDF ثبت سنجش
            <input type="file" name="file" accept="image/*,application/pdf" />
          </label>
          <button type="submit" className="gjv2-nav__button gjv2-nav__button--next" disabled={pending}>
            {pending ? "در حال ارسال…" : "ثبت توسط اپراتور انجام شد"}
          </button>
        </form>
      )}
    </div>
  );
}
