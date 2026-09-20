"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { CounselorActionState } from "@/app/admin/counselor/actions";
import {
  activateSchedulePlanV2Action,
  copySchedulePlanV2Action,
  deleteSchedulePlanV2Action,
  getSchedulePlanDeletePreviewAction,
  pauseSchedulePlanV2Action,
  saveAndActivateSchedulePlanV2Action,
  saveSchedulePlanV2Action,
} from "@/app/admin/counselor/actions";
import { JalaliDateField } from "@/components/datetime/JalaliDateField";
import { PersianTimePicker } from "@/components/datetime/PersianTimePicker";
import {
  CounselorSchedulePlanStatus,
  CounselorScheduleSessionKind,
} from "@/generated/prisma/enums";
import type {
  SchedulePlanDetail,
  SchedulePlanListItem,
} from "@/lib/counselor-os/schedule-v2/types";
import {
  planStatusLabel,
  sessionKindLabel,
} from "@/lib/counselor-os/schedule-v2/session-kind";
import { weekdayLabelForGregorianYmd } from "@/lib/counselor-os/schedule-v2/local-date";
import {
  computeSchedulePreview,
  formRowsToScheduleDays,
} from "@/lib/counselor-os/schedule-v2/preview-compute";
import { normalizeLocalTimeHm } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";

type FormAction = (
  state: CounselorActionState,
  formData: FormData,
) => Promise<CounselorActionState>;

type WorkWindow = { id: string; start: string; end: string };
type WorkDay = {
  id: string;
  localDateGregorian: string;
  windows: WorkWindow[];
};

type Props = {
  advisorId: string;
  advisorName: string;
  plans: SchedulePlanListItem[];
  editingPlan: SchedulePlanDetail | null;
  onDirtyChange?: (dirty: boolean) => void;
};

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyWindow(): WorkWindow {
  return { id: newId("win"), start: "09:00", end: "12:00" };
}

function emptyDay(): WorkDay {
  return {
    id: newId("day"),
    localDateGregorian: "",
    windows: [emptyWindow()],
  };
}

function daysFromDetail(plan: SchedulePlanDetail | null): WorkDay[] {
  if (!plan || plan.days.length === 0) return [emptyDay()];
  return plan.days.map((d) => ({
    id: d.id || newId("day"),
    localDateGregorian: d.localDateGregorian,
    windows: d.windows.map((w) => ({
      id: w.id || newId("win"),
      start: w.startLocalTime,
      end: w.endLocalTime,
    })),
  }));
}

function serializeWorkDays(days: WorkDay[]): string {
  const inputs = formRowsToScheduleDays(
    days.map((d) => ({
      localDateGregorian: d.localDateGregorian,
      windows: d.windows.map((w) => ({
        start: normalizeLocalTimeHm(w.start) ?? w.start,
        end: normalizeLocalTimeHm(w.end) ?? w.end,
      })),
    })),
  );
  return JSON.stringify(
    inputs.map((d) => ({
      localDateGregorian: d.localDateGregorian,
      windows: d.windows,
    })),
  );
}

type PlanFilter = "ALL" | CounselorSchedulePlanStatus;

export function CounselorScheduleV2Panel(props: Props) {
  const router = useRouter();
  const [sessionKind, setSessionKind] = useState(
    props.editingPlan?.sessionKind ?? CounselorScheduleSessionKind.FIRST_SESSION,
  );
  const [planFilter, setPlanFilter] = useState<PlanFilter>(
    CounselorSchedulePlanStatus.ACTIVE,
  );
  const [planId, setPlanId] = useState(props.editingPlan?.id ?? "");
  const [planStatus, setPlanStatus] = useState(
    props.editingPlan?.status ?? CounselorSchedulePlanStatus.DRAFT,
  );
  const [version, setVersion] = useState(props.editingPlan?.version ?? 1);
  const [sessionMinutes, setSessionMinutes] = useState(
    props.editingPlan?.sessionMinutes ?? 60,
  );
  const [title, setTitle] = useState(props.editingPlan?.title ?? "");
  const [days, setDays] = useState<WorkDay[]>(() =>
    daysFromDetail(props.editingPlan),
  );
  const [dayHint, setDayHint] = useState<string | null>(null);
  const [flash, setFlash] = useState<CounselorActionState>({});
  const [submitPhase, setSubmitPhase] = useState<
    "idle" | "draft" | "activate"
  >("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const isSubmitting = submitPhase !== "idle";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletePreview, setDeletePreview] = useState<{
    title: string;
    sessionKind: CounselorScheduleSessionKind;
    dayCount: number;
    reservationCount: number;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [planRowBusy, setPlanRowBusy] = useState<string | null>(null);
  const idempotencyRef = useRef(newId("idem"));
  const initialRevision = useRef("");

  useEffect(() => {
    const nextDays = daysFromDetail(props.editingPlan);
    setDays(nextDays);
    setSessionKind(
      props.editingPlan?.sessionKind ??
        CounselorScheduleSessionKind.FIRST_SESSION,
    );
    setPlanId(props.editingPlan?.id ?? "");
    setPlanStatus(
      props.editingPlan?.status ?? CounselorSchedulePlanStatus.DRAFT,
    );
    setVersion(props.editingPlan?.version ?? 1);
    setSessionMinutes(props.editingPlan?.sessionMinutes ?? 60);
    setTitle(props.editingPlan?.title ?? "");
    initialRevision.current =
      serializeWorkDays(nextDays) +
      String(props.editingPlan?.sessionKind) +
      String(props.editingPlan?.sessionMinutes ?? 60);
  }, [props.editingPlan?.id, props.editingPlan?.version]);

  const daysJson = useMemo(() => serializeWorkDays(days), [days]);

  const preview = useMemo(() => {
    const inputs = formRowsToScheduleDays(
      days.map((d) => ({
        localDateGregorian: d.localDateGregorian,
        windows: d.windows.map((w) => ({ start: w.start, end: w.end })),
      })),
    );
    return computeSchedulePreview({ days: inputs, sessionMinutes });
  }, [days, sessionMinutes]);

  const dirty = useMemo(() => {
    const rev = daysJson + sessionKind + String(sessionMinutes) + title;
    return rev !== initialRevision.current;
  }, [daysJson, sessionKind, sessionMinutes, title]);

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

  const plansForKind = useMemo(
    () => props.plans.filter((p) => p.sessionKind === sessionKind),
    [props.plans, sessionKind],
  );

  const filteredPlans = useMemo(() => {
    if (planFilter === "ALL") return plansForKind;
    return plansForKind.filter((p) => p.status === planFilter);
  }, [plansForKind, planFilter]);

  const stats = useMemo(() => {
    const draft = plansForKind.filter(
      (p) => p.status === CounselorSchedulePlanStatus.DRAFT,
    ).length;
    const active = plansForKind.filter(
      (p) => p.status === CounselorSchedulePlanStatus.ACTIVE,
    ).length;
    const paused = plansForKind.filter(
      (p) => p.status === CounselorSchedulePlanStatus.PAUSED,
    ).length;
    return { draft, active, paused };
  }, [plansForKind]);

  const setDayDate = useCallback((dayId: string, ymd: string) => {
    if (!ymd) {
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId ? { ...d, localDateGregorian: "" } : d,
        ),
      );
      return;
    }
    setDays((prev) => {
      const duplicate = prev.some(
        (d) => d.id !== dayId && d.localDateGregorian === ymd,
      );
      if (duplicate) {
        setDayHint(
          "این تاریخ قبلاً اضافه شده است؛ بازه جدید را داخل همان روز وارد کنید.",
        );
        return prev;
      }
      setDayHint(null);
      return prev.map((d) =>
        d.id === dayId ? { ...d, localDateGregorian: ymd } : d,
      );
    });
  }, []);

  function buildFormData(intent: "save-draft" | "save-and-activate"): FormData {
    const fd = new FormData();
    fd.set("intent", intent);
    fd.set("advisorId", props.advisorId);
    fd.set("sessionKind", sessionKind);
    fd.set("sessionMinutes", String(sessionMinutes));
    fd.set("title", title);
    fd.set("note", "");
    fd.set("daysJson", daysJson);
    fd.set("planStatus", planStatus);
    fd.set("idempotencyKey", newId("idem"));
    if (planId) fd.set("planId", planId);
    fd.set("version", String(version));
    return fd;
  }

  function afterSuccess(
    result: CounselorActionState,
    activated: boolean,
  ) {
    setFlash(result);
    flashRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    setSubmitError(null);
    initialRevision.current =
      daysJson + sessionKind + String(sessionMinutes) + title;
    idempotencyRef.current = newId("idem");
    if (activated) {
      setPlanStatus(CounselorSchedulePlanStatus.ACTIVE);
      setPlanFilter(CounselorSchedulePlanStatus.ACTIVE);
    }
    const nextId = result.planId ?? planId;
    if (nextId) setPlanId(nextId);
    if (nextId && (nextId !== planId || activated)) {
      router.push(
        `/admin/counselor/calendar?advisorId=${encodeURIComponent(props.advisorId)}&planId=${encodeURIComponent(nextId)}`,
      );
    } else {
      router.refresh();
    }
  }

  async function submitSchedule(intent: "save-draft" | "save-and-activate") {
    if (isSubmitting) return;
    if (!preview.ok) {
      const msg = preview.error;
      setSubmitError(msg);
      setFlash({ error: msg });
      return;
    }
    setSubmitError(null);
    setFlash({});
    setSubmitPhase(intent === "save-draft" ? "draft" : "activate");
    try {
      const fd = buildFormData(intent);
      const result =
        intent === "save-and-activate"
          ? await saveAndActivateSchedulePlanV2Action({}, fd)
          : await saveSchedulePlanV2Action({}, fd);
      afterSuccess(result, intent === "save-and-activate");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "عملیات ذخیره انجام نشد.";
      setSubmitError(msg);
      setFlash({ error: msg });
    } finally {
      setSubmitPhase("idle");
    }
  }

  async function openDeleteModal(planIdToDelete: string) {
    setDeleteTargetId(planIdToDelete);
    setDeletePreview(null);
    setDeleteOpen(true);
    setDeleteLoading(true);
    try {
      const r = await getSchedulePlanDeletePreviewAction(planIdToDelete);
      if (r.ok && r.preview) setDeletePreview(r.preview);
      else setFlash({ error: r.error ?? "بارگذاری اطلاعات حذف انجام نشد." });
    } finally {
      setDeleteLoading(false);
    }
  }

  function loadPlanFromList(id: string) {
    if (
      dirty &&
      !window.confirm("تغییرات ذخیره‌نشده دارید. ادامه می‌دهید؟")
    ) {
      return;
    }
    router.push(
      `/admin/counselor/calendar?advisorId=${encodeURIComponent(props.advisorId)}&planId=${encodeURIComponent(id)}`,
    );
  }

  function newDraft(kind: CounselorScheduleSessionKind) {
    if (
      dirty &&
      !window.confirm("تغییرات ذخیره‌نشده دارید. ادامه می‌دهید؟")
    ) {
      return;
    }
    router.push(
      `/admin/counselor/calendar?advisorId=${encodeURIComponent(props.advisorId)}&newPlan=${kind === CounselorScheduleSessionKind.SECOND_SESSION ? "second" : "first"}`,
    );
  }

  return (
    <div className="cos-cal-v2 cos-cal-v2--pro">
      <div ref={flashRef} className="cos-cal-v2__flash">
        {submitError || flash.error ? (
          <p className="cos-alert cos-alert--error" role="alert">
            {submitError ?? flash.error}
          </p>
        ) : null}
        {flash.success ? (
          <p className="cos-alert cos-alert--success" role="status">
            {flash.success}
          </p>
        ) : null}
      </div>
      {dayHint ? (
        <p className="cos-alert cos-alert--warn" role="status">
          {dayHint}
        </p>
      ) : null}

      <header className="cos-cal-v2__hero">
        <div>
          <h2 className="cos-cal-v2__title">زمان‌بندی جلسات مشاور</h2>
          <p className="cos-muted">{props.advisorName}</p>
        </div>
        <div className="cos-cal-v2__stats" aria-label="خلاصه برنامه‌ها">
          <span>
            پیش‌نویس: {toPersianDigits(String(stats.draft))}
          </span>
          <span>فعال: {toPersianDigits(String(stats.active))}</span>
          <span>متوقف: {toPersianDigits(String(stats.paused))}</span>
        </div>
      </header>

      <div className="cos-cal-v2__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={
            sessionKind === CounselorScheduleSessionKind.FIRST_SESSION
              ? "cos-cal-v2__tab cos-cal-v2__tab--active"
              : "cos-cal-v2__tab"
          }
          onClick={() => {
            if (
              sessionKind !== CounselorScheduleSessionKind.FIRST_SESSION &&
              dirty &&
              !window.confirm("تغییرات ذخیره‌نشده دارید.")
            ) {
              return;
            }
            setSessionKind(CounselorScheduleSessionKind.FIRST_SESSION);
          }}
        >
          جلسه اول
        </button>
        <button
          type="button"
          role="tab"
          className={
            sessionKind === CounselorScheduleSessionKind.SECOND_SESSION
              ? "cos-cal-v2__tab cos-cal-v2__tab--active"
              : "cos-cal-v2__tab"
          }
          onClick={() => {
            if (
              sessionKind !== CounselorScheduleSessionKind.SECOND_SESSION &&
              dirty &&
              !window.confirm("تغییرات ذخیره‌نشده دارید.")
            ) {
              return;
            }
            setSessionKind(CounselorScheduleSessionKind.SECOND_SESSION);
          }}
        >
          جلسه دوم
        </button>
      </div>

      <section className="cos-cal-v2__list cos-panel">
        <header className="cos-cal-v2__list-head">
          <h3>برنامه‌های {sessionKindLabel(sessionKind)}</h3>
          <button
            type="button"
            className="cos-btn cos-btn--ghost"
            onClick={() => newDraft(sessionKind)}
          >
            + پیش‌نویس جدید
          </button>
        </header>
        <div className="cos-cal-v2__filters">
          {(
            [
              ["ALL", "همه"],
              [CounselorSchedulePlanStatus.DRAFT, "پیش‌نویس"],
              [CounselorSchedulePlanStatus.ACTIVE, "فعال"],
              [CounselorSchedulePlanStatus.PAUSED, "متوقف"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={
                planFilter === key
                  ? "cos-cal-v2__filter cos-cal-v2__filter--on"
                  : "cos-cal-v2__filter"
              }
              onClick={() => setPlanFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {filteredPlans.length === 0 ? (
          <p className="cos-empty">برنامه‌ای در این فیلتر نیست.</p>
        ) : (
          <ul className="cos-cal-v2__plans">
            {filteredPlans.map((plan) => (
              <li key={plan.id} className="cos-cal-v2__plan-card">
                <div className="cos-cal-v2__plan-main">
                  <strong>{plan.title ?? sessionKindLabel(plan.sessionKind)}</strong>
                  <span
                    className={`cos-cal-v2__badge cos-cal-v2__badge--${plan.status.toLowerCase()}`}
                  >
                    {planStatusLabel(plan.status)}
                  </span>
                  <span className="cos-muted">
                    {toPersianDigits(String(plan.dayCount))} روز ·{" "}
                    {toPersianDigits(String(plan.sessionMinutes))} دقیقه
                  </span>
                </div>
                <div className="cos-cal-v2__plan-actions">
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
                    disabled={planRowBusy === plan.id}
                    onClick={() => {
                      setPlanRowBusy(plan.id);
                      startTransition(async () => {
                        try {
                          const r = await copySchedulePlanV2Action(plan.id);
                          if (r.ok && r.planId) loadPlanFromList(r.planId);
                          else setFlash({ error: r.error });
                        } finally {
                          setPlanRowBusy(null);
                        }
                      });
                    }}
                  >
                    {planRowBusy === plan.id ? "…" : "کپی"}
                  </button>
                  {plan.status === CounselorSchedulePlanStatus.DRAFT ||
                  plan.status === CounselorSchedulePlanStatus.PAUSED ? (
                    <button
                      type="button"
                      className="cos-btn cos-btn--primary"
                      disabled={planRowBusy === `${plan.id}:activate`}
                      onClick={() => {
                        setPlanRowBusy(`${plan.id}:activate`);
                        startTransition(async () => {
                          try {
                            const fd = new FormData();
                            fd.set("planId", plan.id);
                            fd.set("version", String(plan.version));
                            fd.set("idempotencyKey", newId("idem"));
                            setFlash(await activateSchedulePlanV2Action({}, fd));
                            router.refresh();
                          } finally {
                            setPlanRowBusy(null);
                          }
                        });
                      }}
                    >
                      {planRowBusy === `${plan.id}:activate`
                        ? "…"
                        : "فعال‌سازی"}
                    </button>
                  ) : null}
                  {plan.status === CounselorSchedulePlanStatus.ACTIVE ? (
                    <button
                      type="button"
                      className="cos-btn"
                      disabled={planRowBusy === `${plan.id}:pause`}
                      onClick={() => {
                        setPlanRowBusy(`${plan.id}:pause`);
                        startTransition(async () => {
                          try {
                            const fd = new FormData();
                            fd.set("planId", plan.id);
                            setFlash(await pauseSchedulePlanV2Action({}, fd));
                            router.refresh();
                          } finally {
                            setPlanRowBusy(null);
                          }
                        });
                      }}
                    >
                      {planRowBusy === `${plan.id}:pause` ? "…" : "توقف"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="cos-btn cos-btn--danger"
                    disabled={planRowBusy === `${plan.id}:delete`}
                    onClick={() => void openDeleteModal(plan.id)}
                  >
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        id="counselor-schedule-v2-form"
        className="cos-cal-v2__layout"
        onSubmit={(e) => e.preventDefault()}
      >
        <section className="cos-cal-v2__editor cos-panel">
          <header className="cos-cal-v2__editor-head">
            <h3>
              {planId ? "ویرایش برنامه" : "برنامه جدید"}
              {dirty ? (
                <span className="cos-cal-v2__unsaved">تغییرات ذخیره‌نشده</span>
              ) : null}
            </h3>
            <label className="cos-field cos-field--inline">
              <span>مدت جلسه (دقیقه)</span>
              <input
                type="number"
                min={15}
                max={180}
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(Number(e.target.value))}
              />
            </label>
          </header>

          <label className="cos-field">
            <span>عنوان (اختیاری)</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً آبان ۱۴۰۵"
            />
          </label>

          <div className="cos-cal-v2__days">
            {days.map((day) => (
              <article key={day.id} className="cos-cal-v2__day-card">
                <div className="cos-cal-v2__day-head">
                  <div className="cos-cal-v2__day-date">
                    <JalaliDateField
                      id={`v2-day-${day.id}`}
                      name={`day-${day.id}`}
                      defaultValue={day.localDateGregorian || undefined}
                      required
                      className="cos-cal-v2__jalali"
                      onHiddenValueChange={(ymd) => setDayDate(day.id, ymd)}
                    />
                    {day.localDateGregorian ? (
                      <span className="cos-cal-v2__weekday">
                        {weekdayLabelForGregorianYmd(day.localDateGregorian)}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="cos-btn cos-btn--danger cos-btn--sm"
                    disabled={days.length <= 1}
                    onClick={() =>
                      setDays((prev) =>
                        prev.length <= 1
                          ? prev
                          : prev.filter((d) => d.id !== day.id),
                      )
                    }
                  >
                    حذف روز
                  </button>
                </div>

                <ul className="cos-cal-v2__windows">
                  {day.windows.map((window) => (
                    <li key={window.id} className="cos-cal-v2__window-row">
                      <PersianTimePicker
                        id={`${day.id}-${window.id}-start`}
                        label="شروع"
                        value={window.start}
                        onChange={(v) =>
                          setDays((prev) =>
                            prev.map((d) =>
                              d.id !== day.id
                                ? d
                                : {
                                    ...d,
                                    windows: d.windows.map((w) =>
                                      w.id === window.id
                                        ? { ...w, start: v ?? "09:00" }
                                        : w,
                                    ),
                                  },
                            ),
                          )
                        }
                      />
                      <PersianTimePicker
                        id={`${day.id}-${window.id}-end`}
                        label="پایان"
                        value={window.end}
                        onChange={(v) =>
                          setDays((prev) =>
                            prev.map((d) =>
                              d.id !== day.id
                                ? d
                                : {
                                    ...d,
                                    windows: d.windows.map((w) =>
                                      w.id === window.id
                                        ? { ...w, end: v ?? "12:00" }
                                        : w,
                                    ),
                                  },
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="cos-btn cos-btn--ghost cos-btn--sm"
                        aria-label="حذف بازه"
                        onClick={() =>
                          setDays((prev) =>
                            prev.map((d) => {
                              if (d.id !== day.id) return d;
                              const nextW = d.windows.filter(
                                (w) => w.id !== window.id,
                              );
                              return {
                                ...d,
                                windows:
                                  nextW.length > 0 ? nextW : [emptyWindow()],
                              };
                            }),
                          )
                        }
                      >
                        حذف بازه
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="cos-btn cos-btn--ghost cos-btn--sm"
                  onClick={() =>
                    setDays((prev) =>
                      prev.map((d) =>
                        d.id === day.id
                          ? {
                              ...d,
                              windows: [
                                ...d.windows,
                                {
                                  id: newId("win"),
                                  start: "13:00",
                                  end: "16:00",
                                },
                              ],
                            }
                          : d,
                      ),
                    )
                  }
                >
                  + افزودن بازه
                </button>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="cos-btn cos-btn--ghost"
            onClick={() => setDays((prev) => [...prev, emptyDay()])}
          >
            + افزودن روز کاری
          </button>
        </section>

        <aside className="cos-cal-v2__aside cos-panel" aria-live="polite">
          <h3>پیش‌نمایش نوبت‌ها</h3>
          {!preview.ok ? (
            <p className="cos-cal-v2__preview-error">{preview.error}</p>
          ) : preview.totalSlots === 0 ? (
            <p className="cos-cal-v2__preview-error">
              نوبتی ساخته نشد؛ بازه‌ها و مدت جلسه را بررسی کنید.
            </p>
          ) : (
            <>
              <p className="cos-cal-v2__preview-total">
                {toPersianDigits(String(preview.totalSlots))} نوبت
              </p>
              {preview.days.map((group) => (
                <div key={group.localDateGregorian} className="cos-cal-v2__preview-day">
                  <h4>
                    {group.jalaliHeading} · {group.weekdayLabel}
                  </h4>
                  <div className="cos-cal-v2__chips">
                    {group.slots.map((slot) => (
                      <span key={slot.label} className="cos-cal-v2__chip">
                        {slot.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </aside>
      </form>

      <div className="cos-cal-v2__sticky-bar" role="toolbar" aria-label="ذخیره برنامه">
        {submitError ? (
          <p className="cos-cal-v2__sticky-error">{submitError}</p>
        ) : null}
        {planStatus === CounselorSchedulePlanStatus.ACTIVE ||
        planStatus === CounselorSchedulePlanStatus.PAUSED ? (
          <button
            type="button"
            className="cos-btn cos-btn--primary"
            disabled={isSubmitting || !preview.ok}
            onClick={() => void submitSchedule("save-draft")}
          >
            {submitPhase === "draft"
              ? "در حال ذخیره…"
              : "ذخیره تغییرات"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="cos-btn cos-btn--primary"
              disabled={isSubmitting || !preview.ok}
              onClick={() => void submitSchedule("save-draft")}
            >
              {submitPhase === "draft"
                ? "در حال ذخیره…"
                : "ذخیره پیش‌نویس"}
            </button>
            <button
              type="button"
              className="cos-btn cos-btn--primary"
              disabled={isSubmitting || !preview.ok}
              onClick={() => void submitSchedule("save-and-activate")}
            >
              {submitPhase === "activate"
                ? "در حال ذخیره و فعال‌سازی…"
                : "ذخیره و فعال‌سازی"}
            </button>
          </>
        )}
      </div>

      {deleteOpen ? (
        <div className="cos-modal-backdrop" role="presentation">
          <div className="cos-modal" role="dialog" aria-modal="true">
            <h4>حذف برنامه</h4>
            {deleteLoading ? (
              <p className="cos-muted">در حال بارگذاری…</p>
            ) : deletePreview ? (
              <ul className="cos-cal-v2__delete-summary">
                <li>
                  <strong>عنوان:</strong> {deletePreview.title}
                </li>
                <li>
                  <strong>نوع:</strong>{" "}
                  {sessionKindLabel(deletePreview.sessionKind)}
                </li>
                <li>
                  <strong>تعداد روز:</strong>{" "}
                  {toPersianDigits(String(deletePreview.dayCount))}
                </li>
                <li>
                  <strong>رزروها:</strong>{" "}
                  {toPersianDigits(String(deletePreview.reservationCount))}
                </li>
              </ul>
            ) : (
              <p className="cos-muted">اطلاعات برنامه در دسترس نیست.</p>
            )}
            <p>
              {deletePreview && deletePreview.reservationCount > 0
                ? "رزروها و سوابق حفظ می‌شوند؛ فقط رزرو جدید و نوبت‌های آزاد آینده حذف می‌شوند."
                : "این برنامه و نوبت‌های آزاد آینده آن حذف می‌شوند."}
            </p>
            <div className="cos-inline-actions">
              <button
                type="button"
                className="cos-btn"
                disabled={planRowBusy === "delete-confirm"}
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteTargetId(null);
                  setDeletePreview(null);
                }}
              >
                انصراف
              </button>
              <button
                type="button"
                className="cos-btn cos-btn--danger"
                disabled={deleteLoading || planRowBusy === "delete-confirm"}
                onClick={() => {
                  const target = deleteTargetId ?? planId;
                  if (!target) return;
                  setPlanRowBusy("delete-confirm");
                  startTransition(async () => {
                    try {
                      const fd = new FormData();
                      fd.set("planId", target);
                      setFlash(await deleteSchedulePlanV2Action({}, fd));
                      setDeleteOpen(false);
                      setDeleteTargetId(null);
                      setDeletePreview(null);
                      router.refresh();
                    } finally {
                      setPlanRowBusy(null);
                    }
                  });
                }}
              >
                {planRowBusy === "delete-confirm" ? "در حال حذف…" : "حذف برنامه"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
