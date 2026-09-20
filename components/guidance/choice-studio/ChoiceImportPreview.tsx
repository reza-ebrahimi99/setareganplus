import { useMemo } from "react";
import type { ChoiceImportPreview as Preview } from "@/lib/guidance/choice-studio/types";
import {
  CHOICE_DRAFT_ACTIVE_LIMIT,
  formatOverLimitBlockMessage,
  sortPreviewRowsByPriority,
} from "@/lib/guidance/choice-studio/preview-limits";
import { labelChoiceBand } from "@/lib/guidance/journey-v2/labels";
import { toPersianDigits } from "@/lib/persian";

export function ChoiceImportPreview(props: {
  preview: Preview;
  draftActiveCount: number;
  onCommit: () => void;
  onCommitFirst150: () => void;
  pending: boolean;
  replaceReady: boolean;
  importTimedOut?: boolean;
}) {
  const { preview } = props;
  const ordered = useMemo(() => sortPreviewRowsByPriority(preview.rows), [preview.rows]);

  return (
    <section className="gcs-preview" id="gcs-import-preview">
      <div className="gcs-preview__counters">
        <article className="gcs-preview__counter gcs-preview__counter--import">
          <span>پیش‌نمایش وارداتی</span>
          <strong>{toPersianDigits(preview.totalRows)} انتخاب</strong>
          <small>هنوز در پیش‌نویس ذخیره نشده است.</small>
        </article>
        <article className="gcs-preview__counter gcs-preview__counter--draft">
          <span>پیش‌نویس فعلی</span>
          <strong>{toPersianDigits(props.draftActiveCount)} انتخاب</strong>
          <small>فهرست ذخیره‌شده در استودیو (پایین صفحه).</small>
        </article>
      </div>

      <p className="gcs-preview__explain">
        با «ذخیره پیش‌نویس از پیش‌نمایش»، ردیف‌های پیش‌نمایش جایگزین پیش‌نویس فعلی می‌شوند (تا سقف{" "}
        {toPersianDigits(String(CHOICE_DRAFT_ACTIVE_LIMIT))} انتخاب). هیچ ردیفی بدون تأیید شما حذف
        نمی‌شود.
      </p>

      <div className="gcs-summary">
        <article>
          <span>ردیف معتبر</span>
          <strong>{toPersianDigits(preview.validRows)}</strong>
        </article>
        <article>
          <span>نیازمند بررسی</span>
          <strong>{toPersianDigits(preview.errorRows + preview.warningRows)}</strong>
        </article>
        <article>
          <span>سقف پیش‌نویس</span>
          <strong>
            {preview.exceedsSanjeshLimit
              ? `+${toPersianDigits(String(preview.overLimitCount))} اضافه`
              : toPersianDigits(String(preview.activeSanjeshCount))}
          </strong>
        </article>
      </div>

      {preview.exceedsSanjeshLimit ? (
        <div className="gcs-preview__limit-alert" role="alert">
          <p>{formatOverLimitBlockMessage(preview.totalRows)}</p>
          <a className="gcs-btn gcs-btn--ghost" href="#gcs-import-row-150">
            رفتن به انتخاب‌های اضافی
          </a>
        </div>
      ) : null}

      {preview.duplicateCodes.length > 0 ? (
        <p className="gcs-preview__dupes" role="status">
          کدهای تکراری: {preview.duplicateCodes.slice(0, 12).join("، ")}
          {preview.duplicateCodes.length > 12 ? " …" : ""}
        </p>
      ) : null}

      {props.importTimedOut ? (
        <p className="gcs-error" role="alert">
          پاسخ سرور در زمان معقول دریافت نشد. صفحه را یک‌بار Refresh کنید و پیش‌نویس فعلی را بررسی
          کنید؛ در صورت موفقیت قبلی، دوباره import نکنید.
        </p>
      ) : null}

      {preview.issues.length > 0 ? (
        <ul className="gcs-issues">
          {preview.issues.slice(0, 16).map((issue, index) => (
            <li key={`${issue.code}-${index}`} data-level={issue.level}>
              {issue.level === "error" ? "خطا" : "هشدار"}
              {issue.rowNumber ? ` · ردیف ${toPersianDigits(issue.rowNumber)}` : ""}
              {" — "}
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="gcs-table-wrap">
        <table className="gcs-table">
          <thead>
            <tr>
              <th>اولویت</th>
              <th>کد رشته</th>
              <th>رشته</th>
              <th>دانشگاه</th>
              <th>شهر</th>
              <th>دوره</th>
              <th>شانس</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((row, index) => (
              <tr
                key={row.sourceRow}
                id={index === CHOICE_DRAFT_ACTIVE_LIMIT ? "gcs-import-row-150" : undefined}
                className={index >= CHOICE_DRAFT_ACTIVE_LIMIT ? "gcs-row--over-limit" : undefined}
              >
                <td>{row.priority != null ? toPersianDigits(row.priority) : "—"}</td>
                <td className="gcs-code">{row.code || "—"}</td>
                <td>{row.major || "—"}</td>
                <td>{row.university || "—"}</td>
                <td>{row.city || "—"}</td>
                <td>{row.course || "—"}</td>
                <td>{row.chance ? labelChoiceBand(row.chance) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ol className="gcs-cards">
          {ordered.map((row, index) => (
            <li
              key={`m-${row.sourceRow}`}
              id={
                index === CHOICE_DRAFT_ACTIVE_LIMIT ? "gcs-import-row-150-mobile" : undefined
              }
              className={index >= CHOICE_DRAFT_ACTIVE_LIMIT ? "gcs-row--over-limit" : undefined}
            >
              <em>{row.priority != null ? toPersianDigits(row.priority) : "—"}</em>
              <strong>{row.code || "بدون کد"}</strong>
              <span>
                {row.major} · {row.university}
              </span>
              <small>
                {[row.city, row.course, row.chance ? labelChoiceBand(row.chance) : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </small>
            </li>
          ))}
        </ol>
      </div>

      <div className="gcs-preview__actions">
        <button
          type="button"
          className="gcs-btn gcs-btn--primary"
          disabled={!preview.canCommit || props.pending}
          onClick={props.onCommit}
        >
          {props.pending
            ? "در حال ذخیره…"
            : props.replaceReady
              ? "ساخت نسخه جدید از این پیش‌نمایش"
              : "ذخیره پیش‌نویس از پیش‌نمایش"}
        </button>
        {preview.exceedsSanjeshLimit ? (
          <button
            type="button"
            className="gcs-btn gcs-btn--ghost"
            disabled={props.pending || preview.errorRows > 0}
            onClick={props.onCommitFirst150}
          >
            انتقال {toPersianDigits(String(CHOICE_DRAFT_ACTIVE_LIMIT))} انتخاب اول به پیش‌نویس…
          </button>
        ) : null}
      </div>
    </section>
  );
}
