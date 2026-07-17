import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FormEditor } from "@/components/admin/forms/FormEditor";
import { FormBookingConnection } from "@/components/admin/forms/FormBookingConnection";
import { FormPosterManager } from "@/components/admin/forms/FormPosterManager";
import { FormScheduleSettings } from "@/components/admin/forms/FormScheduleSettings";
import { FormPublishControls } from "@/components/admin/forms/FormPublishControls";
import { FormShareCard } from "@/components/admin/forms/FormShareCard";
import { adminBreadcrumbs } from "@/content/admin";
import { generateFormQrDataUrl } from "@/lib/forms/generate-form-qr";
import { getFormPurposeLabel } from "@/lib/forms/form-purpose-labels";
import { loadFormEditor } from "@/lib/forms/load-form-editor";
import { parseFormBookingSettings } from "@/lib/booking/form-booking-settings";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";

type AdminFormEditorPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AdminFormEditorPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await loadFormEditor(id);

  if (!result.ok) {
    return { title: "ویرایش فرم" };
  }

  return { title: result.data.headerTitle };
}

export default async function AdminFormEditorPage({
  params,
}: AdminFormEditorPageProps) {
  const { id } = await params;
  const session = await requireAdminSession();
  const result = await loadFormEditor(id);

  if (!result.ok && result.reason === "not_found") {
    notFound();
  }

  if (!result.ok && result.reason === "unavailable") {
    return (
      <>
        <AdminPageHeader
          title="ویرایش فرم"
          description="بارگذاری ویرایش‌گر فرم"
          breadcrumbs={adminBreadcrumbs.forms}
          showNotice
          compact
        />
        <div
          role="alert"
          className="admin-card border-red-200 bg-red-50 px-5 py-4 text-sm leading-7 text-red-800"
        >
          اتصال به پایگاه داده یا سازمان پیش‌فرض برقرار نشد. پس از پیکربندی
          PostgreSQL و اجرای seed دوباره تلاش کنید.
        </div>
      </>
    );
  }

  if (!result.ok) {
    notFound();
  }

  const {
    form,
    draft,
    publishedVersion,
    fields,
    displayStatus,
    headerTitle,
  } = result.data;

  const isPublished = Boolean(form.publishedVersionId && publishedVersion);
  const posterForUi = draft
    ? draft.poster
    : (publishedVersion?.poster ?? null);
  const scheduleForUi = draft
    ? draft.schedule
    : publishedVersion?.schedule ?? {
        opensAt: null,
        registrationDeadline: null,
        capacity: null,
        settings: { showRemainingCapacity: false, confirmationSmsEnabled: false },
      };

  const sharePoster = isPublished
    ? (publishedVersion?.poster ?? posterForUi)
    : posterForUi;
  const shareSchedule = isPublished
    ? (publishedVersion?.schedule ?? scheduleForUi)
    : scheduleForUi;

  const qrPreviewDataUrl = isPublished
    ? await generateFormQrDataUrl(form.slug)
    : null;
  const bookingServices = await prisma.bookingService.findMany({
    where: {
      organizationId: session.organization.id,
      deletedAt: null,
      isActive: true,
    },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
  const bookingVersion = await prisma.formVersion.findFirst({
    where: {
      organizationId: session.organization.id,
      formId: form.id,
      id: draft?.id ?? publishedVersion?.id,
    },
    select: { settings: true },
  });
  const bookingSettings = parseFormBookingSettings(
    bookingVersion?.settings,
  );

  return (
    <>
      <AdminPageHeader
        title={headerTitle}
        description="مدیریت پرسش‌های پیش‌نویس و وضعیت انتشار فرم"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "فرم‌ساز", href: "/admin/forms" },
          { label: headerTitle },
        ]}
        showNotice
        compact
      />

      <div className="mb-6 space-y-4 rounded-xl border border-border bg-surface px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1 text-sm">
            <p className="text-muted">
              نامک:{" "}
              <span className="font-mono text-foreground" dir="ltr">
                {form.slug}
              </span>
            </p>
            <p className="text-muted">
              هدف:{" "}
              <span className="text-foreground">
                {getFormPurposeLabel(form.purpose)}
              </span>
            </p>
            {draft ? (
              <p className="text-muted">
                نسخه پیش‌نویس:{" "}
                <span className="text-foreground">
                  {toPersianDigits(draft.versionNumber)}
                </span>
              </p>
            ) : null}
            {publishedVersion ? (
              <p className="text-muted">
                نسخه منتشرشده:{" "}
                <span className="text-foreground">
                  {toPersianDigits(publishedVersion.versionNumber)}
                </span>
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href={`/admin/forms/${form.id}/responses`}
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
            >
              پاسخ‌ها
            </Link>
            <Link
              href="/admin/forms"
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
            >
              بازگشت به فرم‌ها
            </Link>
          </div>
        </div>

        <FormPublishControls
          formId={form.id}
          displayStatus={displayStatus}
          hasDraft={Boolean(draft)}
          isPublished={isPublished}
          draftVersionId={draft?.id ?? null}
          draftVersionNumber={draft?.versionNumber ?? null}
          publishedVersionNumber={publishedVersion?.versionNumber ?? null}
        />
      </div>

      <div className="mb-6">
        <FormShareCard
          formId={form.id}
          slug={form.slug}
          title={headerTitle}
          displayStatus={displayStatus}
          isPublished={isPublished}
          posterUrl={sharePoster?.publicUrl ?? null}
          posterAlt={sharePoster?.altText ?? null}
          capacity={shareSchedule.capacity}
          registrationDeadline={
            shareSchedule.registrationDeadline?.toISOString() ?? null
          }
          qrPreviewDataUrl={qrPreviewDataUrl}
        />
      </div>

      <div className="mb-6">
        <FormScheduleSettings
          formId={form.id}
          editable={Boolean(draft)}
          schedule={scheduleForUi}
        />
      </div>

      <div className="mb-6">
        <FormPosterManager
          formId={form.id}
          editable={Boolean(draft)}
          poster={posterForUi}
        />
      </div>

      <div className="mb-6">
        <FormBookingConnection
          formId={form.id}
          editable={Boolean(draft)}
          services={bookingServices}
          settings={bookingSettings}
        />
      </div>

      {draft ? (
        <FormEditor
          formId={form.id}
          slug={form.slug}
          isPublished={isPublished}
          fields={fields}
        />
      ) : (
        <AdminEmptyState
          title={
            isPublished
              ? "نسخه پیش‌نویس برای ویرایش وجود ندارد"
              : displayStatus === "PAUSED"
                ? "انتشار متوقف شده است"
                : "نسخه پیش‌نویس یافت نشد"
          }
          description={
            isPublished
              ? "نسخه منتشرشده تغییر نمی‌کند، اما پیش‌نویس تازه مورد انتظار یافت نشد. صفحه را تازه‌سازی کنید و در صورت تداوم خطا با پشتیبانی تماس بگیرید."
              : displayStatus === "PAUSED"
                ? "نسخه فعال عمومی و پیش‌نویس قابل ویرایش برای این فرم یافت نشد."
                : "فقط نسخه‌های پیش‌نویس قابل ویرایش هستند."
          }
          action={
            <Link
              href="/admin/forms"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-background"
            >
              بازگشت به فرم‌ها
            </Link>
          }
        />
      )}
    </>
  );
}
