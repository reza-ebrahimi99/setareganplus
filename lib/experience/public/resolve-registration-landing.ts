/**
 * Resolve published LANDING Experience for a registration flow — never drafts.
 */

import { cache } from "react";
import { ExperienceOwnerType, ExperiencePurpose } from "@/generated/prisma/enums";
import { MediaAssetStatus } from "@/generated/prisma/enums";
import { logExperienceRenderDiagnostic } from "@/lib/experience/public/diagnostics";
import { buildExperiencePublicRenderContext } from "@/lib/experience/public/render-context";
import { experienceHasRenderableBlocks } from "@/lib/experience/public/select-renderable-blocks";
import {
  loadPublishedExperienceByOwner,
  type LoadedExperienceBundle,
} from "@/lib/experience/service/loaders";
import { publicUrlForStorageKey } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import type { PublicRegistrationFlow } from "@/lib/registration/flows/public";
import { loadPublicRegistrationFlowBySlug } from "@/lib/registration/flows/public";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";
import { resolveLandingSeoText } from "@/lib/experience/public/seo";
import type { Metadata } from "next";

export const loadCachedPublicRegistrationFlowBySlug = cache(
  async (slug: string, allowPreview: boolean) =>
    loadPublicRegistrationFlowBySlug(slug, { allowPreview }),
);

export const loadCachedPublishedLandingExperience = cache(
  async (organizationId: string, registrationFlowId: string) =>
    loadPublishedExperienceByOwner({
      organizationId,
      ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
      ownerId: registrationFlowId,
      purpose: ExperiencePurpose.LANDING,
      key: "default",
    }),
);

export type ResolvedRegistrationLanding =
  | {
      mode: "experience";
      flow: PublicRegistrationFlow;
      bundle: LoadedExperienceBundle;
      context: ReturnType<typeof buildExperiencePublicRenderContext>;
    }
  | {
      mode: "fallback";
      flow: PublicRegistrationFlow;
      reason: string;
    };

export async function resolveRegistrationLanding(params: {
  slug: string;
  allowPreview: boolean;
  wizardQuery?: string | null;
  now?: Date;
}): Promise<ResolvedRegistrationLanding | null> {
  const flow = await loadCachedPublicRegistrationFlowBySlug(
    params.slug,
    params.allowPreview,
  );
  if (!flow) return null;

  const now = params.now ?? new Date();
  const loaded = await loadCachedPublishedLandingExperience(
    flow.organizationId,
    flow.id,
  );

  if (!loaded.ok) {
    logExperienceRenderDiagnostic({
      category: "EXPERIENCE_FALLBACK",
      message: loaded.message,
      organizationId: flow.organizationId,
      registrationFlowId: flow.id,
      reason: loaded.code,
    });
    return { mode: "fallback", flow, reason: loaded.code };
  }

  const bundle = loaded.data;
  if (!bundle || !bundle.version) {
    return { mode: "fallback", flow, reason: "NO_PUBLISHED_EXPERIENCE" };
  }

  if (bundle.version.diagnostics.length > 0) {
    // Soft: still try to render valid blocks; hard-fail only when nothing renders.
  }

  if (!experienceHasRenderableBlocks(bundle, now)) {
    logExperienceRenderDiagnostic({
      category: "EXPERIENCE_FALLBACK",
      message: "No renderable published blocks; using legacy landing",
      organizationId: flow.organizationId,
      registrationFlowId: flow.id,
      experienceId: bundle.experience.id,
      versionId: bundle.version.id,
      reason: "NO_RENDERABLE_BLOCKS",
    });
    return { mode: "fallback", flow, reason: "NO_RENDERABLE_BLOCKS" };
  }

  const context = buildExperiencePublicRenderContext({
    flow,
    allowPreview: params.allowPreview,
    wizardQuery: params.wizardQuery,
    now,
  });

  return { mode: "experience", flow, bundle, context };
}

async function resolveSeoImageUrl(
  organizationId: string,
  mediaId: string | null | undefined,
): Promise<string | null> {
  if (!mediaId) return null;
  const media = await prisma.mediaAsset.findFirst({
    where: {
      id: mediaId,
      organizationId,
      deletedAt: null,
      status: MediaAssetStatus.ACTIVE,
    },
    select: { storageKey: true },
  });
  if (!media) return null;
  return publicUrlForStorageKey(media.storageKey);
}

/**
 * SEO precedence:
 * 1) published ExperienceVersion SEO when present
 * 2) RegistrationFlow title/description (+ cover as OG when useful)
 * 3) platform defaults via createPageMetadata callers
 */
export async function buildRegistrationLandingMetadata(params: {
  slug: string;
}): Promise<Metadata> {
  const flow = await loadCachedPublicRegistrationFlowBySlug(params.slug, true);
  if (!flow) {
    return createPageMetadata({
      path: `/register/${params.slug}`,
      title: "ثبت‌نام | ستارگان پلاس",
      description: "ثبت‌نام آنلاین در ستارگان پلاس",
      robots: { index: false, follow: true },
    });
  }

  const loaded = await loadCachedPublishedLandingExperience(
    flow.organizationId,
    flow.id,
  );

  let title: string;
  let description: string;
  let imageUrl: string | null = flow.coverUrl;

  if (loaded.ok && loaded.data?.version) {
    const version = loaded.data.version;
    const text = resolveLandingSeoText({
      flowTitle: flow.title,
      flowDescription: flow.description,
      experienceSeoTitle: version.seoTitle,
      experienceSeoDescription: version.seoDescription,
    });
    title = text.title;
    description = text.description;
    const experienceImage = await resolveSeoImageUrl(
      flow.organizationId,
      version.seoImageMediaId,
    );
    if (experienceImage) imageUrl = experienceImage;
  } else {
    const text = resolveLandingSeoText({
      flowTitle: flow.title,
      flowDescription: flow.description,
    });
    title = text.title;
    description = text.description;
  }

  return createPageMetadata({
    path: `/register/${params.slug}`,
    title,
    description,
    imageUrl,
    imageAlt: flow.title,
    robots: { index: true, follow: true },
  });
}
