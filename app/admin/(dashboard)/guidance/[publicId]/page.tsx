import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addCounselorNoteAction,
  requestCounselorCorrectionAction,
  setCounselorReviewStatusAction,
  verifyGuidanceTranscriptAction,
} from "@/app/admin/(dashboard)/guidance/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CounselorCaseActions } from "@/components/admin/guidance/CounselorCaseActions";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { formatJalaliDateShort, formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadCounselorCasePresentation } from "@/lib/guidance/counselor";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ publicId: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  return { title: `پرونده ${publicId.slice(0, 8)}` };
}

export default async function AdminGuidanceCasePage({ params }: PageProps) {
  const session = await requirePermission("guidance.view");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) notFound();

  const { publicId } = await params;
  const canReview = hasPermission(session, "guidance.review");
  const model = await loadCounselorCasePresentation({
    organizationId: session.organization.id,
    publicId,
    canReview,
  });
  if (!model) notFound();

  return (
    <div className="counselor-case">
      <AdminPageHeader
        title={model.studentName}
        description={`پرونده ${model.publicId} · ${model.examGroupLabel} · ${model.reviewStatusLabel}`}
        breadcrumbs={[
          ...adminBreadcrumbs.guidance,
          { label: model.studentName },
        ]}
      />

      <div className="counselor-case__grid">
        <section className="admin-card counselor-case__panel">
          <h2>خلاصه پرونده</h2>
          <dl className="counselor-case__dl">
            <div>
              <dt>پایه</dt>
              <dd>{model.gradeName ?? "—"}</dd>
            </div>
            <div>
              <dt>سال تحصیلی</dt>
              <dd>{model.schoolYear ?? "—"}</dd>
            </div>
            <div>
              <dt>گروه آزمایشی</dt>
              <dd>{model.examGroupLabel}</dd>
            </div>
            <div>
              <dt>وضعیت بررسی</dt>
              <dd>{model.reviewStatusLabel}</dd>
            </div>
          </dl>
        </section>

        <section className="admin-card counselor-case__panel">
          <h2>کارنامه</h2>
          <p>{model.transcript.filename ?? "فایلی نیست"}</p>
          <p className="counselor-case__muted">
            {model.transcript.verificationLabel}
            {model.transcript.versionNumber
              ? ` · نسخه ${toPersianDigits(model.transcript.versionNumber)}`
              : ""}
            {model.transcript.createdAtIso
              ? ` · ${formatJalaliDateShort(new Date(model.transcript.createdAtIso))}`
              : ""}
          </p>
          {model.transcript.downloadHref ? (
            <a
              href={model.transcript.downloadHref}
              className="counselor-case__link"
            >
              مشاهده / دانلود کارنامه
            </a>
          ) : null}
        </section>

        <section className="admin-card counselor-case__panel">
          <h2>تحلیل اولیه</h2>
          <p>
            <strong>{model.analysis.pipelineLabel}</strong>
          </p>
          <p className="counselor-case__muted">{model.analysis.summary}</p>
        </section>

        <section className="admin-card counselor-case__panel">
          <h2>آزمون رغبت</h2>
          <p>{model.interest.statusLabel}</p>
          <p className="counselor-case__muted">
            {toPersianDigits(model.interest.answeredCount)} از{" "}
            {toPersianDigits(model.interest.totalQuestions)} پاسخ
          </p>
        </section>

        <section className="admin-card counselor-case__panel">
          <h2>پروفایل ۳۶۰</h2>
          <p>{model.profile.statusLabel}</p>
          <p className="counselor-case__muted">
            تکمیل {toPersianDigits(model.profile.completionPercent)}٪ · سلامت:{" "}
            {model.profile.healthLabel}
          </p>
        </section>

        <section className="admin-card counselor-case__panel counselor-case__panel--wide">
          <h2>خط زمان داخلی</h2>
          <ol className="counselor-case__timeline">
            {model.timeline.map((step) => (
              <li key={step.id} data-state={step.state}>
                <strong>{step.label}</strong>
                <span>{step.state}</span>
                {step.atIso ? (
                  <em>{formatJalaliDateTimeShort(new Date(step.atIso))}</em>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="admin-card counselor-case__panel">
          <h2>یادداشت‌های مشاور</h2>
          {model.notes.length === 0 ? (
            <p className="counselor-case__muted">هنوز یادداشتی نیست.</p>
          ) : (
            <ul className="counselor-case__notes">
              {model.notes.map((note) => (
                <li key={note.id}>
                  <strong>{note.authorName}</strong>
                  <span>
                    {formatJalaliDateTimeShort(new Date(note.createdAtIso))}
                  </span>
                  <p>{note.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card counselor-case__panel">
          <h2>گزارش فعالیت</h2>
          {model.activity.length === 0 ? (
            <p className="counselor-case__muted">فعالیتی ثبت نشده.</p>
          ) : (
            <ul className="counselor-case__activity">
              {model.activity.map((item) => (
                <li key={item.id}>
                  <strong>{item.summary}</strong>
                  <span>
                    {item.actorName} ·{" "}
                    {formatJalaliDateTimeShort(new Date(item.atIso))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {canReview ? (
        <CounselorCaseActions
          publicId={model.publicId}
          documentId={model.transcript.documentId}
          currentStatus={model.reviewStatus}
          addNote={addCounselorNoteAction}
          requestCorrection={requestCounselorCorrectionAction}
          setStatus={setCounselorReviewStatusAction}
          verifyTranscript={verifyGuidanceTranscriptAction}
        />
      ) : null}

      <p className="counselor-case__back">
        <Link href="/admin/guidance">بازگشت به صف بررسی</Link>
      </p>
    </div>
  );
}
