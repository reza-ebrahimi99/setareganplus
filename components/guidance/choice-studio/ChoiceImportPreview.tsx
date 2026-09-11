import type { ChoiceImportPreview as Preview } from "@/lib/guidance/choice-studio/types";
import { labelChoiceBand } from "@/lib/guidance/journey-v2/labels";
import { toPersianDigits } from "@/lib/persian";

export function ChoiceImportPreview(props: {
  preview: Preview;
  onCommit: () => void;
  pending: boolean;
  replaceReady: boolean;
}) {
  const { preview } = props;
  return (
    <section className="gcs-preview">
      <div className="gcs-summary">
        <article>
          <span>انتخاب شناسایی‌شده</span>
          <strong>{toPersianDigits(preview.totalRows)}</strong>
        </article>
        <article>
          <span>ردیف معتبر</span>
          <strong>{toPersianDigits(preview.validRows)}</strong>
        </article>
        <article>
          <span>نیازمند بررسی</span>
          <strong>{toPersianDigits(preview.errorRows + preview.warningRows)}</strong>
        </article>
        <article>
          <span>سقف سنجش</span>
          <strong>{preview.exceedsSanjeshLimit ? "بیش از ۱۵۰" : toPersianDigits(preview.activeSanjeshCount)}</strong>
        </article>
      </div>

      {preview.issues.length > 0 ? (
        <ul className="gcs-issues">
          {preview.issues.slice(0, 12).map((issue, index) => (
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
            {preview.rows.map((row) => (
              <tr key={row.sourceRow}>
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
          {preview.rows.map((row) => (
            <li key={`m-${row.sourceRow}`}>
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
    </section>
  );
}
