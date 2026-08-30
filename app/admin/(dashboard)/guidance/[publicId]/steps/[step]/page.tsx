import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { WorkspaceFieldList } from "@/components/admin/guidance/WorkspaceFieldList";
import { WorkspaceJourneyRail } from "@/components/admin/guidance/WorkspaceJourneyRail";
import { WorkspaceStepEditor } from "@/components/admin/guidance/WorkspaceStepEditor";
import { WorkspaceStepOps } from "@/components/admin/guidance/WorkspaceStepOps";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadWorkspaceStepInspector } from "@/lib/guidance/workspace";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ publicId: string; step: string }>;
  searchParams?: Promise<{ edit?: string; history?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { step } = await params;
  return { title: `مرحله ${step} — میز کار مشاور` };
}

export default async function AdminGuidanceStepInspectorPage({
  params,
  searchParams,
}: PageProps) {
  const session = await requirePermission("guidance.view");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) notFound();

  const { publicId, step } = await params;
  const query = searchParams ? await searchParams : {};
  const editing = query.edit === "1";
  const canReview = hasPermission(session, "guidance.review");
  const inspector = await loadWorkspaceStepInspector({
    organizationId: session.organization.id,
    publicId,
    stepParam: step,
    canReview,
  });
  if (!inspector) notFound();

  const { dossier } = inspector;
  const stepHref = `/admin/guidance/${dossier.publicId}/steps/${inspector.stepId}`;

  return (
    <div className="counselor-workspace counselor-case">
      <AdminPageHeader
        title={`${inspector.title} — ${dossier.studentName}`}
        description={`${inspector.review.statusLabel} · مرحله ${toPersianDigits(inspector.stepId)} از ۱۲ · ${inspector.description}`}
        breadcrumbs={[
          ...adminBreadcrumbs.guidance,
          {
            label: dossier.studentName,
            href: `/admin/guidance/${dossier.publicId}`,
          },
          { label: inspector.title },
        ]}
      />

      <nav className="counselor-ops__toolbar" aria-label="اقدامات مرحله">
        <Link href={stepHref} className={!editing ? "is-active" : ""}>
          بررسی
        </Link>
        {canReview ? (
          <Link href={`${stepHref}?edit=1`} className={editing ? "is-active" : ""}>
            ویرایش
          </Link>
        ) : null}
        <Link href={`${stepHref}#history`}>تاریخچه</Link>
        <Link href={`/admin/guidance/${dossier.publicId}#timeline`}>خط زمان دانش‌آموز</Link>
        {inspector.relatedHref ? (
          <Link href={inspector.relatedHref}>{inspector.relatedLabel}</Link>
        ) : null}
        {inspector.documents[0] ? (
          <a href={inspector.documents[0].downloadHref}>پیش‌نمایش فایل</a>
        ) : null}
      </nav>

      <WorkspaceJourneyRail
        steps={dossier.steps}
        activeStepId={inspector.stepId}
      />

      {inspector.emptyMessage ? (
        <p className="counselor-workspace__banner" data-status={inspector.status}>
          {inspector.emptyMessage}
        </p>
      ) : null}

      {editing && canReview ? (
        <section className="admin-card counselor-case__panel counselor-case__panel--wide">
          <h2>ویرایش با فرم دانش‌آموز</h2>
          <p className="counselor-workspace__muted">
            همان اعتبارسنجی مرحله دانش‌آموز. قفل گردش کار برای مشاور اعمال نمی‌شود.
          </p>
          <WorkspaceStepEditor
            organizationId={session.organization.id}
            publicId={dossier.publicId}
            stepId={inspector.stepId}
            studentName={dossier.studentName}
            examGroup={dossier.examGroup}
            documents={inspector.documents}
          />
        </section>
      ) : (
        <section className="admin-card counselor-case__panel counselor-case__panel--wide">
          <h2>اطلاعات ثبت‌شده</h2>
          <WorkspaceFieldList fields={inspector.fields} />
          {inspector.relatedHref && inspector.relatedLabel ? (
            <p className="counselor-case__back">
              <Link href={inspector.relatedHref}>{inspector.relatedLabel}</Link>
            </p>
          ) : null}
        </section>
      )}

      {inspector.documents.length > 0 && !editing ? (
        <section className="admin-card counselor-case__panel counselor-case__panel--wide">
          <h2>مدارک این مرحله</h2>
          <ul className="counselor-workspace__docs">
            {inspector.documents.map((doc) => (
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
        </section>
      ) : null}

      <WorkspaceStepOps
        publicId={dossier.publicId}
        stepId={inspector.stepId}
        review={inspector.review}
        history={inspector.history}
        documents={inspector.documents}
        canReview={canReview}
      />

      <p className="counselor-case__back">
        <Link href={`/admin/guidance/${dossier.publicId}`}>بازگشت به پرونده</Link>
        {" · "}
        <Link href="/admin/guidance">میز کار مشاور</Link>
      </p>
    </div>
  );
}
