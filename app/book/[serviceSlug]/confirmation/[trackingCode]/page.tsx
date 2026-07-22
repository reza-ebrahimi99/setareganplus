import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { generateCheckInQrDataUrl } from "@/lib/booking/generate-checkin-qr";
import { getBookingConfirmationPath } from "@/lib/booking/public-url";
import { parseBookingServiceSettings } from "@/lib/booking/service-settings";
import { buildPublicCheckInUrl } from "@/lib/booking/tokens";
import {
  formatJalaliDateLong,
  formatPersianTimeRange,
} from "@/lib/datetime/jalali";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ serviceSlug: string; trackingCode: string }>;
  searchParams: Promise<{ t?: string }>;
};

const MEETING_LABELS: Record<string, string> = {
  IN_PERSON: "حضوری",
  ONLINE: "آنلاین",
  PHONE: "تلفنی",
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { serviceSlug, trackingCode } = await params;
  return createPageMetadata({
    title: "رسید رزرو | ستارگان پلاس",
    description: "رسید تأیید رزرو نوبت در ستارگان پلاس.",
    path: getBookingConfirmationPath(serviceSlug, trackingCode),
    robots: { index: false, follow: false },
  });
}

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  const { serviceSlug, trackingCode } = await params;
  const { t: checkInToken } = await searchParams;

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    notFound();
  }

  const reservation = await prisma.bookingReservation.findFirst({
    where: {
      organizationId: organization.id,
      trackingCode: decodeURIComponent(trackingCode),
      deletedAt: null,
      slot: {
        service: { slug: serviceSlug },
      },
    },
    include: {
      slot: {
        include: {
          service: true,
          advisor: true,
          branch: true,
        },
      },
    },
  });

  if (!reservation) {
    notFound();
  }

  const settings = parseBookingServiceSettings(reservation.slot.service.settings);
  const qrTarget = checkInToken
    ? buildPublicCheckInUrl(checkInToken)
    : `https://setareganplus.ir/book/${serviceSlug}/confirmation/${encodeURIComponent(reservation.trackingCode)}`;
  const qrDataUrl = await generateCheckInQrDataUrl(qrTarget);

  return (
    <PublicFormShell>
      <article className="public-form-section space-y-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="public-form-success-mark mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700">
          ✓
        </div>
        <header className="space-y-2 text-center">
          <h1 className="text-xl font-bold text-primary">رزرو ثبت شد</h1>
          <p className="text-sm text-muted">کد پیگیری را نگه دارید</p>
          <p className="font-mono text-lg font-semibold text-primary" dir="ltr">
            {toPersianDigits(reservation.trackingCode)}
          </p>
        </header>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">خدمت</dt>
            <dd className="mt-1 font-medium">{reservation.slot.service.title}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">مشاور</dt>
            <dd className="mt-1 font-medium">
              {reservation.slot.advisor.displayName}
            </dd>
          </div>
          {reservation.slot.branch ? (
            <div>
              <dt className="text-xs text-muted">شعبه</dt>
              <dd className="mt-1 font-medium">{reservation.slot.branch.name}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-muted">تاریخ</dt>
            <dd className="mt-1 font-medium">
              {formatJalaliDateLong(reservation.slot.startsAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">ساعت</dt>
            <dd className="mt-1 font-medium">
              {formatPersianTimeRange(
                reservation.slot.startsAt,
                reservation.slot.endsAt,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">نوع جلسه</dt>
            <dd className="mt-1 font-medium">
              {MEETING_LABELS[reservation.meetingType] ?? reservation.meetingType}
            </dd>
          </div>
        </dl>

        {reservation.meetingType === "ONLINE" && settings.onlineMeetingInfo ? (
          <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-950">
            {settings.onlineMeetingInfo}
          </p>
        ) : null}
        {reservation.meetingType === "IN_PERSON" && settings.addressInfo ? (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-7">
            {settings.addressInfo}
          </p>
        ) : null}

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted">QR ورود (بدون اطلاعات شخصی)</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="کد QR ورود" width={220} height={220} />
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            بازگشت به سایت
          </Link>
        </div>
      </article>
    </PublicFormShell>
  );
}
