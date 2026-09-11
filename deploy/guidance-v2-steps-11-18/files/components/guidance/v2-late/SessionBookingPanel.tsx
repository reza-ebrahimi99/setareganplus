"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bookV2SessionAction,
  cancelV2SessionAction,
  completeV2BookingStepAction,
  rescheduleV2SessionAction,
  type LateFormState,
} from "@/app/portal/student/services/guidance/journey/steps/actions/late";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import type { AssignedCounselorView, V2AppointmentView, V2SlotView } from "@/lib/guidance/journey-v2/appointments";

const initial: LateFormState = {};

export function SessionBookingPanel(props: {
  step: 11 | 15;
  purposeLabel: string;
  counselor: AssignedCounselorView | null;
  slots: V2SlotView[];
  appointment: V2AppointmentView | null;
}) {
  const router = useRouter();
  const [bookState, bookAction, bookPending] = useActionState(bookV2SessionAction, initial);
  const [doneState, doneAction, donePending] = useActionState(
    completeV2BookingStepAction,
    initial,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelV2SessionAction,
    initial,
  );
  const [rescheduleState, rescheduleAction, reschedulePending] = useActionState(
    rescheduleV2SessionAction,
    initial,
  );
  const [selected, setSelected] = useState("");

  if (doneState.ok) {
    router.replace(guidanceJourneyV2StepPath(props.step + 1));
  }

  if (!props.counselor) {
    return (
      <div className="gv2-status-card">
        <p className="gv2-status-card__eyebrow">وضعیت پرونده</p>
        <h2>پرونده شما در حال تخصیص به مشاور است.</h2>
        <p>
          به‌محض مشخص شدن مشاور مسئول، زمان‌های آزاد همان مشاور در این صفحه نمایش داده می‌شود.
          هیچ نوبت عمومی یا ساختگی نشان داده نمی‌شود.
        </p>
      </div>
    );
  }

  return (
    <div className="gv2-booking">
      <article className="gv2-counselor-card">
        {props.counselor.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.counselor.photoUrl} alt="" className="gv2-counselor-card__photo" />
        ) : (
          <div className="gv2-counselor-card__photo gv2-counselor-card__photo--empty" />
        )}
        <div>
          <p className="gv2-counselor-card__eyebrow">مشاور پرونده شما</p>
          <h2>{props.counselor.name}</h2>
          <p>{props.counselor.title || "مشاور انتخاب رشته"}</p>
          {props.counselor.specialty ? <p>{props.counselor.specialty}</p> : null}
        </div>
      </article>

      <section className="gv2-panel">
        <h3>هدف جلسه</h3>
        <p>{props.purposeLabel}</p>
      </section>

      {props.appointment ? (
        <section className="gv2-panel gv2-panel--accent">
          <h3>وضعیت نوبت</h3>
          <dl className="gv2-dl">
            <div>
              <dt>زمان</dt>
              <dd>{props.appointment.whenLabel}</dd>
            </div>
            <div>
              <dt>وضعیت</dt>
              <dd>{props.appointment.statusLabel}</dd>
            </div>
            <div>
              <dt>نوع جلسه</dt>
              <dd>{props.appointment.purposeLabel}</dd>
            </div>
          </dl>
          <form action={doneAction}>
            <input type="hidden" name="step" value={String(props.step)} />
            <button type="submit" className="gjv2-nav__button gjv2-nav__button--next" disabled={donePending}>
              {donePending ? "در حال ادامه…" : "ادامه مسیر"}
            </button>
            {doneState.error ? <p className="gpj-banner gpj-banner--error">{doneState.error}</p> : null}
          </form>
          {props.appointment.canReschedule ? (
            <div className="gv2-booking__actions">
              <form action={cancelAction}>
                <input type="hidden" name="step" value={String(props.step)} />
                <input type="hidden" name="appointmentId" value={props.appointment.id} />
                <button type="submit" className="gv2-btn-ghost" disabled={cancelPending}>
                  لغو نوبت
                </button>
                {cancelState.error ? <p className="gpj-banner gpj-banner--error">{cancelState.error}</p> : null}
              </form>
            </div>
          ) : null}
        </section>
      ) : null}

      {props.slots.length === 0 ? (
        <div className="gv2-status-card">
          <h2>در حال حاضر زمان آزادی ثبت نشده است.</h2>
          <p>مشاور پرونده هنوز بازه زمانی آزادی در تقویم ثبت نکرده است. بعداً دوباره سر بزنید.</p>
        </div>
      ) : (
        <form action={props.appointment?.canReschedule ? rescheduleAction : bookAction} className="gv2-panel">
          <input type="hidden" name="step" value={String(props.step)} />
          {props.appointment?.canReschedule ? (
            <input type="hidden" name="appointmentId" value={props.appointment.id} />
          ) : null}
          <h3>{props.appointment ? "جابه‌جایی زمان" : "انتخاب تاریخ و ساعت"}</h3>
          <ul className="gv2-slot-list">
            {props.slots.map((slot) => (
              <li key={slot.id}>
                <label className={selected === slot.id ? "is-selected" : undefined}>
                  <input
                    type="radio"
                    name="slotId"
                    value={slot.id}
                    checked={selected === slot.id}
                    onChange={() => setSelected(slot.id)}
                    required
                  />
                  <span>{slot.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="submit"
            className="gjv2-nav__button gjv2-nav__button--next"
            disabled={bookPending || reschedulePending || !selected}
          >
            {props.appointment ? "ثبت زمان جدید" : "رزرو جلسه"}
          </button>
          {bookState.error ? <p className="gpj-banner gpj-banner--error">{bookState.error}</p> : null}
          {rescheduleState.error ? (
            <p className="gpj-banner gpj-banner--error">{rescheduleState.error}</p>
          ) : null}
        </form>
      )}
    </div>
  );
}
