import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  approveGuidanceChoicesAction,
  importGuidanceChoicesAction,
  updateGuidanceChoiceRowAction,
} from "@/app/admin/(dashboard)/guidance/[publicId]/choices/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GuidanceChoicesEditor } from "@/components/admin/guidance/GuidanceChoicesEditor";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { loadGuidanceJourneyPlanByPublicId } from "@/lib/guidance/journey/plan";
import {
  buildGuidanceAiExportPayload,
  loadGuidanceStep10Data,
} from "@/lib/guidance/journey/steps/step10-ai-arrangement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ publicId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  return { title: `چیدمان هوشمند ${publicId.slice(0, 8)}` };
}

export default async function AdminGuidanceChoicesPage({ params }: PageProps) {
  const session = await requirePermission("guidance.review");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) notFound();

  const { publicId } = await params;
  const plan = await loadGuidanceJourneyPlanByPublicId({
    organizationId: session.organization.id,
    publicId,
  });
  if (!plan) notFound();

  const student = await prisma.student.findFirst({
    where: { id: plan.studentId, organizationId: session.organization.id },
    select: { fullName: true },
  });

  const [exportPayload, step10Data] = await Promise.all([
    buildGuidanceAiExportPayload({ organizationId: session.organization.id, planPublicId: publicId }),
    loadGuidanceStep10Data({ organizationId: session.organization.id, planPublicId: publicId }),
  ]);

  return (
    <div className="counselor-case">
      <AdminPageHeader
        title={`چیدمان هوشمند — ${student?.fullName ?? plan.publicId}`}
        description="خروجی ساختاریافته برای Entekhabium و ورود/بازبینی گزینه‌های نهایی"
        breadcrumbs={[
          ...adminBreadcrumbs.guidance,
          { label: student?.fullName ?? plan.publicId, href: `/admin/guidance/${publicId}` },
          { label: "چیدمان هوشمند" },
        ]}
      />

      <section className="admin-card counselor-case__panel counselor-case__panel--wide">
        <h2>۱. خروجی JSON برای Entekhabium</h2>
        <p className="counselor-case__muted">
          این بسته را کپی کن و در Entekhabium آپلود کن. پاسخ (۱۵۰ گزینه) را در
          بخش پایین وارد کن.
        </p>
        <textarea
          readOnly
          value={JSON.stringify(exportPayload, null, 2)}
          rows={10}
          style={{ width: "100%", fontFamily: "monospace", fontSize: "0.75rem" }}
        />
      </section>

      <section className="admin-card counselor-case__panel counselor-case__panel--wide">
        <h2>۲. ورود، بازبینی و تأیید گزینه‌ها</h2>
        <GuidanceChoicesEditor
          publicId={publicId}
          initialChoices={step10Data.choices}
          approved={Boolean(plan.choicesApprovedAtIso)}
          importAction={importGuidanceChoicesAction}
          updateRowAction={updateGuidanceChoiceRowAction}
          approveAction={approveGuidanceChoicesAction}
        />
      </section>

      <p className="counselor-case__back">
        <Link href={`/admin/guidance/${publicId}`}>بازگشت به پرونده</Link>
      </p>
    </div>
  );
}
