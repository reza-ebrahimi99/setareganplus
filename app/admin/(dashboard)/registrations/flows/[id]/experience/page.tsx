import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createElement } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExperienceEditorShell } from "@/components/admin/experience/ExperienceEditorShell";
import type {
  ExperienceAdminBlockDto,
  ExperienceSeoDto,
} from "@/components/admin/experience/types";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { loadFlowExperienceDraftBundle } from "@/lib/experience/admin/flow-experience-scope";
import { REGISTRATION_FORM_BLOCK_TYPE } from "@/lib/experience/blocks/registration-form";
import type { BlockMediaRole } from "@/lib/experience/media-types";
import {
  adminEditorChromeFromRegistry,
  getBlockDefinition,
  getDefaultBlockConfig,
  isEnabledBlockStatus,
  isExperienceBlockType,
  loadAdminBlockEditor,
  type ExperienceBlockType,
} from "@/lib/experience";
import { publicUrlForStorageKey } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ blockId?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `ویرایش تجربه ${id.slice(0, 8)}` };
}

export default async function AdminFlowExperienceEditorPage({
  params,
  searchParams,
}: PageProps) {
  const session = await requirePermission("registration_flows.manage");
  const canManage = hasPermission(session, "registration_flows.manage");
  const { id: flowId } = await params;
  const { blockId: selectedBlockIdRaw } = await searchParams;
  const selectedBlockId = selectedBlockIdRaw?.trim() || null;

  const draft = await loadFlowExperienceDraftBundle(
    session.organization.id,
    flowId,
  );
  if (!draft?.version) {
    redirect(`/admin/registrations/flows/${flowId}`);
  }

  const version = draft.version;
  const blocks: ExperienceAdminBlockDto[] = version.blocks.map((block) => {
    const definition = isExperienceBlockType(block.type)
      ? getBlockDefinition(block.type)
      : null;
    const mediaValues: ExperienceAdminBlockDto["mediaValues"] = {};
    for (const link of block.mediaLinks) {
      const role = link.role as BlockMediaRole;
      if (!mediaValues[role]) {
        mediaValues[role] = {
          mediaId: link.mediaId,
          url: link.url,
          title: link.title ?? link.altText,
        };
      }
    }
    return {
      id: block.id,
      type: block.type,
      labelFa: definition?.labelFa ?? block.type,
      status: block.status,
      enabled: isEnabledBlockStatus(block.status),
      sortOrder: block.sortOrder,
      opensAtIso: block.opensAt ? block.opensAt.toISOString() : null,
      closesAtIso: block.closesAt ? block.closesAt.toISOString() : null,
      diagnostics: block.diagnostics,
      mediaRoles: definition?.mediaRoles ?? [],
      mediaValues,
    };
  });

  const selectedLoaded = selectedBlockId
    ? version.blocks.find((block) => block.id === selectedBlockId)
    : null;
  const selectedDto =
    blocks.find((block) => block.id === selectedBlockId) ?? null;

  let settingsEditor = null;
  if (selectedLoaded && selectedDto && isExperienceBlockType(selectedLoaded.type)) {
    const type = selectedLoaded.type as ExperienceBlockType;
    const Editor = await loadAdminBlockEditor(type);
    const chrome = adminEditorChromeFromRegistry(type);
    const config =
      selectedLoaded.config ?? getDefaultBlockConfig(type);
    settingsEditor = createElement(Editor as never, {
      ...chrome,
      config: config as never,
      fieldErrors: {},
      disabled: !canManage,
    });
  }

  let seoImagePreviewUrl: string | null = null;
  let seoImagePreviewTitle: string | null = null;
  if (version.seoImageMediaId) {
    const media = await prisma.mediaAsset.findFirst({
      where: {
        id: version.seoImageMediaId,
        organizationId: session.organization.id,
        deletedAt: null,
        status: "ACTIVE",
      },
      select: { storageKey: true, title: true, altText: true },
    });
    if (media) {
      seoImagePreviewUrl = publicUrlForStorageKey(media.storageKey);
      seoImagePreviewTitle = media.title ?? media.altText;
    }
  }

  const seo: ExperienceSeoDto = {
    seoTitle: version.seoTitle ?? "",
    seoDescription: version.seoDescription ?? "",
    seoImageMediaId: version.seoImageMediaId,
    seoImagePreviewUrl,
    seoImagePreviewTitle,
  };

  const hasEnabledRegistrationForm = version.blocks.some(
    (block) =>
      block.type === REGISTRATION_FORM_BLOCK_TYPE &&
      isEnabledBlockStatus(block.status),
  );

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="ویرایشگر تجربه"
        description={draft.experience.title}
        breadcrumbs={[
          ...adminBreadcrumbs.registrationFlowDetail.slice(0, -1),
          {
            label: "ویرایش جریان",
            href: `/admin/registrations/flows/${flowId}`,
          },
          { label: "تجربه" },
        ]}
        compact
      />
      <ExperienceEditorShell
        flowId={flowId}
        experienceId={draft.experience.id}
        draftVersionId={version.id}
        draftVersionNumber={version.versionNumber}
        flowTitle={draft.experience.title}
        blocks={blocks}
        seo={seo}
        canManage={canManage}
        selectedBlockId={selectedDto ? selectedDto.id : null}
        hasEnabledRegistrationForm={hasEnabledRegistrationForm}
        settingsEditor={settingsEditor}
      />
    </div>
  );
}
