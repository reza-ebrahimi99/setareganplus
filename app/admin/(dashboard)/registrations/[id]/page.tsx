import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addRegistrationNoteAction,
  changeRegistrationStatusAction,
  markNeedsCallAction,
  reviewDocumentAction,
} from "@/app/admin/(dashboard)/registrations/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { formatJalaliDateShort, formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { publicUrlForStorageKey } from "@/lib/media/storage";
import { toPersianDigits } from "@/lib/persian";
import { prisma } from "@/lib/prisma";
import { formatRials } from "@/lib/registration/format";
import {
  REGISTRATION_DOCUMENT_TYPE_LABELS,
  REGISTRATION_PAYMENT_LABELS,
  REGISTRATION_STATUS_LABELS,
  WIZARD_STEP_LABELS,
} from "@/lib/registration/status";
import {
  RegistrationDocumentReviewStatus,
  RegistrationStatus,
} from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `ثبت‌نام ${id.slice(0, 8)}` };
}

export default async function AdminRegistrationDetailPage({
  params,
}: PageProps) {
  const session = await requirePermission("registrations.view");
  const canManage = hasPermission(session, "registrations.manage");
  const { id } = await params;

  const registration = await prisma.registration.findFirst({
    where: {
      id,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    include: {
      documents: {
        where: { deletedAt: null },
        include: {
          mediaAsset: {
            select: {
              id: true,
              storageKey: true,
              originalName: true,
              mimeType: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          actor: { select: { firstName: true, lastName: true } },
        },
      },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 80,
        include: {
          actor: { select: { firstName: true, lastName: true } },
        },
      },
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mobile: true,
          status: true,
        },
      },
      paymentIntents: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          receiptNumber: true,
          trackingCode: true,
          provider: true,
        },
      },
    },
  });

  if (!registration) notFound();

  const latestPaymentIntent = registration.paymentIntents[0] ?? null;

  const applicant =
    `${registration.studentFirstName ?? ""} ${registration.studentLastName ?? ""}`.trim() ||
    registration.parentName ||
    "—";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`ثبت‌نام ${toPersianDigits(registration.registrationNumber)}`}
        description={`${applicant} · ${REGISTRATION_STATUS_LABELS[registration.status]} · تکمیل ${toPersianDigits(`${registration.completionPercent}٪`)}`}
        breadcrumbs={adminBreadcrumbs.registrationDetail}
        compact
      />

      {canManage ? (
        <section className="admin-card flex flex-wrap gap-2 p-4">
          <form action={markNeedsCallAction}>
            <input type="hidden" name="registrationId" value={registration.id} />
            <button
              type="submit"
              className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold"
            >
              نیاز به تماس
            </button>
          </form>
          {(
            [
              RegistrationStatus.WAITING_DOCUMENTS,
              RegistrationStatus.UNDER_REVIEW,
              RegistrationStatus.APPROVED,
              RegistrationStatus.REJECTED,
              RegistrationStatus.CANCELLED,
            ] as const
          ).map((status) => (
            <form key={status} action={changeRegistrationStatusAction}>
              <input
                type="hidden"
                name="registrationId"
                value={registration.id}
              />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold"
              >
                {REGISTRATION_STATUS_LABELS[status]}
              </button>
            </form>
          ))}
          {registration.leadId ? (
            <Link
              href={`/admin/leads/${registration.leadId}`}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"
            >
              باز کردن لید CRM
            </Link>
          ) : null}
          {registration.resumeToken ? (
            <Link
              href={`/ghalamchi/register/wizard?token=${encodeURIComponent(registration.resumeToken)}`}
              className="rounded-xl border border-secondary/40 bg-secondary/10 px-3 py-2 text-xs font-semibold text-primary"
            >
              ادامه ثبت‌نام (عمومی)
            </Link>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-card space-y-3 p-5">
          <h2 className="text-sm font-bold text-primary">اطلاعات متقاضی</h2>
          <Info
            label="نام"
            value={applicant}
          />
          <Info
            label="کد ملی"
            value={
              registration.nationalCode
                ? toPersianDigits(registration.nationalCode)
                : "—"
            }
          />
          <Info
            label="تاریخ تولد"
            value={
              registration.birthDate
                ? formatJalaliDateShort(registration.birthDate)
                : "—"
            }
          />
          <Info label="پایه" value={registration.gradeLabel ?? "—"} />
          <Info label="مدرسه" value={registration.schoolName ?? "—"} />
          <Info
            label="محل"
            value={
              registration.city && registration.province
                ? `${registration.city}، ${registration.province}`
                : "—"
            }
          />
          <Info label="ولی" value={registration.parentName ?? "—"} />
          <Info
            label="موبایل"
            value={
              registration.parentMobileNormalized ||
              registration.parentMobile ||
              "—"
            }
          />
          <Info label="ایمیل" value={registration.parentEmail ?? "—"} />
        </section>

        <section className="admin-card space-y-3 p-5">
          <h2 className="text-sm font-bold text-primary">جزئیات ثبت‌نام</h2>
          <Info label="فرم / محصول" value={registration.productTitle ?? "—"} />
          <Info label="نوبت" value={registration.sessionTitle ?? "—"} />
          <Info label="بسته" value={registration.packageTitle ?? "—"} />
          <Info label="شعبه" value={registration.venueBranchTitle ?? "—"} />
          <Info
            label="مرحله جاری"
            value={
              WIZARD_STEP_LABELS[registration.currentStep] ??
              String(registration.currentStep)
            }
          />
          <Info
            label="آخرین مرحله تکمیل‌شده"
            value={
              WIZARD_STEP_LABELS[registration.lastCompletedStep] ??
              String(registration.lastCompletedStep)
            }
          />
          <Info
            label="آخرین فعالیت"
            value={formatJalaliDateTimeShort(registration.lastActivityAt)}
          />
          <Info
            label="وضعیت"
            value={REGISTRATION_STATUS_LABELS[registration.status]}
          />
        </section>

        <section className="admin-card space-y-3 p-5">
          <h2 className="text-sm font-bold text-primary">پرداخت</h2>
          <Info
            label="وضعیت پرداخت"
            value={REGISTRATION_PAYMENT_LABELS[registration.paymentStatus]}
          />
          <Info
            label="مبلغ"
            value={formatRials(registration.amountRials)}
          />
          <Info
            label="تخفیف"
            value={formatRials(registration.discountRials)}
          />
          <Info
            label="مبلغ نهایی"
            value={formatRials(registration.finalAmountRials)}
          />
          <Info
            label="کد پیگیری"
            value={
              registration.trackingCode ??
              latestPaymentIntent?.trackingCode ??
              "هنوز تنظیم نشده"
            }
          />
          {latestPaymentIntent?.receiptNumber ? (
            <Info
              label="شماره رسید پرداخت"
              value={toPersianDigits(latestPaymentIntent.receiptNumber)}
            />
          ) : null}
          {latestPaymentIntent?.provider ? (
            <Info label="درگاه" value={latestPaymentIntent.provider} />
          ) : null}
        </section>

        <section className="admin-card space-y-3 p-5">
          <h2 className="text-sm font-bold text-primary">لید CRM</h2>
          {registration.lead ? (
            <>
              <Info
                label="نام لید"
                value={`${registration.lead.firstName} ${registration.lead.lastName}`}
              />
              <Info label="موبایل" value={registration.lead.mobile} />
              <Link
                href={`/admin/leads/${registration.lead.id}`}
                className="inline-flex text-sm font-semibold text-secondary hover:underline"
              >
                باز کردن پرونده CRM
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted">هنوز به لید متصل نشده است.</p>
          )}
        </section>
      </div>

      <section className="admin-card space-y-4 p-5">
        <h2 className="text-sm font-bold text-primary">مدارک بارگذاری‌شده</h2>
        {registration.documents.length === 0 ? (
          <p className="text-sm text-muted">مدرکی ثبت نشده است.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {registration.documents.map((doc) => {
              const url = publicUrlForStorageKey(doc.mediaAsset.storageKey);
              return (
                <li
                  key={doc.id}
                  className="overflow-hidden rounded-2xl border border-border bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={REGISTRATION_DOCUMENT_TYPE_LABELS[doc.documentType]}
                    className="h-40 w-full object-cover"
                  />
                  <div className="space-y-2 p-3">
                    <p className="text-sm font-semibold">
                      {REGISTRATION_DOCUMENT_TYPE_LABELS[doc.documentType]}
                    </p>
                    <p className="text-xs text-muted">{doc.reviewStatus}</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-secondary hover:underline"
                      >
                        پیش‌نمایش / دانلود
                      </a>
                      {canManage ? (
                        <>
                          <form action={reviewDocumentAction}>
                            <input
                              type="hidden"
                              name="documentId"
                              value={doc.id}
                            />
                            <input
                              type="hidden"
                              name="registrationId"
                              value={registration.id}
                            />
                            <input
                              type="hidden"
                              name="reviewStatus"
                              value={RegistrationDocumentReviewStatus.APPROVED}
                            />
                            <button
                              type="submit"
                              className="text-xs font-semibold text-primary"
                            >
                              تأیید
                            </button>
                          </form>
                          <form action={reviewDocumentAction}>
                            <input
                              type="hidden"
                              name="documentId"
                              value={doc.id}
                            />
                            <input
                              type="hidden"
                              name="registrationId"
                              value={registration.id}
                            />
                            <input
                              type="hidden"
                              name="reviewStatus"
                              value={RegistrationDocumentReviewStatus.REJECTED}
                            />
                            <button
                              type="submit"
                              className="text-xs font-semibold text-danger"
                            >
                              رد
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-card space-y-3 p-5">
          <h2 className="text-sm font-bold text-primary">یادداشت‌ها</h2>
          {canManage ? (
            <form action={addRegistrationNoteAction} className="space-y-2">
              <input
                type="hidden"
                name="registrationId"
                value={registration.id}
              />
              <textarea
                name="body"
                rows={3}
                required
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                placeholder="یادداشت جدید…"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"
              >
                ثبت یادداشت
              </button>
            </form>
          ) : null}
          <ul className="space-y-2">
            {registration.notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl bg-background px-3 py-2 text-sm"
              >
                <p>{note.body}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {note.actor
                    ? `${note.actor.firstName} ${note.actor.lastName}`
                    : "سیستم"}{" "}
                  · {formatJalaliDateTimeShort(note.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-card space-y-3 p-5">
          <h2 className="text-sm font-bold text-primary">
            تایم‌لاین / تاریخچه فعالیت
          </h2>
          <ul className="space-y-2">
            {registration.activities.map((activity) => (
              <li
                key={activity.id}
                className="rounded-xl border border-border/70 px-3 py-2 text-sm"
              >
                <p className="font-medium">{activity.title}</p>
                {activity.summary ? (
                  <p className="text-xs text-muted">{activity.summary}</p>
                ) : null}
                <p className="mt-1 text-[11px] text-muted">
                  {formatJalaliDateTimeShort(activity.occurredAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-2 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
