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
import { WorkspaceJourneyRail } from "@/components/admin/guidance/WorkspaceJourneyRail";
import { GuidanceInterestResultsView } from "@/components/guidance/steps/step2/GuidanceInterestResultsView";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { formatJalaliDateShort, formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadCounselorCasePresentation } from "@/lib/guidance/counselor";
import { loadWorkspaceDossier } from "@/lib/guidance/workspace";
import { loadGuidanceStep2ResultForCounselor } from "@/lib/guidance/journey/steps/step2-interest-assessment";
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
  const [model, dossier] = await Promise.all([
    loadCounselorCasePresentation({
      organizationId: session.organization.id,
      publicId,
      canReview,
    }),
    loadWorkspaceDossier({
      organizationId: session.organization.id,
      publicId,
      canReview,
    }),
  ]);
  if (!model || !dossier) notFound();

  const journeyInterestResult = await loadGuidanceStep2ResultForCounselor({
    organizationId: session.organization.id,
    planPublicId: publicId,
  });

  return (
    <div className="counselor-workspace counselor-case">
      <AdminPageHeader
        title={model.studentName}
        description={`پرونده ${model.publicId} · ${model.examGroupLabel} · ${model.reviewStatusLabel}`}
        breadcrumbs={[
          ...adminBreadcrumbs.guidance,
          { label: model.studentName },
        ]}
      />

      <p className="counselor-workspace__phase-note">
        میز کار عملیاتی: مشاهده، ویرایش، تأیید/رد هر مرحله، مدارک و خط زمان.
      </p>
      <p className="counselor-ops__toolbar">
        <Link href={`/admin/guidance/${model.publicId}/export/summary`}>خلاصه PDF</Link>
        <Link href={`/admin/guidance/${model.publicId}/export/journey`}>گزارش سفر</Link>
        <Link href={`/admin/guidance/${model.publicId}/export/notes`}>یادداشت‌ها</Link>
        <Link href={`/admin/guidance/${model.publicId}/export.xlsx`}>خروجی Excel</Link>
      </p>

      <section className="admin-card counselor-workspace__strip">
        <dl>
          <div>
            <dt>مرحله فعال</dt>
            <dd>
              {toPersianDigits(dossier.currentStep)} — {dossier.currentStepTitle}
            </dd>
          </div>
          <div>
            <dt>تکمیل سفر</dt>
            <dd>{toPersianDigits(dossier.completionPercentage)}٪</dd>
          </div>
          <div>
            <dt>بسته</dt>
            <dd>
              {dossier.packageTitle ?? "—"}
              {dossier.paidAtIso ? " · پرداخت شده" : ""}
            </dd>
          </div>
          <div>
            <dt>سهمیه / معدل</dt>
            <dd>
              {dossier.quotaLabel ?? "—"}
              {dossier.highSchoolAverage != null
                ? ` · ${toPersianDigits(dossier.highSchoolAverage)}`
                : ""}
            </dd>
          </div>
        </dl>
        <div
          className="counselor-workspace__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={dossier.completionPercentage}
        >
          <span style={{ width: `${dossier.completionPercentage}%` }} />
        </div>
      </section>

      <section className="admin-card counselor-workspace__rail-panel">
        <h2>سفر ۱۲ مرحله‌ای</h2>
        <p className="counselor-workspace__muted">
          روی هر مرحله بزن تا اطلاعات ثبت‌شده را ببینی. قفل بودن مرحله فقط برای دانش‌آموز است.
        </p>
        <WorkspaceJourneyRail
          steps={dossier.steps}
          activeStepId={dossier.currentStep}
        />
      </section>

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

        {journeyInterestResult ? (
          <section className="admin-card counselor-case__panel counselor-case__panel--wide">
            <h2>نتیجه سنجش رغبت (موتور سفر هدایت)</h2>
            <GuidanceInterestResultsView result={journeyInterestResult} />
          </section>
        ) : null}

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

        <section className="admin-card counselor-case__panel counselor-case__panel--wide">
          <h2>مدارک بارگذاری‌شده</h2>
          {dossier.documents.length === 0 ? (
            <p className="counselor-case__muted">مدرکی بارگذاری نشده.</p>
          ) : (
            <ul className="counselor-workspace__docs">
              {dossier.documents.map((doc) => (
                <li key={doc.id}>
                  <a href={doc.downloadHref} className="counselor-case__link">
                    {doc.documentTypeLabel} · {doc.filename}
                  </a>
                  <span>
                    نسخه {toPersianDigits(doc.versionNumber)} · {doc.verificationLabel}
                    {doc.createdAtIso
                      ? ` · ${formatJalaliDateTimeShort(new Date(doc.createdAtIso))}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          id="timeline"
          className="admin-card counselor-case__panel counselor-case__panel--wide"
        >
          <h2>خط زمان تغییرات (AuditLog)</h2>
          {dossier.audit.length === 0 ? (
            <p className="counselor-case__muted">رویدادی در دفتر ثبت نیست.</p>
          ) : (
            <ol className="counselor-workspace__audit">
              {dossier.audit.map((item) => (
                <li key={item.id}>
                  <strong>{item.actionLabel}</strong>
                  <span>
                    {item.actorName} ·{" "}
                    {formatJalaliDateTimeShort(new Date(item.atIso))}
                  </span>
                  <p>{item.summary}</p>
                </li>
              ))}
            </ol>
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
        <Link href={`/admin/guidance/${model.publicId}/choices`}>
          چیدمان هوشمند (موتور سفر)
        </Link>
        {" · "}
        <Link href="/admin/guidance">میز کار مشاور</Link>
      </p>
    </div>
  );
}
