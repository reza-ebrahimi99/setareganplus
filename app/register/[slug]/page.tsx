import { notFound } from "next/navigation";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { ExperienceRenderer } from "@/components/experience/ExperienceRenderer";
import { RegistrationFlowLandingFallback } from "@/components/registration/RegistrationFlowLandingFallback";
import {
  buildRegistrationLandingMetadata,
  resolveRegistrationLanding,
} from "@/lib/experience/public/resolve-registration-landing";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function serializeWizardQuery(
  searchParams: Record<string, string | string[] | undefined>,
): string | null {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) params.append(key, item);
      }
    } else if (value) {
      params.set(key, value);
    }
  }
  const serialized = params.toString();
  return serialized || null;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return buildRegistrationLandingMetadata({ slug });
}

export default async function PublicRegistrationFlowPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const allowPreview = query.preview === "1";
  const wizardQuery = serializeWizardQuery(query);

  const resolved = await resolveRegistrationLanding({
    slug,
    allowPreview,
    wizardQuery,
  });
  if (!resolved) notFound();

  if (resolved.mode === "experience") {
    return (
      <PublicFormShell>
        <ExperienceRenderer
          bundle={resolved.bundle}
          context={resolved.context}
        />
      </PublicFormShell>
    );
  }

  return (
    <PublicFormShell>
      <RegistrationFlowLandingFallback
        flow={resolved.flow}
        allowPreview={allowPreview}
        wizardQuery={wizardQuery}
      />
    </PublicFormShell>
  );
}
