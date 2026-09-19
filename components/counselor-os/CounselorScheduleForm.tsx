"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CounselorActionState } from "@/app/admin/counselor/actions";
import { JalaliDateField } from "@/components/datetime/JalaliDateField";
import { PersianTimePicker } from "@/components/datetime/PersianTimePicker";
import { PERSIAN_WEEKDAYS } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import {
  daysFromProgram,
  serializeDays,
  type DayDraft,
} from "@/lib/counselor-os/schedule-form-utils";
import { assertDayWindowsValid } from "@/lib/counselor-os/schedule-windows";
import type {
  CounselorExceptionView,
  WeeklyDayProgram,
} from "@/lib/counselor-os/schedule";

const initial: CounselorActionState = {};

type ProgramTab = "first" | "second";

function WeeklyWindowsEditor(props: {
  idPrefix: string;
  days: DayDraft[];
  setDays: (updater: (prev: DayDraft[]) => DayDraft[]) => void;
  sessionMinutes: number;
  fieldErrors: Record<string, string>;
}) {
  const [openDay, setOpenDay] = useState<number | null>(0);

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
    <div className="cos-sched__days cos-sched__days--accordion">
      {PERSIAN_WEEKDAYS.map((label, weekday) => {
        const day = props.days[weekday];
        const isOpen = openDay === weekday;
        const dayErr = props.fieldErrors[`${props.idPrefix}-day-${weekday}`];
        return (
          <article
            key={`${props.idPrefix}-${label}`}
            className={`cos-sched__day${day.enabled ? " is-enabled" : ""}${isOpen ? " is-open" : ""}`}
          >
            <div className="cos-sched__day-head">
              <label className="cos-sched__day-toggle">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  aria-label={`فعال‌سازی ${label}`}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    props.setDays((prev) =>
                      prev.map((item, i) =>
                        i === weekday ? { ...item, enabled } : item,
                      ),
                    );
                    if (enabled) setOpenDay(weekday);
                  }}
                />
                <strong>{label}</strong>
              </label>
              {day.enabled ? (
                <button
                  type="button"
                  className="cos-sched__day-expand"
                  aria-expanded={isOpen}
                  onClick={() => setOpenDay(isOpen ? null : weekday)}
                >
                  {isOpen ? "بستن" : "بازه‌ها"}
                </button>
              ) : (
                <span className="cos-muted cos-sched__day-off">غیرفعال</span>
              )}
            </div>
            {day.enabled && isOpen ? (
              <div className="cos-sched__day-body">
                {day.windows.map((window, index) => (
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
                        className="cos-btn cos-btn--ghost"
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
                ))}
                <button
                  type="button"
                  className="cos-btn cos-btn--ghost"
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
                  + بازه دیگر (استراحت بین بازه‌ها)
                </button>
                {dayErr ? <p className="cos-error">{dayErr}</p> : null}
              </div>
            ) : null}
          </article>
        );
      })}
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
  exceptions: CounselorExceptionView[];
  advisorId?: string | null;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [saveState, saveForm, savePending] = useActionState(props.saveAction, {});
  const [exState, exForm, exPending] = useActionState(props.exceptionAction, {});
  const [delState, delForm, delPending] = useActionState(
    props.deleteExceptionAction,
    {},
  );

  const initialFirstDays = useMemo(
    () => daysFromProgram(props.firstDays ?? props.days),
    [props.firstDays, props.days],
  );
  const initialSecondDays = useMemo(
    () => daysFromProgram(props.secondDays ?? props.days),
    [props.secondDays, props.days],
  );

  const [activeTab, setActiveTab] = useState<ProgramTab>("first");
  const [firstDays, setFirstDays] = useState<DayDraft[]>(initialFirstDays);
  const [secondDays, setSecondDays] = useState<DayDraft[]>(initialSecondDays);
  const [firstMinutes, setFirstMinutes] = useState(props.firstSessionMinutes);
  const [secondMinutes, setSecondMinutes] = useState(props.secondSessionMinutes);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [clientError, setClientError] = useState<string | null>(null);

  const [exceptionKind, setExceptionKind] = useState<"blocked" | "special">(
    "blocked",
  );
  const [specialStart, setSpecialStart] = useState<string | null>("17:00");
  const [specialEnd, setSpecialEnd] = useState<string | null>("20:00");

  const baseline = useMemo(
    () =>
      JSON.stringify({
        first: serializeDays(initialFirstDays),
        second: serializeDays(initialSecondDays),
        fm: props.firstSessionMinutes,
        sm: props.secondSessionMinutes,
      }),
    [
      initialFirstDays,
      initialSecondDays,
      props.firstSessionMinutes,
      props.secondSessionMinutes,
    ],
  );

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        first: serializeDays(firstDays),
        second: serializeDays(secondDays),
        fm: firstMinutes,
        sm: secondMinutes,
      }),
    [firstDays, secondDays, firstMinutes, secondMinutes],
  );

  const dirty = baseline !== currentSnapshot;

  useEffect(() => {
    props.onDirtyChange?.(dirty);
  }, [dirty, props]);

  useEffect(() => {
    if (saveState.success) {
      router.refresh();
    }
  }, [saveState.success, router]);

  const firstWindowsJson = useMemo(() => serializeDays(firstDays), [firstDays]);
  const secondWindowsJson = useMemo(
    () => serializeDays(secondDays),
    [secondDays],
  );

  function validateProgram(
    days: DayDraft[],
    minutes: number,
    prefix: string,
  ): Record<string, string> {
    const errors: Record<string, string> = {};
    days.forEach((day, weekday) => {
      if (!day.enabled) return;
      const windows = day.windows.map((w) => ({
        startLocalTime: w.start,
        endLocalTime: w.end,
      }));
      const result = assertDayWindowsValid(windows, minutes);
      if (!result.ok) {
        errors[`${prefix}-day-${weekday}`] = result.error;
      }
    });
    return errors;
  }

  function handleSaveSubmit(event: React.FormEvent<HTMLFormElement>) {
    setClientError(null);
    const errors = {
      ...validateProgram(firstDays, firstMinutes, "first"),
      ...validateProgram(secondDays, secondMinutes, "second"),
    };
    const anyEnabled =
      firstDays.some((d) => d.enabled) || secondDays.some((d) => d.enabled);
    if (!anyEnabled) {
      errors.program = "حداقل یک روز در جلسه اول یا دوم باید فعال باشد.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      setClientError("لطفاً خطاهای فرم را برطرف کنید.");
      return;
    }
  }

  return (
    <div className="cos-sched" dir="rtl">
      <form
        action={saveForm}
        className="cos-sched__block"
        id="schedule-editor"
        onSubmit={handleSaveSubmit}
      >
        {props.advisorId ? (
          <input type="hidden" name="advisorId" value={props.advisorId} />
        ) : null}
        <input type="hidden" name="firstWindowsJson" value={firstWindowsJson} />
        <input type="hidden" name="secondWindowsJson" value={secondWindowsJson} />

        <div className="cos-sched__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "first"}
            className={activeTab === "first" ? "is-active" : undefined}
            onClick={() => setActiveTab("first")}
          >
            جلسه اول
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "second"}
            className={activeTab === "second" ? "is-active" : undefined}
            onClick={() => setActiveTab("second")}
          >
            جلسه دوم
          </button>
        </div>

        <input type="hidden" name="firstSessionMinutes" value={firstMinutes} />
        <input type="hidden" name="secondSessionMinutes" value={secondMinutes} />

        <section
          className={`cos-sched__program${activeTab === "first" ? "" : " cos-sched__program--hidden"}`}
          role="tabpanel"
          hidden={activeTab !== "first"}
        >
          <div className="cos-sched__grid">
            <label>
              مدت جلسه اول
              <input
                type="number"
                min={15}
                max={180}
                step={5}
                value={firstMinutes}
                onChange={(e) => setFirstMinutes(Number(e.target.value))}
                required={activeTab === "first"}
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
          {fieldErrors.program ? (
            <p className="cos-error">{fieldErrors.program}</p>
          ) : null}
          <WeeklyWindowsEditor
            idPrefix="first"
            days={firstDays}
            setDays={setFirstDays}
            sessionMinutes={firstMinutes}
            fieldErrors={fieldErrors}
          />
        </section>

        <section
          className={`cos-sched__program${activeTab === "second" ? "" : " cos-sched__program--hidden"}`}
          role="tabpanel"
          hidden={activeTab !== "second"}
        >
          <div className="cos-sched__grid">
            <label>
              مدت جلسه دوم
              <input
                type="number"
                min={15}
                max={180}
                step={5}
                value={secondMinutes}
                onChange={(e) => setSecondMinutes(Number(e.target.value))}
                required={activeTab === "second"}
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
          <WeeklyWindowsEditor
            idPrefix="second"
            days={secondDays}
            setDays={setSecondDays}
            sessionMinutes={secondMinutes}
            fieldErrors={fieldErrors}
          />
        </section>

        {clientError ? <p className="cos-error">{clientError}</p> : null}
        {saveState.error ? <p className="cos-error">{saveState.error}</p> : null}
        {saveState.success ? (
          <p className="cos-success" role="status">
            {saveState.success}
          </p>
        ) : null}
        <button
          type="submit"
          className="cos-btn cos-btn--primary cos-sched__save"
          disabled={savePending}
        >
          {savePending ? "در حال ذخیره…" : "ذخیره برنامه"}
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
                    className="cos-btn cos-btn--ghost"
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
