import { ExperienceFileKind, ExperienceTimelineVisibility } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  canViewerAccessExperienceFile,
  guardianFileAccessFlags,
} from "@/lib/sxp/engine/file-visibility";
import { ensureExperienceProfile } from "@/lib/sxp/profile";
import type { PortalContext } from "@/lib/portal/auth/types";

export type ExperienceFileDto = {
  id: string;
  title: string;
  kind: ExperienceFileKind;
  mime: string | null;
  createdAt: Date;
  downloadHref: string;
};

export type ExperienceFilesPageDto = {
  displayName: string;
  files: ExperienceFileDto[];
};

export async function loadExperienceFiles(
  context: PortalContext,
): Promise<ExperienceFilesPageDto> {
  const profile = await ensureExperienceProfile({
    organizationId: context.organization.id,
    userId: context.user.id,
    displayName: context.user.displayName,
  });

  const flags = guardianFileAccessFlags(context.authorizedStudents);
  const rows = await prisma.experienceFile.findMany({
    where: {
      organizationId: context.organization.id,
      userId: context.user.id,
      visibility: {
        in: [
          ExperienceTimelineVisibility.SELF,
          ExperienceTimelineVisibility.GUARDIANS,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const files = rows
    .filter((row) =>
      canViewerAccessExperienceFile({
        ownerUserId: row.userId,
        viewerUserId: context.user.id,
        visibility: row.visibility,
        kind: row.kind,
        accountType: context.activeLink.accountType,
        canViewCertificates: flags.canViewCertificates,
        canViewAcademicData: flags.canViewAcademicData,
      }),
    )
    .map((row) => ({
      id: row.id,
      title: row.title,
      kind: row.kind,
      mime: row.mime,
      createdAt: row.createdAt,
      downloadHref: `/portal/files/${row.id}`,
    }));

  return {
    displayName: profile.displayName ?? context.user.displayName,
    files,
  };
}
