"use client";

import { useState } from "react";
import type { RevisionHistoryEntry } from "@/lib/guidance/journey-v2/step-review/revision-history";
import { toPersianDigits } from "@/lib/persian";

export function CounselorRevisionHistoryPanel({
  entries,
}: {
  entries: RevisionHistoryEntry[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = entries.find((e) => e.id === openId) ?? null;

  return (
    <section className="cos-panel cos-revision-history" dir="rtl">
      <h2>تاریخچه تغییرات</h2>
      {entries.length === 0 ? (
        <p className="cos-muted">هنوز نسخه‌ای ثبت نشده است.</p>
      ) : (
        <ul className="cos-revision-history__list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="cos-btn cos-btn--sm"
                onClick={() => setOpenId(entry.id === openId ? null : entry.id)}
              >
                نسخه {toPersianDigits(entry.version)} — {entry.actionLabel} — {entry.atLabel}
              </button>
              <span className="cos-muted">
                {entry.actorName}
                {entry.reason ? ` · ${entry.reason}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {active ? (
        <div className="cos-revision-history__diff" role="dialog" aria-label="مقایسه نسخه">
          <h3>
            {active.actionLabel} — {active.atLabel} — {active.actorName}
          </h3>
          {active.diffRows.length === 0 ? (
            <p className="cos-muted">تغییر فیلدی ثبت نشده است.</p>
          ) : (
            <table className="cos-table">
              <thead>
                <tr>
                  <th>فیلد</th>
                  <th>قبل</th>
                  <th>بعد</th>
                </tr>
              </thead>
              <tbody>
                {active.diffRows.map((row) => (
                  <tr key={row.field} className="cos-diff-changed">
                    <td>{row.field}</td>
                    <td>{row.before || "—"}</td>
                    <td>{row.after || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="cos-muted">بازگردانی خودکار غیرفعال است؛ هر restore باید revision جدید با audit باشد.</p>
        </div>
      ) : null}
    </section>
  );
}
