import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicBookingWizard } from "@/components/booking/PublicBookingWizard";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { suggestBookingTimes } from "@/lib/ai/booking-assistant";
import { loadPublicBookingService } from "@/lib/booking/load-public-service";
import { getPublicBookingPath } from "@/lib/booking/public-url";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ serviceSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { serviceSlug } = await params;
  const path = getPublicBookingPath(serviceSlug);
  const result = await loadPublicBookingService(serviceSlug);
  if (!result.ok) {
    return createPageMetadata({
      title: "رزرو نوبت | ستارگان پلاس",
      description: "رزرو نوبت در حال حاضر در دسترس نیست.",
      path,
      robots: { index: false, follow: false },
    });
  }

  const service = result.data.service;
  return createPageMetadata({
    title: `رزرو ${service.title} | ستارگان پلاس`,
    description:
      service.description?.trim() ||
      `رزرو آنلاین نوبت «${service.title}» در ستارگان پلاس.`,
    path,
    keywords: [service.title, "رزرو نوبت", "ستارگان پلاس"],
  });
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { serviceSlug } = await params;
  const result = await loadPublicBookingService(serviceSlug);

  if (!result.ok && result.reason === "not_found") {
    notFound();
  }

  if (!result.ok) {
    return (
      <PublicFormShell>
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <h1 className="text-xl font-bold text-primary">رزرو موقتاً در دسترس نیست</h1>
          <Link href="/" className="mt-6 inline-flex text-sm text-primary underline">
            بازگشت
          </Link>
        </div>
      </PublicFormShell>
    );
  }

  const { service, advisors, organizationId } = result.data;
  const suggestion = await suggestBookingTimes({
    organizationId,
    serviceId: service.id,
  });

  return (
    <PublicFormShell>
      <Suspense fallback={<p className="text-sm text-muted">در حال بارگذاری…</p>}>
        <PublicBookingWizard
          serviceSlug={service.slug}
          serviceTitle={service.title}
          serviceId={service.id}
          advisors={advisors}
          allowAdvisorSelection={service.settings.allowAdvisorSelection}
          showRemainingCapacity={service.settings.showRemainingCapacity}
          meetingTypes={service.meetingTypes}
          recommendationMessage={suggestion.message}
        />
      </Suspense>
    </PublicFormShell>
  );
}
