import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { RegistrationWizard } from "@/components/registration/RegistrationWizard";
import {
  saveRegistrationProgressAction,
  submitRegistrationAction,
  uploadRegistrationDocumentAction,
} from "@/app/register/[slug]/actions";
import {
  catalogFromRegistrationFlow,
  loadPublicRegistrationFlowBySlug,
} from "@/lib/registration/flows/public";
import { resolveRegistrationCatalog } from "@/lib/registration/flows/resolve-catalog";
import {
  getRegistrationFlowConfig,
} from "@/lib/registration/flow-config-db";
import {
  serializeRegistrationFlow,
  toRegistrationFlowPublicView,
} from "@/lib/registration/flow-config";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; preview?: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return createPageMetadata({
    path: `/register/${slug}/wizard`,
    title: `فرم ثبت‌نام | ستارگان پلاس`,
    description: "تکمیل مرحله‌به‌مرحله ثبت‌نام آنلاین در ستارگان پلاس.",
    robots: { index: false, follow: true },
  });
}

export default async function PublicRegistrationWizardPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const allowPreview = query.preview === "1";

  const flow = await loadPublicRegistrationFlowBySlug(slug, { allowPreview });
  const catalog =
    flow != null
      ? catalogFromRegistrationFlow(flow)
      : await resolveRegistrationCatalog(slug);

  if (!catalog) notFound();

  if (flow && !flow.isOpen && !allowPreview) {
    notFound();
  }

  const flowConfig =
    flow != null
      ? await getRegistrationFlowConfig({
          organizationId: flow.organizationId,
          flowKey: flow.slug,
        })
      : null;

  const receiptBasePath = `/register/${slug}/receipt`;

  return (
    <PublicFormShell>
      <Suspense
        fallback={
          <div className="rounded-3xl border border-white/60 bg-white/80 p-8 text-sm text-muted shadow-[0_20px_50px_rgb(15_23_42_/_0.08)] backdrop-blur-md">
            در حال آماده‌سازی فرم ثبت‌نام…
          </div>
        }
      >
        <RegistrationWizard
          catalog={catalog}
          initialResumeToken={query.token ?? null}
          receiptBasePath={receiptBasePath}
          saveProgressAction={saveRegistrationProgressAction}
          submitAction={submitRegistrationAction}
          uploadDocumentAction={uploadRegistrationDocumentAction}
          flowSnapshot={
            flowConfig ? serializeRegistrationFlow(flowConfig) : undefined
          }
          flowPublic={
            flowConfig ? toRegistrationFlowPublicView(flowConfig) : undefined
          }
        />
      </Suspense>
    </PublicFormShell>
  );
}
