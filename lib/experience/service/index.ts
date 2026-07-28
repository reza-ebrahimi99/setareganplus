/**
 * Experience service layer — server-side only.
 * Routes/actions must call these APIs; do not query Experience Prisma models directly.
 */

export type {
  ExperienceErrorCode,
  ExperienceIssue,
  ExperienceResult,
} from "@/lib/experience/service/types";
export { failResult, issue, okResult } from "@/lib/experience/service/types";

export {
  assertRegistrationFlowOwner,
  assertSupportedOwnerPurpose,
  resolveSupportedOwner,
} from "@/lib/experience/service/owner";

export {
  validateExperienceVersionForPublish,
  isEnabledBlockStatus,
  type PublishBlockInput,
  type PublishValidationContext,
  type PublishValidationResult,
} from "@/lib/experience/service/validate-publish";

export {
  archiveExperience,
  createExperience,
  findExperienceByOwner,
  getOrCreateDraftExperience,
  type CreateExperienceInput,
  type ExperienceRecord,
} from "@/lib/experience/service/experience-service";

export {
  archiveDraftVersion,
  clonePublishedVersionToDraft,
  createDraftVersion,
  getActivePublishedVersion,
  getEditableDraftVersion,
  publishExperienceVersion,
  updateDraftVersionSeo,
} from "@/lib/experience/service/version-service";

export {
  addBlock,
  attachBlockMedia,
  deleteBlock,
  detachBlockMedia,
  disableBlock,
  duplicateBlock,
  reorderBlocks,
  updateBlockConfig,
  updateBlockSettings,
} from "@/lib/experience/service/block-service";

export {
  EXPERIENCE_RUNTIME_OWNER,
  EXPERIENCE_RUNTIME_PURPOSE,
  loadDraftExperienceByOwner,
  loadExperienceByOwner,
  loadExperienceVersion,
  loadPublishedExperienceByOwner,
  loadPublishedExperienceVersion,
  type LoadedBlockMediaLink,
  type LoadedExperienceBlock,
  type LoadedExperienceBundle,
  type LoadedExperienceVersion,
} from "@/lib/experience/service/loaders";
