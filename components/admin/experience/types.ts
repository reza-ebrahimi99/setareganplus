import type { BlockMediaRole } from "@/lib/experience/media-types";
import type { ExperienceIssue } from "@/lib/experience/service/types";

export type SerializableFlowExperienceSummary = {
  flowId: string;
  experienceId: string | null;
  draft: {
    versionId: string;
    versionNumber: number;
    blockCount: number;
    updatedAtIso: string;
  } | null;
  published: {
    versionId: string;
    versionNumber: number;
    publishedAtIso: string | null;
    blockCount: number;
  } | null;
  entryState: "NONE" | "PUBLISHED_ONLY" | "DRAFT_ACTIVE";
};

export type ExperienceAdminBlockDto = {
  id: string;
  type: string;
  labelFa: string;
  status: string;
  enabled: boolean;
  sortOrder: number;
  opensAtIso: string | null;
  closesAtIso: string | null;
  diagnostics: ExperienceIssue[];
  mediaRoles: readonly BlockMediaRole[];
  mediaValues: Partial<
    Record<
      BlockMediaRole,
      { mediaId: string; url: string | null; title: string | null }
    >
  >;
};

export type ExperienceSeoDto = {
  seoTitle: string;
  seoDescription: string;
  seoImageMediaId: string | null;
  seoImagePreviewUrl: string | null;
  seoImagePreviewTitle: string | null;
};
