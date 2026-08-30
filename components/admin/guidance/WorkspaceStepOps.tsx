import {
  counselorReplaceDocumentAction,
  counselorSaveNotesAction,
  counselorSetStepReviewAction,
  counselorVerifyDocumentAction,
} from "@/app/admin/(dashboard)/guidance/workspace-actions";
import type {
  WorkspaceDocumentItem,
  WorkspaceStepHistoryItem,
  WorkspaceStepReviewView,
} from "@/lib/guidance/workspace";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

export function WorkspaceStepOps({
  publicId,
  stepId,
  review,
  history,
  documents,
  canReview,
}: {
  publicId: string;
  stepId: number;
  review: WorkspaceStepReviewView;
  history: readonly WorkspaceStepHistoryItem[];
  documents: readonly WorkspaceDocumentItem[];
  canReview: boolean;
}) {
  return (
    <div className="counselor-ops">
      <section className="admin-card counselor-ops__card">
        <h2>وضعیت بررسی مرحله</h2>
        <p className="counselor-workspace__muted">
          {review.statusLabel}
          {review.approvedByName ? ` · ${review.approvedByName}` : ""}
          {review.approvedAtIso
            ? ` · ${formatJalaliDateTimeShort(new Date(review.approvedAtIso))}`
            : ""}
        </p>
        {review.rejectReason ? (
          <p className="counselor-workspace__banner" data-status="locked">
            دلیل: {review.rejectReason}
          </p>
        ) : null}

        {canReview ? (
          <form action={counselorSetStepReviewAction} className="counselor-ops__form">
            <input type="hidden" name="publicId" value={publicId} />
            <input type="hidden" name="step" value={String(stepId)} />
            <label>
              دلیل رد / اصلاح
              <textarea name="rejectReason" rows={2} defaultValue={review.rejectReason ?? ""} />
            </label>
            <label>
              یادداشت داخلی
              <textarea name="privateNote" rows={2} defaultValue={review.privateNote ?? ""} />
            </label>
            <label>
              پیام دانش‌آموز
              <textarea name="studentMessage" rows={2} defaultValue={review.studentMessage ?? ""} />
            </label>
            <div className="counselor-ops__actions">
              <button name="decision" value="APPROVED" className="counselor-btn counselor-btn--ok">
                تأیید
              </button>
              <button name="decision" value="NEEDS_REVISION" className="counselor-btn counselor-btn--warn">
                درخواست اصلاح
              </button>
              <button name="decision" value="REJECTED" className="counselor-btn counselor-btn--danger">
                رد
              </button>
            </div>
          </form>
        ) : null}
      </section>

      {canReview ? (
        <section className="admin-card counselor-ops__card">
          <h2>یادداشت‌ها</h2>
          <form action={counselorSaveNotesAction} className="counselor-ops__form">
            <input type="hidden" name="publicId" value={publicId} />
            <input type="hidden" name="step" value={String(stepId)} />
            <label>
              یادداشت داخلی (فقط مشاور)
              <textarea name="privateNote" rows={3} placeholder="فقط برای تیم مشاوره" />
            </label>
            <label>
              پیام دانش‌آموز (نمایش در پرتال)
              <textarea name="studentMessage" rows={3} placeholder="دانش‌آموز این متن را می‌بیند" />
            </label>
            <button type="submit" className="counselor-btn counselor-btn--primary">
              ثبت یادداشت
            </button>
          </form>
          {review.privateNote ? (
            <p className="counselor-workspace__muted">آخرین یادداشت داخلی: {review.privateNote}</p>
          ) : null}
          {review.studentMessage ? (
            <p className="counselor-workspace__muted">آخرین پیام دانش‌آموز: {review.studentMessage}</p>
          ) : null}
        </section>
      ) : null}

      {documents.length > 0 ? (
        <section className="admin-card counselor-ops__card">
          <h2>مدارک</h2>
          {documents.map((doc) => (
            <article key={doc.id} className="counselor-ops__doc">
              <p>
                <strong>
                  {doc.documentTypeLabel} · {doc.filename}
                </strong>
              </p>
              <p className="counselor-workspace__muted">
                نسخه {toPersianDigits(doc.versionNumber)} · {doc.verificationLabel}
              </p>
              <iframe
                title={doc.filename}
                src={doc.downloadHref}
                className="counselor-ops__preview"
              />
              <p>
                <a href={doc.downloadHref} className="counselor-case__link">
                  دانلود / پیش‌نمایش
                </a>
              </p>
              {canReview ? (
                <form action={counselorVerifyDocumentAction} className="counselor-ops__actions">
                  <input type="hidden" name="publicId" value={publicId} />
                  <input type="hidden" name="documentId" value={doc.id} />
                  <input type="text" name="note" placeholder="یادداشت مدرک" />
                  <button name="decision" value="VERIFIED" className="counselor-btn counselor-btn--ok">
                    تأیید مدرک
                  </button>
                  <button name="decision" value="REJECTED" className="counselor-btn counselor-btn--danger">
                    رد مدرک
                  </button>
                </form>
              ) : null}
            </article>
          ))}
          {canReview ? (
            <form
              action={counselorReplaceDocumentAction}
              encType="multipart/form-data"
              className="counselor-ops__form"
            >
              <input type="hidden" name="publicId" value={publicId} />
              <input
                type="hidden"
                name="documentType"
                value={stepId === 5 ? "EXAM_RESULT" : "FINAL_GRADES"}
              />
              <label>
                جایگزینی فایل
                <input type="file" name="file" accept="application/pdf,image/*" />
              </label>
              <label>
                دلیل
                <input type="text" name="reason" required placeholder="دلیل جایگزینی" />
              </label>
              <button type="submit" className="counselor-btn counselor-btn--primary">
                بارگذاری نسخه جدید
              </button>
            </form>
          ) : null}
        </section>
      ) : canReview && (stepId === 1 || stepId === 5) ? (
        <section className="admin-card counselor-ops__card">
          <h2>بارگذاری مدرک</h2>
          <form
            action={counselorReplaceDocumentAction}
            encType="multipart/form-data"
            className="counselor-ops__form"
          >
            <input type="hidden" name="publicId" value={publicId} />
            <input
              type="hidden"
              name="documentType"
              value={stepId === 5 ? "EXAM_RESULT" : "FINAL_GRADES"}
            />
            <input type="file" name="file" accept="application/pdf,image/*" />
            <input type="text" name="reason" required placeholder="دلیل بارگذاری" />
            <button type="submit" className="counselor-btn counselor-btn--primary">
              بارگذاری
            </button>
          </form>
        </section>
      ) : null}

      <section className="admin-card counselor-ops__card" id="history">
        <h2>تاریخچه بازبینی</h2>
        {history.length === 0 ? (
          <p className="counselor-workspace__muted">هنوز رویدادی نیست.</p>
        ) : (
          <ol className="counselor-workspace__audit">
            {history.map((item) => (
              <li key={item.id}>
                <strong>{item.summary}</strong>
                <span>
                  {item.actorName} · {formatJalaliDateTimeShort(new Date(item.atIso))}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
