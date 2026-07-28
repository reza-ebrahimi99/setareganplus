/**
 * Server-side helpers for RegistrationFlow LANDING Experience admin.
 * organizationId / ownerId always derived from session + scoped flow.
 */

import {
  ExperienceOwnerType,
  ExperiencePurpose,
  ExperienceVersionStatus,
} from "@/generated/prisma/enums";
import type { AdminSessionContext } from "@/lib/auth/require-admin";
import { resolveExperienceEntryState } from "@/lib/experience/admin/form-helpers";
import {
  findExperienceByOwner,
  loadDraftExperienceByOwner,
  loadPublishedExperienceByOwner,
  type ExperienceRecord,
  type LoadedExperienceBundle,
} from "@/lib/experience/service";
import {
  getRegistrationFlowDetail,
  type RegistrationFlowDetail,
} from "@/lib/registration/flows/admin";

export type FlowExperienceAdminScope = {
  organizationId: string;
  actorUserId: string;
  flow: RegistrationFlowDetail;
};

export async function resolveFlowExperienceScope(
  session: AdminSessionContext,
  flowId: string,
): Promise<FlowExperienceAdminScope | null> {
  const flow = await getRegistrationFlowDetail(
    session.organization.id,
    flowId,
  );
  if (!flow) return null;
  return {
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    flow,
  };
}

export type FlowExperienceSummary = {
  flowId: string;
  experience: ExperienceRecord | null;
  draft: {
    versionId: string;
    versionNumber: number;
    blockCount: number;
    updatedAt: Date;
  } | null;
  published: {
    versionId: string;
    versionNumber: number;
    publishedAt: Date | null;
    blockCount: number;
  } | null;
  entryState: "NONE" | "PUBLISHED_ONLY" | "DRAFT_ACTIVE";
};

export async function loadFlowExperienceSummary(
  organizationId: string,
  flowId: string,
): Promise<FlowExperienceSummary> {
  const found = await findExperienceByOwner({
    organizationId,
    ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
    ownerId: flowId,
    purpose: ExperiencePurpose.LANDING,
    key: "default",
  });

  if (!found.ok || !found.data) {
    return {
      flowId,
      experience: null,
      draft: null,
      published: null,
      entryState: "NONE",
    };
  }

  const experience = found.data;
  const [draftBundle, publishedBundle] = await Promise.all([
    loadDraftExperienceByOwner({
      organizationId,
      ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
      ownerId: flowId,
      purpose: ExperiencePurpose.LANDING,
      key: "default",
    }),
    loadPublishedExperienceByOwner({
      organizationId,
      ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
      ownerId: flowId,
      purpose: ExperiencePurpose.LANDING,
      key: "default",
    }),
  ]);

  const draftVersion =
    draftBundle.ok && draftBundle.data?.version
      ? draftBundle.data.version
      : null;
  const publishedVersion =
    publishedBundle.ok && publishedBundle.data?.version
      ? publishedBundle.data.version
      : null;

  const draft =
    draftVersion && draftVersion.status === ExperienceVersionStatus.DRAFT
      ? {
          versionId: draftVersion.id,
          versionNumber: draftVersion.versionNumber,
          blockCount: draftVersion.blocks.length,
          updatedAt: experience.updatedAt,
        }
      : null;

  const published = publishedVersion
    ? {
        versionId: publishedVersion.id,
        versionNumber: publishedVersion.versionNumber,
        publishedAt: publishedVersion.publishedAt,
        blockCount: publishedVersion.blocks.length,
      }
    : null;

  let entryState: FlowExperienceSummary["entryState"] = resolveExperienceEntryState({
    hasExperience: true,
    hasDraft: Boolean(draft),
    hasPublished: Boolean(published),
  });

  return {
    flowId,
    experience,
    draft,
    published,
    entryState,
  };
}

export async function loadFlowExperienceDraftBundle(
  organizationId: string,
  flowId: string,
): Promise<LoadedExperienceBundle | null> {
  const result = await loadDraftExperienceByOwner({
    organizationId,
    ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
    ownerId: flowId,
    purpose: ExperiencePurpose.LANDING,
    key: "default",
  });
  if (!result.ok || !result.data?.version) return null;
  if (result.data.version.status !== ExperienceVersionStatus.DRAFT) return null;
  return result.data;
}
