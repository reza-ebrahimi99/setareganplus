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
import { ChoiceDiffPanel } from "@/components/guidance/choice-studio/ChoiceDiffPanel";
import { CHOICE_STUDIO_BRAND } from "@/lib/guidance/choice-studio/types";
import { toPersianDigits } from "@/lib/persian";

const initial: LateFormState = {};

export function InformedConfirmPanel(props: {
  list: ChoiceListView;
  initialList?: ChoiceListView | null;
  readyAtLabel?: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(confirmInformedChoiceListAction, initial);
  if (state.ok) router.replace(guidanceJourneyV2StepPath(18));
  const active = props.list.items.filter((i) => i.isActive);

  return (
    <div className="gv2-confirm gcs-student">
      <header className="gcs-student__hero">
        <p>{CHOICE_STUDIO_BRAND}</p>
        <h2>تأیید نهایی انتخاب رشته</h2>
        <span className="gcs-badge gcs-badge--final_ready">نسخه نهایی مشاور — در انتظار تأیید دانش‌آموز</span>
        <p>
          {toPersianDigits(active.length)} انتخاب
          {props.readyAtLabel ? ` · ${props.readyAtLabel}` : ""}
        </p>
      </header>

      <section className="gv2-panel gv2-panel--accent">
        <h3>این تأیید به معنی ثبت در سنجش نیست</h3>
        <p>
          با تأیید، نسخه نهایی تهیه‌شده توسط مشاور را می‌پذیرید. ثبت در سامانه رسمی سازمان سنجش در
          مرحله بعد و به‌صورت دستی انجام می‌شود. ستارگان‌پلاس انتخاب‌ها را به‌صورت خودکار به سنجش
          ارسال نمی‌کند.
        </p>
      </section>

      {props.initialList ? (
        <ChoiceDiffPanel initial={props.initialList.items} final={props.list.items} />
      ) : null}

      <ol className="gv2-choice-cards">
        {active.map((item) => (
          <li key={item.id} className="gv2-choice-card">
            <header>
              <em>{toPersianDigits(item.sortOrder)}</em>
              <div>
                <strong>{item.officialCode || "—"}</strong>
                <span>
                  {item.major} · {item.university}
                </span>
              </div>
            </header>
            <p>
              {[item.city || item.province, item.educationTypeLabel, labelChoiceBand(item.band)]
                .filter((v) => v && v !== "—")
                .join(" · ")}
            </p>
          </li>
        ))}
      </ol>

      <form action={action} className="gv2-panel">
        {state.error ? <p className="gpj-banner gpj-banner--error">{state.error}</p> : null}
        <label className="gv2-check">
          <input type="checkbox" name="ackReviewed" />
          نسخه نهایی انتخاب‌های خود را بررسی کرده‌ام.
        </label>
        <label className="gv2-check">
          <input type="checkbox" name="ackOrder" />
          از ترتیب انتخاب‌ها و تغییرات انجام‌شده آگاه هستم.
        </label>
        <label className="gv2-check">
          <input type="checkbox" name="ackSanjesh" />
          می‌دانم این تأیید به معنی ثبت خودکار در سامانه سازمان سنجش نیست.
        </label>
        <button type="submit" className="gjv2-nav__button gjv2-nav__button--next" disabled={pending}>
          {pending ? "در حال ثبت…" : "تأیید نهایی فهرست"}
        </button>
      </form>
    </div>
  );
}
