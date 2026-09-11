"use client";

import { useActionState, useMemo, useState } from "react";
import type { CounselorActionState } from "@/app/admin/counselor/actions";
import { JalaliDateField } from "@/components/datetime/JalaliDateField";
import { PersianTimePicker } from "@/components/datetime/PersianTimePicker";
import { PERSIAN_WEEKDAYS } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type {
  CounselorExceptionView,
  WeeklyDayProgram,
} from "@/lib/counselor-os/schedule";

type PreviewSlot = {
  id: string;
  rangeLabel: string;
  status: "free" | "booked";
  statusLabel: string;
  sessionLabel: string;
};

type PreviewDay = {
  key: string;
  heading: string;
  slots: PreviewSlot[];
};

type DayDraft = {
  enabled: boolean;
  windows: Array<{ start: string; end: string }>;
};

function daysFromProgram(program: WeeklyDayProgram[]): DayDraft[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const found = program.find((day) => day.weekday === weekday);
    const windows = found?.windows.length
      ? found.windows.map((w) => ({
          start: w.startLocalTime,
          end: w.endLocalTime,
        }))
      : [{ start: "09:00", end: "12:00" }];
    return {
      enabled: found?.enabled === true,
      windows,
    };
  });
}

function serializeDays(days: DayDraft[]) {
  return JSON.stringify(
    days.map((day, weekday) => ({
      weekday,
      enabled: day.enabled,
      windows: day.windows.map((window) => ({
        startLocalTime: window.start,
        endLocalTime: window.end,
      })),
    })),
  );
}

function WeeklyWindowsEditor(props: {
  idPrefix: string;
  days: DayDraft[];
  setDays: (updater: (prev: DayDraft[]) => DayDraft[]) => void;
}) {
  function updateWindow(
    weekday: number,
    index: number,
    key: "start" | "end",
    value: string | null,
  ) {
    props.setDays((prev) =>
      prev.map((day, i) => {
        if (i !== weekday) return day;
        return {
          ...day,
          windows: day.windows.map((window, w) =>
            w === index ? { ...window, [key]: value ?? "" } : window,
          ),
        };
      }),
    );
  }

  return (
    <div className="cos-sched__days">
      {PERSIAN_WEEKDAYS.map((label, weekday) => {
        const day = props.days[weekday];
        return (
          <article key={`${props.idPrefix}-${label}`} className="cos-sched__day">
            <label className="cos-sched__day-toggle">
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  props.setDays((prev) =>
                    prev.map((item, i) =>
                      i === weekday ? { ...item, enabled } : item,
                    ),
                  );
                }}
              />
              <strong>{label}</strong>
            </label>
            {day.enabled ? (
              day.windows.map((window, index) => (
                <div
                  key={`${props.idPrefix}-${weekday}-${index}`}
                  className="cos-sched__window"
                >
                  <PersianTimePicker
                    id={`${props.idPrefix}-w-${weekday}-${index}-start`}
                    label="از ساعت"
                    value={window.start || null}
                    onChange={(value) =>
                      updateWindow(weekday, index, "start", value)
                    }
                    required
                  />
                  <PersianTimePicker
                    id={`${props.idPrefix}-w-${weekday}-${index}-end`}
                    label="تا ساعت"
                    value={window.end || null}
                    onChange={(value) =>
                      updateWindow(weekday, index, "end", value)
                    }
                    required
                  />
                  {day.windows.length > 1 ? (
                    <button
                      type="button"
                      className="cos-btn"
                      onClick={() =>
                        props.setDays((prev) =>
                          prev.map((item, i) =>
                            i === weekday
                              ? {
                                  ...item,
                                  windows: item.windows.filter(
                                    (_, w) => w !== index,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      حذف بازه
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="cos-muted">این روز غیرفعال است.</p>
            )}
            {day.enabled ? (
              <button
                type="button"
                className="cos-btn"
                onClick={() =>
                  props.setDays((prev) =>
                    prev.map((item, i) =>
                      i === weekday
                        ? {
                            ...item,
                            windows: [
                              ...item.windows,
                              { start: "16:00", end: "19:00" },
                            ],
                          }
                        : item,
                    ),
                  )
                }
              >
                + افزودن بازه (استراحت بین بازه‌ها)
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function SlotPreview(props: {
  title: string;
  days: PreviewDay[];
  emptyHint: string;
}) {
  if (props.days.length === 0) {
    return (
      <div className="cos-sched__preview">
        <h4>{props.title}</h4>
        <p className="cos-empty">{props.emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="cos-sched__preview">
      <h4>{props.title}</h4>
      <div className="cos-slot-days">
        {props.days.map((day) => (
          <article key={day.key} className="cos-slot-day">
            <h5>{day.heading}</h5>
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
    </div>
  );
}

export function CounselorScheduleForm(props: {
  saveAction: (
    state: CounselorActionState,
    formData: FormData,
  ) => Promise<CounselorActionState>;
  exceptionAction: (
    state: CounselorActionState,
    formData: FormData,
  ) => Promise<CounselorActionState>;
  deleteExceptionAction: (
    state: CounselorActionState,
    formData: FormData,
  ) => Promise<CounselorActionState>;
  firstSessionMinutes: number;
  secondSessionMinutes: number;
  validFromYmd: string;
  validUntilYmd: string;
  days: WeeklyDayProgram[];
  firstDays?: WeeklyDayProgram[];
  secondDays?: WeeklyDayProgram[];
  firstValidFromYmd?: string;
  firstValidUntilYmd?: string;
  secondValidFromYmd?: string;
  secondValidUntilYmd?: string;
  firstPreviewDays?: PreviewDay[];
  secondPreviewDays?: PreviewDay[];
  exceptions: CounselorExceptionView[];
  advisorId?: string | null;
}) {
  const [saveState, saveForm, savePending] = useActionState(props.saveAction, {});
  const [exState, exForm, exPending] = useActionState(props.exceptionAction, {});
  const [delState, delForm, delPending] = useActionState(
    props.deleteExceptionAction,
    {},
  );
  const [firstDays, setFirstDays] = useState<DayDraft[]>(() =>
    daysFromProgram(props.firstDays ?? props.days),
  );
  const [secondDays, setSecondDays] = useState<DayDraft[]>(() =>
    daysFromProgram(props.secondDays ?? props.days),
  );
  const [exceptionKind, setExceptionKind] = useState<"blocked" | "special">(
    "blocked",
  );
  const [specialStart, setSpecialStart] = useState<string | null>("17:00");
  const [specialEnd, setSpecialEnd] = useState<string | null>("20:00");

  const firstWindowsJson = useMemo(() => serializeDays(firstDays), [firstDays]);
  const secondWindowsJson = useMemo(
    () => serializeDays(secondDays),
    [secondDays],
  );

  return (
    <div className="cos-sched" dir="rtl">
      <form action={saveForm} className="cos-sched__block" id="schedule-editor">
        {props.advisorId ? (
          <input type="hidden" name="advisorId" value={props.advisorId} />
        ) : null}
        <input type="hidden" name="firstWindowsJson" value={firstWindowsJson} />
        <input type="hidden" name="secondWindowsJson" value={secondWindowsJson} />

        <section className="cos-sched__program">
          <h3>برنامه جلسه اول</h3>
          <p className="cos-muted">
            مدت، بازه فعال و ساعات آزاد جلسه اول جدا از جلسه دوم ذخیره می‌شود.
            برای استراحت، چند بازه در یک روز بگذارید؛ نوبت از روی فاصله رد نمی‌شود.
          </p>
          <div className="cos-sched__grid">
            <label>
              مدت جلسه اول
              <input
                name="firstSessionMinutes"
                type="number"
                min={15}
                max={180}
                step={5}
                defaultValue={props.firstSessionMinutes}
                required
              />
              <small>دقیقه</small>
            </label>
          </div>
          <div className="cos-sched__grid">
            <div>
              <p className="cos-sched__field-label">از تاریخ</p>
              <JalaliDateField
                id="sched-first-from"
                name="firstValidFrom"
                defaultValue={
                  props.firstValidFromYmd || props.validFromYmd || null
                }
                required
              />
            </div>
            <div>
              <p className="cos-sched__field-label">تا تاریخ</p>
              <JalaliDateField
                id="sched-first-until"
                name="firstValidUntil"
                defaultValue={
                  props.firstValidUntilYmd || props.validUntilYmd || null
                }
                required
              />
            </div>
          </div>
          <h4>ساعات هفتگی جلسه اول</h4>
          <WeeklyWindowsEditor
            idPrefix="first"
            days={firstDays}
            setDays={(updater) => setFirstDays(updater)}
          />
          <SlotPreview
            title="پیش‌نمایش نوبت‌های جلسه اول"
            days={props.firstPreviewDays ?? []}
            emptyHint="پس از ذخیره برنامه، نوبت‌های جلسه اول اینجا دیده می‌شوند."
          />
        </section>

        <section className="cos-sched__program">
          <h3>برنامه جلسه دوم</h3>
          <p className="cos-muted">
            مدت، بازه فعال و ساعات جلسه دوم مستقل است. اگر تاریخ‌های فعال دو برنامه
            روی هم نیفتند، ساعت مشابه تداخل محسوب نمی‌شود.
          </p>
          <div className="cos-sched__grid">
            <label>
              مدت جلسه دوم
              <input
                name="secondSessionMinutes"
                type="number"
                min={15}
                max={180}
                step={5}
                defaultValue={props.secondSessionMinutes}
                required
              />
              <small>دقیقه</small>
            </label>
          </div>
          <div className="cos-sched__grid">
            <div>
              <p className="cos-sched__field-label">از تاریخ</p>
              <JalaliDateField
                id="sched-second-from"
                name="secondValidFrom"
                defaultValue={
                  props.secondValidFromYmd || props.validFromYmd || null
                }
                required
              />
            </div>
            <div>
              <p className="cos-sched__field-label">تا تاریخ</p>
              <JalaliDateField
                id="sched-second-until"
                name="secondValidUntil"
                defaultValue={
                  props.secondValidUntilYmd || props.validUntilYmd || null
                }
                required
              />
            </div>
          </div>
          <h4>ساعات هفتگی جلسه دوم</h4>
          <WeeklyWindowsEditor
            idPrefix="second"
            days={secondDays}
            setDays={(updater) => setSecondDays(updater)}
          />
          <SlotPreview
            title="پیش‌نمایش نوبت‌های جلسه دوم"
            days={props.secondPreviewDays ?? []}
            emptyHint="پس از ذخیره برنامه، نوبت‌های جلسه دوم اینجا دیده می‌شوند."
          />
        </section>

        {saveState.error ? <p className="cos-error">{saveState.error}</p> : null}
        {saveState.success ? (
          <p className="cos-success">{saveState.success}</p>
        ) : null}
        <button
          type="submit"
          className="cos-btn cos-btn--primary"
          disabled={savePending}
        >
          {savePending ? "در حال ذخیره…" : "ذخیره برنامه هر دو جلسه"}
        </button>
      </form>

      <section className="cos-sched__block">
        <h3>استثناهای تقویم</h3>
        <p className="cos-muted">
          تعطیلی یک تاریخ یا زمان ویژه یک‌باره برای هر دو نوع جلسه اعمال می‌شود.
        </p>
        {props.exceptions.length === 0 ? (
          <p className="cos-empty">استثنایی ثبت نشده است.</p>
        ) : (
          <ul className="cos-sched__exceptions">
            {props.exceptions.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.dateLabel}</strong>
                  <span>
                    {item.kind === "blocked"
                      ? "در این تاریخ مشاور حضور ندارد"
                      : `${toPersianDigits(item.startLocalTime ?? "")} تا ${toPersianDigits(item.endLocalTime ?? "")} زمان ویژه`}
                  </span>
                  {item.reason ? <em>{item.reason}</em> : null}
                </div>
                <form action={delForm}>
                  {props.advisorId ? (
                    <input
                      type="hidden"
                      name="advisorId"
                      value={props.advisorId}
                    />
                  ) : null}
                  <input type="hidden" name="exceptionId" value={item.id} />
                  <button
                    type="submit"
                    className="cos-btn"
                    disabled={delPending}
                  >
                    حذف
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {delState.error ? <p className="cos-error">{delState.error}</p> : null}

        <form action={exForm} className="cos-sched__exception-form">
          {props.advisorId ? (
            <input type="hidden" name="advisorId" value={props.advisorId} />
          ) : null}
          <h4>افزودن استثنا</h4>
          <label>
            نوع
            <select
              name="kind"
              value={exceptionKind}
              onChange={(event) =>
                setExceptionKind(
                  event.target.value === "special" ? "special" : "blocked",
                )
              }
            >
              <option value="blocked">تعطیل کردن یک تاریخ</option>
              <option value="special">افزودن زمان ویژه</option>
            </select>
          </label>
          <div>
            <p className="cos-sched__field-label">تاریخ</p>
            <JalaliDateField id="sched-ex-date" name="localDate" required />
          </div>
          {exceptionKind === "special" ? (
            <div className="cos-sched__grid">
              <PersianTimePicker
                id="sched-ex-start"
                label="از ساعت"
                value={specialStart}
                onChange={setSpecialStart}
                required
              />
              <PersianTimePicker
                id="sched-ex-end"
                label="تا ساعت"
                value={specialEnd}
                onChange={setSpecialEnd}
                required
              />
              <input
                type="hidden"
                name="startLocalTime"
                value={specialStart ?? ""}
              />
              <input
                type="hidden"
                name="endLocalTime"
                value={specialEnd ?? ""}
              />
            </div>
          ) : null}
          <label>
            توضیح (اختیاری)
            <input name="reason" placeholder="مثلاً تعطیل رسمی" />
          </label>
          {exState.error ? <p className="cos-error">{exState.error}</p> : null}
          {exState.success ? (
            <p className="cos-success">{exState.success}</p>
          ) : null}
          <button
            type="submit"
            className="cos-btn cos-btn--primary"
            disabled={exPending}
          >
            {exPending ? "در حال ثبت…" : "ثبت استثنا"}
          </button>
        </form>
      </section>
    </div>
  );
}
