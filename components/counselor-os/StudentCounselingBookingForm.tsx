"use client";

import { useActionState } from "react";
import {
  bookStudentCounselingSlotAction,
  type CounselorActionState,
} from "@/app/portal/student/services/guidance/counseling-actions";

const initial: CounselorActionState = {};

type Slot = {
  id: string;
  label: string;
  advisorName: string;
  remaining: number;
};

export function StudentCounselingBookingForm({
  slots,
}: {
  slots: Slot[];
}) {
  const [state, action, pending] = useActionState(bookStudentCounselingSlotAction, initial);

  if (slots.length === 0) {
    return (
      <p className="cos-empty guidance-counseling-empty">
        در حال حاضر زمان آزادی برای رزرو وجود ندارد.
      </p>
    );
  }

  return (
    <form action={action} className="guidance-counseling-book">
      <p className="guidance-counseling-book__hint">یک زمان آزاد انتخاب کنید:</p>
      <ul className="guidance-counseling-slots">
        {slots.map((slot) => (
          <li key={slot.id}>
            <label className="guidance-counseling-slot">
              <input type="radio" name="slotId" value={slot.id} required />
              <span>
                <strong>{slot.label}</strong>
                <em>{slot.advisorName}</em>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {state.error ? <p className="cos-error">{state.error}</p> : null}
      {state.success ? <p className="cos-success">{state.success}</p> : null}
      <button type="submit" className="guidance-counseling-book__submit" disabled={pending}>
        {pending ? "در حال رزرو…" : "تأیید رزرو جلسه"}
      </button>
    </form>
  );
}
