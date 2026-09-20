"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CounselorActionState } from "@/app/admin/counselor/actions";
import {
  activateSchedulePlanV2Action,
  copySchedulePlanV2Action,
  deleteSchedulePlanV2Action,
  pauseSchedulePlanV2Action,
  previewSchedulePlanV2Action,
  saveSchedulePlanV2Action,
} from "@/app/admin/counselor/actions";
import { JalaliDateField } from "@/components/datetime/JalaliDateField";
import { CounselorScheduleSessionKind } from "@/generated/prisma/enums";
import type { SchedulePlanDetail, SchedulePlanListItem } from "@/lib/counselor-os/schedule-v2/types";
import {
  planStatusLabel,
  sessionKindLabel,
} from "@/lib/counselor-os/schedule-v2/session-kind";
import { weekdayLabelForGregorianYmd } from "@/lib/counselor-os/schedule-v2/local-date";
import { normalizeLocalTimeHm } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";

type FormAction = (
  state: CounselorActionState,
  formData: FormData,
) => Promise<CounselorActionState>;

type WorkDay = {
  localDateGregorian: string;
  windows: Array<{ start: string; end: string }>;
  note: string;
};

type Props = {
  advisorId: string;
  plans: SchedulePlanListItem[];
  editingPlan: SchedulePlanDetail | null;
  onDirtyChange?: (dirty: boolean) => void;
};

function emptyDay(): WorkDay {
  return {
    localDateGregorian: "",
    windows: [{ start: "09:00", end: "12:00" }],
    note: "",
  };
}

function daysFromDetail(plan: SchedulePlanDetail | null): WorkDay[] {
  if (!plan || plan.days.length === 0) return [emptyDay()];
  return plan.days.map((d) => ({
    localDateGregorian: d.localDateGregorian,
    windows: d.windows.map((w) => ({
      start: w.startLocalTime,
      end: w.endLocalTime,
    })),
    note: d.note ?? "",
  }));
}

function serializeWorkDays(days: WorkDay[]) {
  return JSON.stringify(
    days
      .filter((d) => d.localDateGregorian)
      .map((d) => ({
        localDateGregorian: d.localDateGregorian,
        note: d.note || null,
        windows: d.windows.map((w) => ({
          startLocalTime: normalizeLocalTimeHm(w.start) ?? w.start,
          endLocalTime: normalizeLocalTimeHm(w.end) ?? w.end,
        })),
      })),
  );
}

export function CounselorScheduleV2Panel(props: Props) {
  const router = useRouter();
  const [sessionKind, setSessionKind] = useState<CounselorScheduleSessionKind>(
    props.editingPlan?.sessionKind ?? CounselorScheduleSessionKind.FIRST_SESSION,
  );
  const [planId, setPlanId] = useState(props.editingPlan?.id ?? "");
  const [planStatus, setPlanStatus] = useState(
    props.editingPlan?.status ?? "DRAFT",
  );
  const [version, setVersion] = useState(props.editingPlan?.version ?? 1);
  const [sessionMinutes, setSessionMinutes] = useState(
    props.editingPlan?.sessionMinutes ?? 60,
  );
  const [title, setTitle] = useState(props.editingPlan?.title ?? "");
  const [note, setNote] = useState(props.editingPlan?.note ?? "");
  const [days, setDays] = useState<WorkDay[]>(() =>
    daysFromDetail(props.editingPlan),
  );
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [flash, setFlash] = useState<CounselorActionState>({});
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const idempotencyRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()),
  );
  const initialRevision = useRef(
    serializeWorkDays(daysFromDetail(props.editingPlan)) +
      sessionKind +
      sessionMinutes,
  );

  const daysJson = useMemo(() => serializeWorkDays(days), [days]);
  const dirty = useMemo(() => {
    const rev =
      daysJson + sessionKind + String(sessionMinutes) + title + note;
    return rev !== initialRevision.current;
  }, [daysJson, sessionKind, sessionMinutes, title, note]);

  useEffect(() => {
    props.onDirtyChange?.(dirty);
  }, [dirty, props]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const runPreview = useCallback(async () => {
    if (!daysJson || daysJson === "[]") {
      setPreviewCount(0);
      setPreviewError("حداقل یک روز با تاریخ مشخص اضافه کنید.");
      return;
    }
    const result = await previewSchedulePlanV2Action({
      advisorId: props.advisorId,
      sessionMinutes,
      daysJson,
      planId: planId || undefined,
    });
    if (!result.ok) {
      setPreviewCount(null);
      setPreviewError(result.error ?? "پیش‌نمایش ناموفق بود.");
      return;
    }
    setPreviewError(null);
    setPreviewCount(result.totalSlots ?? 0);
  }, [daysJson, planId, props.advisorId, sessionMinutes]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runPreview();
    }, 400);
    return () => window.clearTimeout(t);
  }, [runPreview]);

  function submitWith(action: FormAction, extra?: Record<string, string>) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("advisorId", props.advisorId);
      fd.set("sessionKind", sessionKind);
      fd.set("sessionMinutes", String(sessionMinutes));
      fd.set("title", title);
      fd.set("note", note);
      fd.set("daysJson", daysJson);
      fd.set("planStatus", planStatus);
      fd.set("idempotencyKey", idempotencyRef.current);
      if (planId) fd.set("planId", planId);
      fd.set("version", String(version));
      if (extra) {
        for (const [k, v] of Object.entries(extra)) fd.set(k, v);
      }
      const result = await action({}, fd);
      setFlash(result);
      if (!result.error) {
        initialRevision.current =
          daysJson + sessionKind + String(sessionMinutes) + title + note;
        idempotencyRef.current =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now());
        router.refresh();
      }
    });
  }

  function loadPlanFromList(id: string) {
    router.push(
      `/admin/counselor/calendar?advisorId=${encodeURIComponent(props.advisorId)}&planId=${encodeURIComponent(id)}`,
    );
  }

  function newDraft(kind: CounselorScheduleSessionKind) {
    router.push(
      `/admin/counselor/calendar?advisorId=${encodeURIComponent(props.advisorId)}&newPlan=${kind === CounselorScheduleSessionKind.SECOND_SESSION ? "second" : "first"}`,
    );
  }

  const drafts = props.plans.filter((p) => p.status === "DRAFT");
  const published = props.plans.filter((p) => p.status !== "DRAFT");

  return (
    <div className="cos-cal-v2">
      {flash.error ? (
        <p className="cos-alert cos-alert--error" role="alert">
          {flash.error}
        </p>
      ) : null}
      {flash.success ? (
        <p className="cos-alert cos-alert--success" role="status">
          {flash.success}
        </p>
      ) : null}

      <section className="cos-panel cos-cal-v2__list">
        <header className="cos-cal-v2__list-head">
          <h3>پیش‌نویس‌ها و برنامه‌های زمان‌بندی</h3>
          <div className="cos-inline-actions">
            <button
              type="button"
              className="cos-btn cos-btn--ghost"
              onClick={() =>
                newDraft(CounselorScheduleSessionKind.FIRST_SESSION)
              }
            >
              پیش‌نویس جلسه اول
            </button>
            <button
              type="button"
              className="cos-btn cos-btn--ghost"
              onClick={() =>
                newDraft(CounselorScheduleSessionKind.SECOND_SESSION)
              }
            >
              پیش‌نویس جلسه دوم
            </button>
          </div>
        </header>

        {drafts.length > 0 ? (
          <>
            <h4 className="cos-cal-v2__subhead">پیش‌نویس‌های زمان‌بندی</h4>
            <ul className="cos-cal-v2__plans">
              {drafts.map((plan) => (
                <li key={plan.id}>
                  <span>
                    {sessionKindLabel(plan.sessionKind)} ·{" "}
                    {plan.dayCount} روز · {plan.sessionMinutes} دقیقه
                  </span>
                  <div className="cos-inline-actions">
                    <button
                      type="button"
                      className="cos-btn cos-btn--ghost"
                      onClick={() => loadPlanFromList(plan.id)}
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      className="cos-btn cos-btn--ghost"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const r = await copySchedulePlanV2Action(plan.id);
                          if (r.ok && r.planId) loadPlanFromList(r.planId);
                          else setFlash({ error: r.error });
                        });
                      }}
                    >
                      کپی
                    </button>
                    <button
                      type="button"
                      className="cos-btn cos-btn--primary"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const fd = new FormData();
                          fd.set("planId", plan.id);
                          fd.set("version", String(plan.version));
                          fd.set("idempotencyKey", crypto.randomUUID());
                          const r = await activateSchedulePlanV2Action({}, fd);
                          setFlash(r);
                          if (!r.error) router.refresh();
                        });
                      }}
                    >
                      فعال‌سازی
                    </button>
                    <button
                      type="button"
                      className="cos-btn"
                      onClick={() => {
                        setPlanId(plan.id);
                        setDeleteOpen(true);
                      }}
                    >
                      حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="cos-empty">پیش‌نویسی ثبت نشده است.</p>
        )}

        {published.length > 0 ? (
          <>
            <h4 className="cos-cal-v2__subhead">فعال / متوقف</h4>
            <ul className="cos-cal-v2__plans">
              {published.map((plan) => (
                <li key={plan.id}>
                  <span>
                    {sessionKindLabel(plan.sessionKind)} ·{" "}
                    {planStatusLabel(plan.status)} · {plan.dayCount} روز
                  </span>
                  <div className="cos-inline-actions">
                    <button
                      type="button"
                      className="cos-btn cos-btn--ghost"
                      onClick={() => loadPlanFromList(plan.id)}
                    >
                      {plan.status === "ACTIVE" ? "ویرایش" : "مشاهده"}
                    </button>
                    <button
                      type="button"
                      className="cos-btn cos-btn--ghost"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const r = await copySchedulePlanV2Action(plan.id);
                          if (r.ok && r.planId) loadPlanFromList(r.planId);
                        });
                      }}
                    >
                      کپی
                    </button>
                    {plan.status === "ACTIVE" ? (
                      <button
                        type="button"
                        className="cos-btn"
                        disabled={pending}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("planId", plan.id);
                          startTransition(async () => {
                            const r = await pauseSchedulePlanV2Action({}, fd);
                            setFlash(r);
                            router.refresh();
                          });
                        }}
                      >
                        توقف
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="cos-panel cos-cal-v2__editor">
        <header>
          <h3>
            {planId ? "ویرایش برنامه" : "برنامه جدید"} —{" "}
            {sessionKindLabel(sessionKind)}
          </h3>
          <p className="cos-muted">
            برای هر تاریخ شمسی، بازه‌های ساعتی و مدت جلسه را مشخص کنید.
          </p>
        </header>

        <div className="cos-cal-v2__kind">
          <label>
            <input
              type="radio"
              name="kindPick"
              checked={
                sessionKind === CounselorScheduleSessionKind.FIRST_SESSION
              }
              onChange={() =>
                setSessionKind(CounselorScheduleSessionKind.FIRST_SESSION)
              }
            />
            جلسه اول
          </label>
          <label>
            <input
              type="radio"
              name="kindPick"
              checked={
                sessionKind === CounselorScheduleSessionKind.SECOND_SESSION
              }
              onChange={() =>
                setSessionKind(CounselorScheduleSessionKind.SECOND_SESSION)
              }
            />
            جلسه دوم
          </label>
        </div>

        <label className="cos-field">
          <span>مدت هر جلسه (دقیقه)</span>
          <input
            type="number"
            min={15}
            max={180}
            value={sessionMinutes}
            onChange={(e) => setSessionMinutes(Number(e.target.value))}
          />
        </label>

        <div className="cos-cal-v2__days">
          {days.map((day, dayIndex) => (
            <article key={dayIndex} className="cos-cal-v2__day">
              <div className="cos-cal-v2__day-head">
                <JalaliDateField
                  id={`v2-day-${dayIndex}`}
                  name={`day-${dayIndex}`}
                  defaultValue={day.localDateGregorian || undefined}
                  required
                  onHiddenValueChange={(hidden) => {
                    setDays((prev) => {
                      const next = [...prev];
                      next[dayIndex] = {
                        ...next[dayIndex]!,
                        localDateGregorian: hidden,
                      };
                      return next;
                    });
                  }}
                />
                {day.localDateGregorian ? (
                  <span className="cos-muted" aria-readonly>
                    {weekdayLabelForGregorianYmd(day.localDateGregorian)}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="cos-btn cos-btn--ghost"
                  onClick={() =>
                    setDays((prev) => prev.filter((_, i) => i !== dayIndex))
                  }
                >
                  حذف روز
                </button>
              </div>
              {day.windows.map((window, wi) => (
                <div key={wi} className="cos-cal-v2__window">
                  <label>
                    شروع
                    <input
                      type="time"
                      value={window.start}
                      onChange={(e) => {
                        setDays((prev) => {
                          const next = [...prev];
                          const windows = [...next[dayIndex]!.windows];
                          windows[wi] = { ...windows[wi]!, start: e.target.value };
                          next[dayIndex] = { ...next[dayIndex]!, windows };
                          return next;
                        });
                      }}
                    />
                  </label>
                  <label>
                    پایان
                    <input
                      type="time"
                      value={window.end}
                      onChange={(e) => {
                        setDays((prev) => {
                          const next = [...prev];
                          const windows = [...next[dayIndex]!.windows];
                          windows[wi] = { ...windows[wi]!, end: e.target.value };
                          next[dayIndex] = { ...next[dayIndex]!, windows };
                          return next;
                        });
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="cos-btn cos-btn--ghost"
                    onClick={() =>
                      setDays((prev) => {
                        const next = [...prev];
                        const windows = next[dayIndex]!.windows.filter(
                          (_, i) => i !== wi,
                        );
                        next[dayIndex] = {
                          ...next[dayIndex]!,
                          windows: windows.length
                            ? windows
                            : [{ start: "09:00", end: "12:00" }],
                        };
                        return next;
                      })
                    }
                  >
                    حذف بازه
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="cos-btn cos-btn--ghost"
                onClick={() =>
                  setDays((prev) => {
                    const next = [...prev];
                    next[dayIndex] = {
                      ...next[dayIndex]!,
                      windows: [
                        ...next[dayIndex]!.windows,
                        { start: "13:00", end: "16:00" },
                      ],
                    };
                    return next;
                  })
                }
              >
                افزودن بازه در همین روز
              </button>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="cos-btn"
          onClick={() => setDays((prev) => [...prev, emptyDay()])}
        >
          افزودن روز کاری
        </button>

        <aside className="cos-cal-v2__preview" aria-live="polite">
          <strong>پیش‌نمایش نوبت‌ها</strong>
          {previewError ? (
            <p className="cos-muted">{previewError}</p>
          ) : previewCount != null ? (
            <p>{toPersianDigits(String(previewCount))} نوبت قابل رزرو</p>
          ) : (
            <p className="cos-muted">در حال محاسبه…</p>
          )}
        </aside>
      </section>

      <div className="cos-cal-v2__sticky">
        <button
          type="button"
          className="cos-btn cos-btn--primary"
          disabled={pending}
          onClick={() =>
            submitWith(
              planStatus === "ACTIVE"
                ? saveSchedulePlanV2Action
                : saveSchedulePlanV2Action,
            )
          }
        >
          {planStatus === "ACTIVE" ? "ذخیره برنامه فعال" : "ذخیره پیش‌نویس"}
        </button>
        {planStatus === "DRAFT" && planId ? (
          <button
            type="button"
            className="cos-btn"
            disabled={pending}
            onClick={() => submitWith(activateSchedulePlanV2Action)}
          >
            فعال‌سازی
          </button>
        ) : null}
      </div>

      {deleteOpen ? (
        <div className="cos-modal-backdrop" role="presentation">
          <div className="cos-modal" role="dialog" aria-modal="true">
            <p>آیا از حذف این پیش‌نویس مطمئن هستید؟</p>
            <div className="cos-inline-actions">
              <button
                type="button"
                className="cos-btn"
                onClick={() => setDeleteOpen(false)}
              >
                انصراف
              </button>
              <button
                type="button"
                className="cos-btn cos-btn--primary"
                disabled={pending}
                onClick={() => {
                  setDeleteOpen(false);
                  submitWith(deleteSchedulePlanV2Action);
                }}
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
