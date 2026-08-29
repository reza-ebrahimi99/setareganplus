"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CounselorReviewStatus } from "@/lib/guidance/counselor/types";
import { COUNSELOR_REVIEW_STATUSES } from "@/lib/guidance/counselor/types";

type ActionResult = { ok: true } | { ok: false; error: string };

type CounselorCaseActionsProps = {
  publicId: string;
  documentId: string | null;
  currentStatus: CounselorReviewStatus;
  addNote: (input: {
    publicId: string;
    body: string;
  }) => Promise<ActionResult>;
  requestCorrection: (input: {
    publicId: string;
    message: string;
  }) => Promise<ActionResult>;
  setStatus: (input: {
    publicId: string;
    status: CounselorReviewStatus;
  }) => Promise<ActionResult>;
  verifyTranscript: (input: {
    publicId: string;
    documentId: string;
    decision: "VERIFIED" | "REJECTED";
  }) => Promise<ActionResult>;
};

const STATUS_LABELS: Record<CounselorReviewStatus, string> = {
  awaiting_review: "در انتظار بررسی",
  in_review: "در حال بررسی",
  needs_correction: "نیاز به اصلاح",
  ready_for_session: "آماده جلسه",
};

export function CounselorCaseActions({
  publicId,
  documentId,
  currentStatus,
  addNote,
  requestCorrection,
  setStatus,
  verifyTranscript,
}: CounselorCaseActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [correction, setCorrection] = useState("");

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNote("");
      setCorrection("");
      router.refresh();
    });
  }

  return (
    <section className="admin-card counselor-case__actions">
      <h2>اقدام‌های مشاور</h2>
      {error ? (
        <p className="counselor-case__error" role="alert">
          {error}
        </p>
      ) : null}

      {documentId ? (
        <div className="counselor-case__action-block">
          <p className="counselor-case__action-label">تأیید کارنامه</p>
          <div className="counselor-case__status-row">
            <button
              type="button"
              className="counselor-btn counselor-btn--ok"
              disabled={pending}
              onClick={() =>
                run(() =>
                  verifyTranscript({
                    publicId,
                    documentId,
                    decision: "VERIFIED",
                  }),
                )
              }
            >
              تأیید کارنامه
            </button>
            <button
              type="button"
              className="counselor-btn counselor-btn--warn"
              disabled={pending}
              onClick={() =>
                run(() =>
                  verifyTranscript({
                    publicId,
                    documentId,
                    decision: "REJECTED",
                  }),
                )
              }
            >
              رد کارنامه
            </button>
          </div>
        </div>
      ) : null}

      <div className="counselor-case__action-block">
        <label htmlFor="counselor-note">یادداشت</label>
        <textarea
          id="counselor-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="یادداشت داخلی درباره پرونده…"
        />
        <button
          type="button"
          className="counselor-btn counselor-btn--primary"
          disabled={pending || note.trim().length < 2}
          onClick={() => run(() => addNote({ publicId, body: note }))}
        >
          افزودن یادداشت
        </button>
      </div>

      <div className="counselor-case__action-block">
        <label htmlFor="counselor-correction">درخواست اصلاح</label>
        <textarea
          id="counselor-correction"
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          rows={2}
          placeholder="چه چیزی باید اصلاح شود؟"
        />
        <button
          type="button"
          className="counselor-btn counselor-btn--warn"
          disabled={pending || correction.trim().length < 2}
          onClick={() =>
            run(() =>
              requestCorrection({ publicId, message: correction }),
            )
          }
        >
          ثبت درخواست اصلاح
        </button>
      </div>

      <div className="counselor-case__action-block">
        <label htmlFor="counselor-status">وضعیت بررسی</label>
        <div className="counselor-case__status-row">
          <select
            id="counselor-status"
            defaultValue={currentStatus}
            disabled={pending}
            onChange={(e) => {
              const status = e.target.value as CounselorReviewStatus;
              run(() => setStatus({ publicId, status }));
            }}
          >
            {COUNSELOR_REVIEW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="counselor-btn counselor-btn--ok"
            disabled={pending}
            onClick={() =>
              run(() =>
                setStatus({ publicId, status: "ready_for_session" }),
              )
            }
          >
            علامت‌گذاری آماده جلسه
          </button>
        </div>
      </div>
    </section>
  );
}
