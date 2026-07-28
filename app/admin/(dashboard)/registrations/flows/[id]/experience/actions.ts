"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ExperienceBlockStatus,
  ExperienceOwnerType,
  ExperiencePurpose,
} from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  loadFlowExperienceDraftBundle,
  resolveFlowExperienceScope,
} from "@/lib/experience/admin/flow-experience-scope";
import {
  buildExperienceBlockConfigFromForm,
  canAddRegistrationFormBlock,
  canEnableRegistrationFormBlock,
  EXPERIENCE_ADMIN_PERMISSIONS,
  moveBlockInOrder,
  normalizeEnabledBlockStatus,
  validateBlockScheduleWindow,
} from "@/lib/experience/admin/form-helpers";
import { REGISTRATION_FORM_BLOCK_TYPE } from "@/lib/experience/blocks/registration-form";
import type { BlockMediaRole } from "@/lib/experience/media-types";
import {
  getBlockDefinition,
  isExperienceBlockType,
} from "@/lib/experience/registry";
import {
  addBlock,
  archiveDraftVersion,
  clonePublishedVersionToDraft,
  createExperience,
  deleteBlock,
  disableBlock,
  duplicateBlock,
  publishExperienceVersion,
  reorderBlocks,
  updateBlockConfig,
  updateBlockSettings,
  updateDraftVersionSeo,
  validateExperienceVersionForPublish,
  type ExperienceErrorCode,
  type ExperienceIssue,
} from "@/lib/experience/service";
import {
  assertOrganizationMediaIds,
  syncExperienceBlockMediaLinks,
} from "@/lib/experience/service/media-sync";
import { parseTehranDateTimeLocal } from "@/lib/forms/tehran-datetime";
import { prisma } from "@/lib/prisma";
import { getPublicRegistrationFlowPath } from "@/lib/registration/flows/public-url";

export type ExperienceActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

export type ExperiencePublishActionState = {
  formError?: string;
  successMessage?: string;
  issues?: ExperienceIssue[];
  validated?: boolean;
  published?: boolean;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readCheckbox(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "true" || value === "on" || value === "1";
}

function mapExperienceError(
  code: ExperienceErrorCode | string,
  fallback?: string,
): string {
  switch (code) {
    case "NOT_FOUND":
      return "مورد درخواستی یافت نشد.";
    case "OWNER_NOT_FOUND":
      return "مالک تجربه در این سازمان یافت نشد.";
    case "OWNER_ORG_MISMATCH":
      return "مالک تجربه با سازمان فعلی هم‌خوان نیست.";
    case "UNSUPPORTED_OWNER":
      return "این نوع مالک پشتیبانی نمی‌شود.";
    case "UNSUPPORTED_PURPOSE":
      return "این هدف تجربه پشتیبانی نمی‌شود.";
    case "INVALID_STATE":
      return "وضعیت فعلی اجازه این عملیات را نمی‌دهد.";
    case "DRAFT_EXISTS":
      return "پیش‌نویس فعال از قبل وجود دارد.";
    case "NO_DRAFT":
      return "پیش‌نویس قابل ویرایش یافت نشد.";
    case "VERSION_NOT_DRAFT":
      return "فقط نسخه پیش‌نویس قابل ویرایش است.";
    case "VERSION_IMMUTABLE":
      return "نسخه منتشرشده تغییرناپذیر است.";
    case "VALIDATION_FAILED":
      return "اعتبارسنجی ناموفق بود.";
    case "CONFLICT":
      return "تعارض همزمانی رخ داد؛ دوباره تلاش کنید.";
    case "MEDIA_INVALID":
      return "رسانه انتخاب‌شده نامعتبر است.";
    case "BLOCK_TYPE_UNKNOWN":
      return "نوع بلوک ناشناخته است.";
    case "BLOCK_CONFIG_INVALID":
      return "پیکربندی بلوک نامعتبر است.";
    default:
      return fallback ?? "عملیات انجام نشد.";
  }
}

function revalidateExperiencePaths(params: {
  flowId: string;
  publicSlug?: string | null;
}) {
  revalidatePath(`/admin/registrations/flows/${params.flowId}`);
  revalidatePath(`/admin/registrations/flows/${params.flowId}/experience`);
  revalidatePath(
    `/admin/registrations/flows/${params.flowId}/experience/preview`,
  );
  if (params.publicSlug) {
    revalidatePath(getPublicRegistrationFlowPath(params.publicSlug));
  }
}

async function requireFlowManageScope(flowId: string) {
  const session = await requirePermission(
    EXPERIENCE_ADMIN_PERMISSIONS.mutate,
  );
  const scope = await resolveFlowExperienceScope(session, flowId);
  if (!scope) return null;
  return { session, scope };
}

export async function createExperienceForFlowAction(
  formData: FormData,
): Promise<void> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return;

  const result = await createExperience({
    organizationId: managed.scope.organizationId,
    ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
    ownerId: flowId,
    purpose: ExperiencePurpose.LANDING,
    key: "default",
    title: `تجربه ${managed.scope.flow.title}`,
    actorUserId: managed.scope.actorUserId,
  });

  if (!result.ok) return;

  revalidateExperiencePaths({
    flowId,
    publicSlug: managed.scope.flow.slug,
  });
  redirect(`/admin/registrations/flows/${flowId}/experience`);
}

export async function clonePublishedToDraftAction(
  formData: FormData,
): Promise<void> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return;

  const experienceId = readString(formData, "experienceId").trim();
  if (!experienceId) return;

  const result = await clonePublishedVersionToDraft({
    organizationId: managed.scope.organizationId,
    experienceId,
    actorUserId: managed.scope.actorUserId,
  });
  if (!result.ok) return;

  revalidateExperiencePaths({
    flowId,
    publicSlug: managed.scope.flow.slug,
  });
  redirect(`/admin/registrations/flows/${flowId}/experience`);
}

export async function archiveDraftAction(formData: FormData): Promise<void> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return;

  const experienceId = readString(formData, "experienceId").trim();
  const versionId = readString(formData, "versionId").trim();
  if (!experienceId || !versionId) return;

  const result = await archiveDraftVersion({
    organizationId: managed.scope.organizationId,
    experienceId,
    versionId,
  });
  if (!result.ok) return;

  revalidateExperiencePaths({
    flowId,
    publicSlug: managed.scope.flow.slug,
  });
  redirect(`/admin/registrations/flows/${flowId}`);
}

export async function addBlockAction(formData: FormData): Promise<void> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return;

  const experienceId = readString(formData, "experienceId").trim();
  const versionId = readString(formData, "versionId").trim();
  const type = readString(formData, "type").trim();
  if (!experienceId || !versionId || !isExperienceBlockType(type)) return;

  if (type === REGISTRATION_FORM_BLOCK_TYPE) {
    const draft = await loadFlowExperienceDraftBundle(
      managed.scope.organizationId,
      flowId,
    );
    const hasEnabledForm = !canAddRegistrationFormBlock(
      draft?.version?.blocks ?? [],
    );
    if (hasEnabledForm) return;
  }

  const result = await addBlock({
    organizationId: managed.scope.organizationId,
    experienceId,
    versionId,
    type,
  });
  if (!result.ok) return;

  revalidateExperiencePaths({
    flowId,
    publicSlug: managed.scope.flow.slug,
  });
  redirect(
    `/admin/registrations/flows/${flowId}/experience?blockId=${encodeURIComponent(result.data.blockId)}`,
  );
}

export async function updateBlockAction(
  _prev: ExperienceActionState,
  formData: FormData,
): Promise<ExperienceActionState> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return { formError: "دسترسی مجاز نیست یا جریان یافت نشد." };

  const blockId = readString(formData, "blockId").trim();
  if (!blockId) return { formError: "شناسه بلوک الزامی است." };

  const block = await prisma.experienceBlock.findFirst({
    where: {
      id: blockId,
      organizationId: managed.scope.organizationId,
      deletedAt: null,
      experienceVersion: {
        experience: {
          ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
          ownerId: flowId,
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      type: true,
    },
  });

  if (!block || !isExperienceBlockType(block.type)) {
    return { formError: "بلوک یافت نشد یا نوع آن پشتیبانی نمی‌شود." };
  }

  const definition = getBlockDefinition(block.type);
  const rawConfig = buildExperienceBlockConfigFromForm(block.type, formData);
  const configResult = await updateBlockConfig({
    organizationId: managed.scope.organizationId,
    blockId,
    config: rawConfig,
  });
  if (!configResult.ok) {
    return {
      formError:
        configResult.message ||
        mapExperienceError(configResult.code, "ذخیره پیکربندی ناموفق بود."),
    };
  }

  const clearSchedule = readCheckbox(formData, "clearSchedule");
  let opensAt: Date | null;
  let closesAt: Date | null;
  if (clearSchedule) {
    opensAt = null;
    closesAt = null;
  } else {
    const opensRaw = readString(formData, "opensAt").trim();
    const closesRaw = readString(formData, "closesAt").trim();
    if (opensRaw) {
      const parsed = parseTehranDateTimeLocal(opensRaw);
      if (!parsed) return { formError: "تاریخ شروع نمایش نامعتبر است." };
      opensAt = parsed;
    } else {
      opensAt = null;
    }
    if (closesRaw) {
      const parsed = parseTehranDateTimeLocal(closesRaw);
      if (!parsed) return { formError: "تاریخ پایان نمایش نامعتبر است." };
      closesAt = parsed;
    } else {
      closesAt = null;
    }
    if (opensAt && closesAt) {
      const schedule = validateBlockScheduleWindow(opensAt, closesAt);
      if (!schedule.ok) return { formError: schedule.error };
    }
  }

  const statusRaw = readString(formData, "status").trim();
  const status = normalizeEnabledBlockStatus(statusRaw);

  const settingsResult = await updateBlockSettings({
    organizationId: managed.scope.organizationId,
    blockId,
    status,
    opensAt,
    closesAt,
  });
  if (!settingsResult.ok) {
    return {
      formError:
        settingsResult.message ||
        mapExperienceError(settingsResult.code, "ذخیره تنظیمات ناموفق بود."),
    };
  }

  const formMedia: Partial<Record<BlockMediaRole, string | null>> = {};
  for (const role of definition.mediaRoles) {
    const id = readString(formData, `media_${role}`).trim();
    formMedia[role] = id || null;
  }
  const links = definition.extractMediaLinks(formMedia);

  try {
    await prisma.$transaction(async (tx) => {
      const mediaCheck = await assertOrganizationMediaIds(
        tx,
        managed.scope.organizationId,
        links.map((link) => link.mediaId),
      );
      if (!mediaCheck.ok) {
        throw new Error(mediaCheck.error);
      }
      await syncExperienceBlockMediaLinks(tx, {
        organizationId: managed.scope.organizationId,
        blockId,
        links,
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "همگام‌سازی رسانه ناموفق بود.";
    return { formError: message };
  }

  revalidateExperiencePaths({
    flowId,
    publicSlug: managed.scope.flow.slug,
  });
  return { successMessage: "بلوک ذخیره شد." };
}

export async function duplicateBlockAction(formData: FormData): Promise<void> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return;

  const blockId = readString(formData, "blockId").trim();
  if (!blockId) return;

  const result = await duplicateBlock({
    organizationId: managed.scope.organizationId,
    blockId,
  });
  if (!result.ok) return;

  revalidateExperiencePaths({
    flowId,
    publicSlug: managed.scope.flow.slug,
  });
  redirect(
    `/admin/registrations/flows/${flowId}/experience?blockId=${encodeURIComponent(result.data.blockId)}`,
  );
}

export async function reorderBlockAction(formData: FormData): Promise<void> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return;

  const experienceId = readString(formData, "experienceId").trim();
  const versionId = readString(formData, "versionId").trim();
  const blockId = readString(formData, "blockId").trim();
  const direction = readString(formData, "direction").trim();
  if (!experienceId || !versionId || !blockId) return;
  if (direction !== "up" && direction !== "down") return;

  const draft = await loadFlowExperienceDraftBundle(
    managed.scope.organizationId,
    flowId,
  );
  if (!draft?.version || draft.version.id !== versionId) return;

  const orderedIds = draft.version.blocks.map((block) => block.id);
  const next = moveBlockInOrder(orderedIds, blockId, direction);
  if (!next) return;

  const result = await reorderBlocks({
    organizationId: managed.scope.organizationId,
    experienceId,
    versionId,
    orderedBlockIds: next,
  });
  if (!result.ok) return;

  revalidateExperiencePaths({
    flowId,
    publicSlug: managed.scope.flow.slug,
  });
}

export async function setBlockEnabledAction(formData: FormData): Promise<void> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return;

  const blockId = readString(formData, "blockId").trim();
  const enabledRaw = readString(formData, "enabled").trim();
  if (!blockId) return;

  const enabled = enabledRaw === "true" || enabledRaw === "1";

  if (enabled) {
    const block = await prisma.experienceBlock.findFirst({
      where: {
        id: blockId,
        organizationId: managed.scope.organizationId,
        deletedAt: null,
      },
      select: { type: true },
    });
    if (!block) return;
    if (block.type === REGISTRATION_FORM_BLOCK_TYPE) {
      const draft = await loadFlowExperienceDraftBundle(
        managed.scope.organizationId,
        flowId,
      );
      if (
        !canEnableRegistrationFormBlock(draft?.version?.blocks ?? [], blockId)
      ) {
        return;
      }
    }
  }

  const result = enabled
    ? await updateBlockSettings({
        organizationId: managed.scope.organizationId,
        blockId,
        status: ExperienceBlockStatus.PUBLISHED,
      })
    : await disableBlock({
        organizationId: managed.scope.organizationId,
        blockId,
      });
  if (!result.ok) return;

  revalidateExperiencePaths({
    flowId,
    publicSlug: managed.scope.flow.slug,
  });
}

export async function deleteBlockAction(formData: FormData): Promise<void> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return;

  const blockId = readString(formData, "blockId").trim();
  if (!blockId) return;

  const result = await deleteBlock({
    organizationId: managed.scope.organizationId,
    blockId,
  });
  if (!result.ok) return;

  revalidateExperiencePaths({
    flowId,
    publicSlug: managed.scope.flow.slug,
  });
  redirect(`/admin/registrations/flows/${flowId}/experience`);
}

export async function updateSeoAction(
  _prev: ExperienceActionState,
  formData: FormData,
): Promise<ExperienceActionState> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return { formError: "دسترسی مجاز نیست یا جریان یافت نشد." };

  const experienceId = readString(formData, "experienceId").trim();
  const versionId = readString(formData, "versionId").trim();
  if (!experienceId || !versionId) {
    return { formError: "شناسه تجربه یا نسخه نامعتبر است." };
  }

  const seoTitle = readString(formData, "seoTitle").trim();
  const seoDescription = readString(formData, "seoDescription").trim();
  const seoImageRaw = readString(formData, "seoImageMediaId").trim();

  const result = await updateDraftVersionSeo({
    organizationId: managed.scope.organizationId,
    experienceId,
    versionId,
    seoTitle: seoTitle || null,
    seoDescription: seoDescription || null,
    seoImageMediaId: seoImageRaw || null,
  });

  if (!result.ok) {
    return {
      formError:
        result.message ||
        mapExperienceError(result.code, "ذخیره SEO ناموفق بود."),
    };
  }

  revalidateExperiencePaths({
    flowId,
    publicSlug: managed.scope.flow.slug,
  });
  return { successMessage: "تنظیمات SEO ذخیره شد." };
}

export async function validatePublishExperienceAction(
  _prev: ExperiencePublishActionState,
  formData: FormData,
): Promise<ExperiencePublishActionState> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return { formError: "دسترسی مجاز نیست یا جریان یافت نشد." };

  const experienceId = readString(formData, "experienceId").trim();
  const draftVersionId = readString(formData, "draftVersionId").trim();
  if (!experienceId || !draftVersionId) {
    return { formError: "شناسه تجربه یا پیش‌نویس نامعتبر است." };
  }

  const draft = await loadFlowExperienceDraftBundle(
    managed.scope.organizationId,
    flowId,
  );
  if (
    !draft?.version ||
    draft.experience.id !== experienceId ||
    draft.version.id !== draftVersionId
  ) {
    return { formError: "پیش‌نویس قابل اعتبارسنجی یافت نشد." };
  }

  const validation = validateExperienceVersionForPublish({
    versionId: draft.version.id,
    experienceId: draft.experience.id,
    organizationId: managed.scope.organizationId,
    purpose: draft.experience.purpose,
    ownerExists: true,
    blocks: draft.version.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      status: block.status,
      sortOrder: block.sortOrder,
      config: block.rawConfig,
      mediaLinks: block.mediaLinks.map((link) => ({
        role: link.role,
        mediaId: link.mediaId,
        sortOrder: link.sortOrder,
      })),
    })),
  });

  if (!validation.ok) {
    return {
      validated: false,
      formError: "قبل از انتشار باید خطاهای زیر برطرف شوند.",
      issues: validation.issues,
    };
  }

  return {
    validated: true,
    successMessage: "پیش‌نویس برای انتشار آماده است.",
    issues: [],
  };
}

export async function publishExperienceAction(
  _prev: ExperiencePublishActionState,
  formData: FormData,
): Promise<ExperiencePublishActionState> {
  const flowId = readString(formData, "flowId").trim();
  const managed = await requireFlowManageScope(flowId);
  if (!managed) return { formError: "دسترسی مجاز نیست یا جریان یافت نشد." };

  const experienceId = readString(formData, "experienceId").trim();
  const draftVersionId = readString(formData, "draftVersionId").trim();
  if (!experienceId || !draftVersionId) {
    return { formError: "شناسه تجربه یا پیش‌نویس نامعتبر است." };
  }

  const result = await publishExperienceVersion({
    organizationId: managed.scope.organizationId,
    experienceId,
    expectedDraftVersionId: draftVersionId,
    actorUserId: managed.scope.actorUserId,
  });

  if (!result.ok) {
    return {
      published: false,
      formError:
        result.message || mapExperienceError(result.code, "انتشار ناموفق بود."),
      issues: result.issues,
    };
  }

  revalidateExperiencePaths({
    flowId,
    publicSlug: managed.scope.flow.slug,
  });

  return {
    published: true,
    successMessage:
      "نسخه با موفقیت منتشر شد. یک پیش‌نویس تازه برای ویرایش‌های بعدی ساخته شد.",
  };
}
