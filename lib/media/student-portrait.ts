/**
 * Student portrait helpers — reuses Team portrait processing; only keys/kind differ.
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  buildTeamPortraitMetadata,
  processTeamPortraitUpload,
  publicPortraitUrl,
  teamPortraitMetadataToJson,
  teamPortraitStorageKeysToUnlink,
  type TeamPortraitMediaMetadata,
  type TeamPortraitVariantMeta,
  type TeamPortraitVariantSize,
} from "@/lib/media/team-portrait";

export {
  processTeamPortraitUpload as processStudentPortraitUpload,
  publicPortraitUrl as publicStudentPortraitUrl,
  teamPortraitStorageKeysToUnlink as studentPortraitStorageKeysToUnlink,
};
export type { TeamPortraitVariantSize as StudentPortraitVariantSize };

export function generateStudentPortraitVariantKeys(): {
  w480: string;
  w960: string;
} {
  const id = randomBytes(16).toString("hex");
  return {
    w480: `students/${id}-480.webp`,
    w960: `students/${id}-960.webp`,
  };
}

export function buildStudentPortraitMetadata(params: {
  w480: TeamPortraitVariantMeta;
  w960: TeamPortraitVariantMeta;
}): TeamPortraitMediaMetadata {
  const base = buildTeamPortraitMetadata(params);
  return { ...base, kind: "student-portrait" };
}

export function studentPortraitMetadataToJson(
  metadata: TeamPortraitMediaMetadata,
): Prisma.InputJsonObject {
  return teamPortraitMetadataToJson(metadata);
}
