"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CounselorActionState } from "@/app/admin/counselor/actions";
import { CounselorCalendarSelect } from "@/components/counselor-os/CounselorCalendarSelect";
import { CounselorScheduleForm } from "@/components/counselor-os/CounselorScheduleForm";

type CounselorFormAction = (
  state: CounselorActionState,
  formData: FormData,
) => Promise<CounselorActionState>;
import type {
  CounselorExceptionView,
  WeeklyDayProgram,
} from "@/lib/counselor-os/schedule";
import { scheduleFormRevision } from "@/lib/counselor-os/schedule-form-utils";

export type CalendarPreviewDay = {
  key: string;
  heading: string;
  slots: Array<{
    id: string;
    rangeLabel: string;
    status: "free" | "booked";
    statusLabel: string;
    sessionLabel: string;
  }>;
};

type Props = {
  isSupervisor: boolean;
  advisorId: string;
  advisorName: string;
  advisors: Array<{ id: string; displayName: string }>;
  schedule: {
    firstSessionMinutes: number;
    secondSessionMinutes: number;
    validFromYmd: string;
    validUntilYmd: string;
    days: WeeklyDayProgram[];
    firstDays: WeeklyDayProgram[];
    secondDays: WeeklyDayProgram[];
    firstValidFromYmd: string;
    firstValidUntilYmd: string;
    secondValidFromYmd: string;
    secondValidUntilYmd: string;
    exceptions: CounselorExceptionView[];
  };
  firstPreviewDays: CalendarPreviewDay[];
  secondPreviewDays: CalendarPreviewDay[];
  saveAction: CounselorFormAction;
  exceptionAction: CounselorFormAction;
  deleteExceptionAction: CounselorFormAction;
};

function PreviewPanel(props: {
  title: string;
  days: CalendarPreviewDay[];
  emptyHint: string;
}) {
  const totalFree = props.days.reduce(
    (sum, day) => sum + day.slots.filter((s) => s.status === "free").length,
    0,
  );

  if (props.days.length === 0) {
    return (
      <section className="cos-cal-preview cos-panel">
        <h3>{props.title}</h3>
        <p className="cos-empty">{props.emptyHint}</p>
      </section>
    );
  }

  return (
    <section className="cos-cal-preview cos-panel">
      <header className="cos-cal-preview__head">
        <h3>{props.title}</h3>
        <span className="cos-cal-preview__count">{totalFree} نوبت آزاد</span>
      </header>
      <div className="cos-slot-days">
        {props.days.map((day) => (
          <article key={day.key} className="cos-slot-day">
            <h4>{day.heading}</h4>
            <ul>
              {day.slots.map((slot) => (
                <li
                  key={slot.id}
                  className={
                    slot.status === "booked"
                      ? "cos-slot-row cos-slot-row--booked"
                      : "cos-slot-row cos-slot-row--free"
                  }
                >
                  <strong>
                    {slot.rangeLabel} · {slot.statusLabel}
                  </strong>
                  <span>{slot.sessionLabel}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CounselorCalendarWorkspace(props: Props) {
  const [dirty, setDirty] = useState(false);

  const formRevision = useMemo(
    () =>
      scheduleFormRevision({
        advisorId: props.advisorId,
        firstValidFromYmd: props.schedule.firstValidFromYmd,
        firstValidUntilYmd: props.schedule.firstValidUntilYmd,
        secondValidFromYmd: props.schedule.secondValidFromYmd,
        secondValidUntilYmd: props.schedule.secondValidUntilYmd,
        firstDays: props.schedule.firstDays,
        secondDays: props.schedule.secondDays,
      }),
    [props],
  );

  return (
    <>
      {props.isSupervisor && props.advisors.length > 0 ? (
        <section className="cos-panel">
          <CounselorCalendarSelect
            advisors={props.advisors}
            selectedId={props.advisorId}
            dirty={dirty}
          />
        </section>
      ) : null}

      <div className="cos-cal-workspace">
        <section className="cos-panel cos-cal-workspace__form" id="schedule-panel">
          <header className="cos-cal-workspace__form-head">
            <div>
              <h2>تنظیم برنامه زمانی</h2>
              <p className="cos-muted">
                {props.advisorName} — جلسه اول و دوم مستقل؛ استراحت با چند بازه در یک روز
              </p>
            </div>
            <Link href="/admin/counselor/appointments" className="cos-btn cos-btn--ghost">
              همه جلسات
            </Link>
          </header>
          <CounselorScheduleForm
            key={formRevision}
            advisorId={props.advisorId}
            saveAction={props.saveAction}
            exceptionAction={props.exceptionAction}
            deleteExceptionAction={props.deleteExceptionAction}
            firstSessionMinutes={props.schedule.firstSessionMinutes}
            secondSessionMinutes={props.schedule.secondSessionMinutes}
            validFromYmd={props.schedule.validFromYmd}
            validUntilYmd={props.schedule.validUntilYmd}
            days={props.schedule.days}
            firstDays={props.schedule.firstDays}
            secondDays={props.schedule.secondDays}
            firstValidFromYmd={props.schedule.firstValidFromYmd}
            firstValidUntilYmd={props.schedule.firstValidUntilYmd}
            secondValidFromYmd={props.schedule.secondValidFromYmd}
            secondValidUntilYmd={props.schedule.secondValidUntilYmd}
            exceptions={props.schedule.exceptions}
            onDirtyChange={setDirty}
          />
        </section>

        <aside className="cos-cal-workspace__aside" aria-label="پیش‌نمایش نوبت‌ها">
          <PreviewPanel
            title="پیش‌نمایش جلسه اول"
            days={props.firstPreviewDays}
            emptyHint="پس از ذخیره برنامه جلسه اول، نوبت‌های آزاد اینجا دیده می‌شوند."
          />
          <PreviewPanel
            title="پیش‌نمایش جلسه دوم"
            days={props.secondPreviewDays}
            emptyHint="پس از ذخیره برنامه جلسه دوم، نوبت‌های آزاد اینجا دیده می‌شوند."
          />
        </aside>
      </div>
    </>
  );
}
