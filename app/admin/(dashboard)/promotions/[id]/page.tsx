import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PromotionType } from "@/generated/prisma/enums";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PromotionAnalyticsPanel } from "@/components/admin/promotions/PromotionAnalyticsPanel";
import { PromotionEditorForm } from "@/components/admin/promotions/PromotionEditorForm";
import { PromotionReferralSharePanel } from "@/components/admin/promotions/PromotionReferralSharePanel";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  getPromotionDetail,
  listFlowOptions,
  listStaffOptions,
} from "@/lib/promotions/admin";
import { getPromotionAnalytics } from "@/lib/promotions/analytics";
import { generateReferralQrDataUrl } from "@/lib/promotions/generate-referral-qr";
import {
  getPublicReferralFlowUrl,
} from "@/lib/promotions/referral-link";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `پروموشن ${id}` };
}

export default async function AdminPromotionDetailPage({ params }: PageProps) {
  const session = await requirePermission("promotions.view");
  const canManage = hasPermission(session, "promotions.manage");
  const { id } = await params;

  const [promo, flowOptions, staffOptions, analytics] = await Promise.all([
    getPromotionDetail(session.organization.id, id),
    listFlowOptions(session.organization.id),
    listStaffOptions(session.organization.id),
    getPromotionAnalytics(session.organization.id, id),
  ]);
  if (!promo) notFound();

  const flowSlug =
    promo.registrationFlow?.slug ??
    flowOptions[0]?.slug ??
    "qalamchi-exam";
  const isReferral =
    promo.type === PromotionType.REFERRAL && Boolean(promo.code);

  let referralUrl = "";
  let qrDataUrl: string | null = null;
  if (isReferral && promo.code) {
    referralUrl = getPublicReferralFlowUrl(flowSlug, promo.code, {
      utm_source: "referral",
      utm_medium: "link",
      utm_campaign: promo.code,
    });
    try {
      qrDataUrl = await generateReferralQrDataUrl({
        flowSlug,
        code: promo.code,
      });
    } catch {
      qrDataUrl = null;
    }
  }

  return (
    <>
      <AdminPageHeader
        title={promo.title}
        description={
          promo.code
            ? `کد: ${promo.code} · استفاده: ${promo.usageCount}`
            : `بدون کد · استفاده: ${promo.usageCount}`
        }
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "تخفیف‌ها", href: "/admin/promotions" },
          { label: promo.title },
        ]}
        compact
      />

      <div className="space-y-4">
        {analytics ? <PromotionAnalyticsPanel analytics={analytics} /> : null}

        {isReferral && promo.code ? (
          <PromotionReferralSharePanel
            promotionId={promo.id}
            code={promo.code}
            flowSlug={flowSlug}
            referralUrl={referralUrl}
            qrDataUrl={qrDataUrl}
          />
        ) : null}

        <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
          <PromotionEditorForm
            mode="edit"
            canManage={canManage}
            flowOptions={flowOptions}
            staffOptions={staffOptions}
            initial={{
              id: promo.id,
              title: promo.title,
              code: promo.code,
              type: promo.type,
              valueType: promo.valueType,
              value: promo.value,
              maxDiscountAmount: promo.maxDiscountAmount,
              stackable: promo.stackable,
              priority: promo.priority,
              startsAt: promo.startsAt,
              endsAt: promo.endsAt,
              usageLimit: promo.usageLimit,
              usagePerNationalCode: promo.usagePerNationalCode,
              isActive: promo.isActive,
              registrationFlowId: promo.registrationFlowId,
              ownerStaffId: promo.ownerStaffId,
            }}
          />
        </div>
      </div>
    </>
  );
}
