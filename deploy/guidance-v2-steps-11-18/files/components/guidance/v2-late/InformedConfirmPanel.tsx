"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmInformedChoiceListAction,
  type LateFormState,
} from "@/app/portal/student/services/guidance/journey/steps/actions/late";
import { labelChoiceBand } from "@/lib/guidance/journey-v2/labels";
import type { ChoiceListView } from "@/lib/guidance/journey-v2/choices";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import { toPersianDigits } from "@/lib/persian";

const initial: LateFormState = {};

export function InformedConfirmPanel(props: { list: ChoiceListView }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(confirmInformedChoiceListAction, initial);
  if (state.ok) router.replace(guidanceJourneyV2StepPath(18));

  return (
    <div className="gv2-confirm">
      <section className="gv2-panel gv2-panel--accent">
        <h3>تأیید آگاهانه فهرست نهایی</h3>
        <p>
          این فهرست پس از بررسی شما و اصلاحات مشاور آماده شده است. ترتیب انتخاب‌ها مهم است.
          ثبت نهایی انتخاب رشته باید در سامانه رسمی سازمان سنجش انجام شود. مجموعه ستارگان‌پلاس و مشاور
          جایگزین فرآیند رسمی سنجش نیستند. هنگام ثبت رسمی، کدها و اطلاعات را دوباره با سامانه سنجش مطابقت دهید.
        </p>
      </section>

      <ol className="gv2-choice-cards">
        {props.list.items.filter((i) => i.isActive).map((item) => (
          <li key={item.id} className="gv2-choice-card">
            <header>
              <em>{toPersianDigits(item.sortOrder)}</em>
              <div>
                <strong>{item.major}</strong>
                <span>{item.university}</span>
              </div>
            </header>
            <p>
              {[item.city || item.province, item.educationTypeLabel, labelChoiceBand(item.band), item.officialCode]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ol>

      <form action={action} className="gv2-panel">
        {state.error ? <p className="gpj-banner gpj-banner--error">{state.error}</p> : null}
        <label className="gv2-check">
          <input type="checkbox" name="ackReviewed" />
          فهرست نهایی انتخاب‌ها را بررسی کرده‌ام.
        </label>
        <label className="gv2-check">
          <input type="checkbox" name="ackOrder" />
          ترتیب انتخاب‌ها را مشاهده و تأیید کرده‌ام.
        </label>
        <label className="gv2-check">
          <input type="checkbox" name="ackSanjesh" />
          می‌دانم ثبت نهایی باید در سامانه رسمی سازمان سنجش انجام شود.
        </label>
        <button type="submit" className="gjv2-nav__button gjv2-nav__button--next" disabled={pending}>
          {pending ? "در حال ثبت…" : "تأیید آگاهانه فهرست نهایی"}
        </button>
      </form>
    </div>
  );
}
