import {
  ExperienceFileKind,
  ExperienceTimelineVisibility,
  PortalAccountType,
} from "@/generated/prisma/enums";

const ACADEMIC_FILE_KINDS = new Set<ExperienceFileKind>([
  ExperienceFileKind.BOOKLET,
  ExperienceFileKind.BOOK,
]);

export function guardianFileAccessFlags(
  students: Array<{
    canViewCertificates: boolean;
    canViewAcademicData: boolean;
  }>,
): { canViewCertificates: boolean; canViewAcademicData: boolean } {
  return {
    canViewCertificates: students.some((student) => student.canViewCertificates),
    canViewAcademicData: students.some((student) => student.canViewAcademicData),
  };
}

/**
 * Pure Hub visibility for ExperienceFile rows.
 * Never consults booking/CRM/commerce tables.
 */
export function canViewerAccessExperienceFile(input: {
  ownerUserId: string;
  viewerUserId: string;
  visibility: ExperienceTimelineVisibility;
  kind: ExperienceFileKind;
  accountType: PortalAccountType;
  canViewCertificates: boolean;
  canViewAcademicData: boolean;
}): boolean {
  if (input.ownerUserId !== input.viewerUserId) return false;
  if (
    input.visibility !== ExperienceTimelineVisibility.SELF &&
    input.visibility !== ExperienceTimelineVisibility.GUARDIANS
  ) {
    return false;
  }

  const isGuardian = input.accountType === PortalAccountType.GUARDIAN;

  if (!isGuardian) return true;

  if (input.kind === ExperienceFileKind.CERTIFICATE) {
    return input.canViewCertificates;
  }
  if (ACADEMIC_FILE_KINDS.has(input.kind)) {
    return input.canViewAcademicData;
  }
  return true;
}
