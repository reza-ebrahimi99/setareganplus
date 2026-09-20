"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  confirmCounselorAppointmentAction,
  legacyResolveAction,
  proposeAlternativeAction,
  rejectCounselorAppointmentAction,
  staffBookSlotAction,
} from "@/app/admin/counselor/appointment-actions";
import type { AppointmentsHubModel, HubTimelineBlock } from "@/lib/counselor-os/appointments-hub";
import type { CounselorAppointmentView } from "@/lib/counselor-os/appointments";
import { toPersianDigits } from "@/lib/persian";

type Props = {
  model: AppointmentsHubModel;
  canViewMobile: boolean;
  canManageAll: boolean;
};

function qsUpdate(
  base: URLSearchParams,
  patch: Record<string, string | null | undefined>,
) {
  const next = new URLSearchParams(base.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === "") next.delete(k);
    else next.set(k, v);
  }
  return next.toString();
}

function Drawer({
  block,
  onClose,
}: {
  block: HubTimelineBlock | null;
  onClose: () => void;
}) {
  if (!block) return null;
  return (
    <div className="cos-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="cos-drawer"
        role="dialog"
        aria-label="خلاصه جلسه"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h3>{block.title}</h3>
          <button type="button" className="cos-btn cos-btn--ghost" onClick={onClose}>
            بستن
          </button>
        </header>
        <p>
          {block.startLabel}–{block.endLabel} · {block.statusLabel}
        </p>
        {block.stepLabel ? <p className="cos-muted">مرحله: {block.stepLabel}</p> : null}
        <div className="cos-inline-actions">
          {block.studentId ? (
            <Link href={`/admin/counselor/students/${block.studentId}`} className="cos-btn">
              ورود به پرونده
            </Link>
          ) : null}
          {block.appointmentId ? (
            <>
              <Link
                href={`/admin/counselor/appointments/${block.appointmentId}`}
                className="cos-btn cos-btn--ghost"
              >
                جزئیات
              </Link>
              <Link
                href={`/admin/counselor/appointments/${block.appointmentId}/print`}
                className="cos-link"
                target="_blank"
              >
                چاپ برگه
              </Link>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function CounselorAppointmentsHub({ model, canViewMobile, canManageAll }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [drawerBlock, setDrawerBlock] = useState<HubTimelineBlock | null>(null);
  const [bookSlotId, setBookSlotId] = useState<string | null>(null);
  const [bookStudentId, setBookStudentId] = useState("");

  const dateKey = `${model.filters.jy}-${model.filters.jm}-${model.filters.jd}`;

  const pushFilters = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      router.push(`/admin/counselor/appointments?${qsUpdate(sp, patch)}`);
    },
    [router, sp],
  );

  const onDone = (msg: string) => {
    setToast(msg);
    router.refresh();
  };

  const bounds = model.bounds ?? { startMin: 8 * 60, endMin: 20 * 60 };
  const span = Math.max(bounds.endMin - bounds.startMin, 60);

  const positioned = useMemo(
    () =>
      model.timelineBlocks.map((b) => ({
        ...b,
        topPct: ((b.start - bounds.startMin) / span) * 100,
        heightPct: Math.max(((b.end - b.start) / span) * 100, 2),
      })),
    [model.timelineBlocks, bounds, span],
  );

  const nowLine =
    model.nowMinutes >= bounds.startMin && model.nowMinutes <= bounds.endMin
      ? ((model.nowMinutes - bounds.startMin) / span) * 100
      : null;

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>جلسات مشاوره</h1>
          <p>
            {model.weekdayLabel} · {model.dateLabel}
          </p>
        </div>
        <Link
          href={`/admin/counselor/appointments/print?${sp.toString()}`}
          className="cos-btn cos-btn--ghost"
          target="_blank"
        >
          چاپ برنامه
        </Link>
      </header>

      {toast ? <p className="cos-banner cos-banner--ok">{toast}</p> : null}

      <section className="cos-panel cos-hub-toolbar">
        <div className="cos-hub-toolbar__row">
          <button type="button" className="cos-btn cos-btn--ghost" onClick={() => pushFilters({ date: null })}>
            امروز
          </button>
          <button
            type="button"
            className="cos-btn cos-btn--ghost"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              const j = model.filters;
              pushFilters({ date: `${j.jy}-${j.jm}-${j.jd - 1}` });
            }}
          >
            روز قبل
          </button>
          <button
            type="button"
            className="cos-btn cos-btn--ghost"
            onClick={() => {
              const j = model.filters;
              pushFilters({ date: `${j.jy}-${j.jm}-${j.jd + 1}` });
            }}
          >
            روز بعد
          </button>
          <span className="cos-muted">تاریخ: {toPersianDigits(dateKey)}</span>
        </div>
        <div className="cos-hub-toolbar__row">
          {canManageAll ? (
            <select
              value={model.filters.advisorId ?? ""}
              onChange={(e) =>
                pushFilters({
                  advisorId: e.target.value || null,
                  counselorUserId: model.advisors.find((a) => a.id === e.target.value)?.userId ?? null,
                })
              }
            >
              <option value="">انتخاب مشاور</option>
              {model.advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName}
                </option>
              ))}
            </select>
          ) : null}
          <select
            value={model.filters.view}
            onChange={(e) => pushFilters({ view: e.target.value })}
          >
            <option value="day">روزانه</option>
            <option value="week">هفتگی</option>
            <option value="list">فهرست</option>
          </select>
          <select
            value={model.filters.bucket}
            onChange={(e) => pushFilters({ bucket: e.target.value })}
          >
            <option value="all">همه</option>
            <option value="action">نیازمند اقدام</option>
          </select>
          <input
            type="search"
            placeholder="جست‌وجوی دانش‌آموز"
            defaultValue={model.filters.q ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                pushFilters({ q: (e.target as HTMLInputElement).value || null });
              }
            }}
          />
        </div>
      </section>

      {model.legacy.length > 0 ? (
        <section className="cos-panel cos-panel--warn">
          <h2>جلسات قدیمی نیازمند تعیین وضعیت</h2>
          <ul className="cos-pending-list">
            {model.legacy.map((item) => (
              <li key={item.id} className="cos-pending-card">
                <strong>{item.studentName}</strong>
                <span>{item.whenLabel}</span>
                <div className="cos-pending-card__actions">
                  <button
                    type="button"
                    className="cos-btn cos-btn--primary"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await legacyResolveAction(item.id, "confirm");
                        onDone(r.success ?? r.error ?? "");
                      })
                    }
                  >
                    تأیید به‌عنوان جلسه قطعی
                  </button>
                  <button
                    type="button"
                    className="cos-btn"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await legacyResolveAction(item.id, "revert");
                        onDone(r.success ?? r.error ?? "");
                      })
                    }
                  >
                    بازگرداندن به انتظار تأیید
                  </button>
                  <button
                    type="button"
                    className="cos-btn cos-btn--ghost"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await legacyResolveAction(item.id, "cancel", "تعیین وضعیت legacy");
                        onDone(r.success ?? r.error ?? "");
                      })
                    }
                  >
                    لغو با ثبت علت
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="cos-panel cos-panel--highlight">
        <h2>
          درخواست‌های منتظر تأیید{" "}
          <span className="cos-badge">{toPersianDigits(String(model.pending.length))}</span>
        </h2>
        {model.pending.length === 0 ? (
          <p className="cos-empty">درخواست جدیدی در صف نیست.</p>
        ) : (
          <ul className="cos-pending-list">
            {model.pending.map((item) => (
              <PendingRow
                key={item.id}
                item={item}
                canViewMobile={canViewMobile}
                disabled={pending}
                onConfirm={() =>
                  start(async () => {
                    const r = await confirmCounselorAppointmentAction(item.id);
                    onDone(r.success ?? r.error ?? "");
                  })
                }
                onReject={(reason) =>
                  start(async () => {
                    const r = await rejectCounselorAppointmentAction(item.id, reason);
                    onDone(r.success ?? r.error ?? "");
                  })
                }
                onPropose={(slotId) =>
                  start(async () => {
                    const r = await proposeAlternativeAction(item.id, slotId);
                    onDone(r.success ?? r.error ?? "");
                  })
                }
              />
            ))}
          </ul>
        )}
      </section>

      {model.filters.view === "list" ? (
        <section className="cos-panel">
          <h2>فهرست جلسات</h2>
          <ul className="cos-appointment-list">
            {model.listItems.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/counselor/appointments/${a.id}`}>
                  <strong>{a.studentName}</strong>
                </Link>
                <span>{a.whenLabel}</span>
                <em>{a.statusLabel}</em>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="cos-panel">
          <h2>برنامه {model.filters.view === "week" ? "هفتگی (خلاصه روز)" : "روزانه"}</h2>
          {model.filters.view === "day" ? (
            <div className="cos-day-grid" style={{ ["--span-min" as string]: String(span) }}>
              <div className="cos-day-grid__axis">
                {Array.from({ length: Math.ceil(span / 60) + 1 }, (_, i) => {
                  const m = bounds.startMin + i * 60;
                  return (
                    <span key={m} style={{ top: `${(i * 60) / span * 100}%` }}>
                      {toPersianDigits(`${String(Math.floor(m / 60)).padStart(2, "0")}:00`)}
                    </span>
                  );
                })}
              </div>
              <div className="cos-day-grid__canvas">
                {nowLine != null ? (
                  <div className="cos-day-grid__now" style={{ top: `${nowLine}%` }} />
                ) : null}
                {positioned.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`cos-day-block cos-day-block--${b.kind}`}
                    style={{ top: `${b.topPct}%`, height: `${b.heightPct}%` }}
                    disabled={!b.clickable && b.kind !== "pending" && b.kind !== "confirmed"}
                    onClick={() => {
                      if (b.kind === "open_slot" && b.slotId) {
                        setBookSlotId(b.slotId);
                        return;
                      }
                      setDrawerBlock(b);
                    }}
                  >
                    <span>{b.startLabel}–{b.endLabel}</span>
                    <strong>{b.title}</strong>
                    <em>{b.statusLabel}</em>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="cos-week-grid">
              {model.weekColumns.map((col) => (
                <div key={col.dateKey} className="cos-week-col">
                  <h3>
                    {col.weekdayLabel}
                    <span>{toPersianDigits(col.dateKey)}</span>
                  </h3>
                  <ul>
                    {col.items.length === 0 ? (
                      <li className="cos-muted">—</li>
                    ) : (
                      col.items.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            className="cos-week-block"
                            onClick={() =>
                              setDrawerBlock({
                                id: a.id,
                                kind: a.needsConfirmation ? "pending" : "confirmed",
                                start: 0,
                                end: 0,
                                title: a.studentName,
                                subtitle: a.purposeLabel,
                                appointmentId: a.id,
                                slotId: null,
                                studentId: a.studentId,
                                clickable: true,
                                startLabel: a.timeRangeLabel.split("–")[0] ?? "",
                                endLabel: a.timeRangeLabel.split("–")[1] ?? "",
                                statusLabel: a.statusLabel,
                                stepLabel: null,
                              })
                            }
                          >
                            {a.timeRangeLabel} · {a.studentName}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {bookSlotId ? (
        <div className="cos-modal-inline cos-panel">
          <h3>رزرو مدیریتی نوبت آزاد</h3>
          <label>
            شناسه دانش‌آموز
            <input value={bookStudentId} onChange={(e) => setBookStudentId(e.target.value)} />
          </label>
          <button
            type="button"
            className="cos-btn"
            disabled={pending || !bookStudentId.trim()}
            onClick={() =>
              start(async () => {
                const r = await staffBookSlotAction(bookSlotId, bookStudentId.trim());
                setBookSlotId(null);
                onDone(r.success ?? r.error ?? "");
              })
            }
          >
            ثبت رزرو
          </button>
          <button type="button" className="cos-btn cos-btn--ghost" onClick={() => setBookSlotId(null)}>
            انصراف
          </button>
        </div>
      ) : null}

      <Drawer block={drawerBlock} onClose={() => setDrawerBlock(null)} />
    </div>
  );
}

function PendingRow(props: {
  item: CounselorAppointmentView;
  canViewMobile: boolean;
  disabled: boolean;
  onConfirm: () => void;
  onReject: (reason: string) => void;
  onPropose: (slotId: string) => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [altSlot, setAltSlot] = useState("");
  return (
    <li className="cos-pending-card">
      <Link href={`/admin/counselor/students/${props.item.studentId}`}>
        <strong>{props.item.studentName}</strong>
      </Link>
      <span>{props.item.whenLabel}</span>
      {props.canViewMobile && props.item.studentMobile ? (
        <a href={`tel:${props.item.studentMobile}`}>{props.item.studentMobile}</a>
      ) : null}
      <div className="cos-pending-card__actions">
        <button type="button" className="cos-btn cos-btn--primary" disabled={props.disabled} onClick={props.onConfirm}>
          تأیید
        </button>
        <button type="button" className="cos-btn cos-btn--ghost" disabled={props.disabled} onClick={() => setRejectOpen(true)}>
          رد
        </button>
        <Link href={`/admin/counselor/appointments/${props.item.id}`} className="cos-link">
          جزئیات
        </Link>
      </div>
      {rejectOpen ? (
        <div className="cos-modal-inline">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="علت رد" />
          <button type="button" className="cos-btn" disabled={props.disabled} onClick={() => props.onReject(reason)}>
            ثبت رد
          </button>
        </div>
      ) : null}
      <div className="cos-modal-inline">
        <input
          placeholder="شناسه slot جایگزین"
          value={altSlot}
          onChange={(e) => setAltSlot(e.target.value)}
        />
        <button
          type="button"
          className="cos-btn cos-btn--ghost"
          disabled={props.disabled || !altSlot.trim()}
          onClick={() => props.onPropose(altSlot.trim())}
        >
          پیشنهاد زمان جایگزین
        </button>
      </div>
    </li>
  );
}
