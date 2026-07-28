import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExperienceRenderer } from "@/components/experience/ExperienceRenderer";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { requirePermission } from "@/lib/auth/require-admin";
import { loadFlowExperienceDraftBundle } from "@/lib/experience/admin/flow-experience-scope";
import { buildExperiencePublicRenderContext } from "@/lib/experience/public/render-context";
import { selectRenderablePublicBlocks } from "@/lib/experience/public/select-renderable-blocks";
import { getRegistrationFlowDetail } from "@/lib/registration/flows/admin";
import { loadPublicRegistrationFlowBySlug } from "@/lib/registration/flows/public";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "پیش‌نمایش پیش‌نویس تجربه",
    robots: { index: false, follow: false },
  };
}

export default async function AdminFlowExperiencePreviewPage({
  params,
}: PageProps) {
  const session = await requirePermission("registration_flows.manage");
  const { id: flowId } = await params;

  const flowDetail = await getRegistrationFlowDetail(
    session.organization.id,
    flowId,
  );
  if (!flowDetail) notFound();

  const draft = await loadFlowExperienceDraftBundle(
    session.organization.id,
    flowId,
  );
  if (!draft?.version) notFound();

  const publicFlow = await loadPublicRegistrationFlowBySlug(flowDetail.slug, {
    allowPreview: true,
  });
  if (!publicFlow) notFound();

  const context = buildExperiencePublicRenderContext({
    flow: publicFlow,
    allowPreview: true,
  });

  const { skipped } = selectRenderablePublicBlocks(
    draft.version.blocks,
    context.now,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
        پیش‌نمایش نسخه پیش‌نویس — این صفحه منتشر نمی‌شود و فقط برای بررسی ادمین
        است.
        <span className="mr-3 inline-flex">
          <Link
            href={`/admin/registrations/flows/${flowId}/experience`}
            className="underline"
          >
            بازگشت به ویرایشگر
          </Link>
        </span>
      </div>

      {skipped.length > 0 ? (
        <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-muted">
          <p className="font-medium text-primary">
            تشخیص ادمین: {toPersianDigits(skipped.length)} بلوک در این
            پیش‌نمایش رندر نمی‌شود
          </p>
          <ul className="mt-2 list-disc space-y-1 pr-5 text-xs leading-6">
            {skipped.map((item) => (
              <li key={item.blockId}>
                {item.blockType} — {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <PublicFormShell>
        <ExperienceRenderer bundle={draft} context={context} />
      </PublicFormShell>
    </div>
  );
}
