/**
 * Dependency graph for MediaAsset safe-delete (hard-block when referenced).
 */

import { prisma } from "@/lib/prisma";

export type MediaDependency = {
  kind: string;
  label: string;
  detail: string;
  href?: string;
};

export type MediaDependencyReport = {
  canDelete: boolean;
  dependencies: MediaDependency[];
};

export async function getMediaAssetDependencies(
  organizationId: string,
  mediaId: string,
): Promise<MediaDependencyReport> {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: mediaId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!asset) {
    return { canDelete: false, dependencies: [] };
  }

  const [
    albumItems,
    albumCovers,
    placements,
    teamMembers,
    students,
    achievementCovers,
    achievementCerts,
    formPosters,
    marketingCards,
    pageSectionMedia,
  ] = await Promise.all([
    prisma.galleryAlbumItem.findMany({
      where: {
        mediaId,
        album: { organizationId, deletedAt: null },
      },
      select: {
        id: true,
        album: { select: { id: true, title: true, slug: true } },
      },
      take: 50,
    }),
    prisma.galleryAlbum.findMany({
      where: { organizationId, coverMediaId: mediaId, deletedAt: null },
      select: { id: true, title: true, slug: true },
      take: 50,
    }),
    prisma.mediaPlacement.findMany({
      where: { organizationId, mediaId, deletedAt: null },
      select: { id: true, placementKey: true, sortOrder: true },
      take: 50,
    }),
    prisma.teamMember.findMany({
      where: { organizationId, portraitMediaId: mediaId, deletedAt: null },
      select: { id: true, fullName: true, slug: true },
      take: 50,
    }),
    prisma.student.findMany({
      where: { organizationId, portraitMediaId: mediaId, deletedAt: null },
      select: { id: true, fullName: true, slug: true },
      take: 50,
    }),
    prisma.achievement.findMany({
      where: { organizationId, coverMediaId: mediaId, deletedAt: null },
      select: { id: true, title: true, slug: true },
      take: 50,
    }),
    prisma.achievement.findMany({
      where: { organizationId, certificateMediaId: mediaId, deletedAt: null },
      select: { id: true, title: true, slug: true },
      take: 50,
    }),
    prisma.formVersion.findMany({
      where: {
        posterMediaId: mediaId,
        form: { organizationId, deletedAt: null },
      },
      select: {
        id: true,
        versionNumber: true,
        form: { select: { id: true, slug: true } },
      },
      take: 50,
    }),
    prisma.websiteMarketingCard.findMany({
      where: { organizationId, imageMediaId: mediaId, deletedAt: null },
      select: { id: true, title: true, sectionKey: true },
      take: 50,
    }),
    prisma.websitePageSectionMedia.findMany({
      where: {
        organizationId,
        mediaId,
        section: { deletedAt: null, page: { deletedAt: null } },
      },
      select: {
        id: true,
        role: true,
        section: {
          select: {
            id: true,
            type: true,
            page: { select: { id: true, title: true } },
          },
        },
      },
      take: 50,
    }),
  ]);

  const dependencies: MediaDependency[] = [];

  for (const item of albumItems) {
    dependencies.push({
      kind: "gallery_album_item",
      label: "آیتم آلبوم گالری",
      detail: `آلبوم «${item.album.title}»`,
      href: `/admin/website/gallery/${item.album.id}`,
    });
  }

  for (const album of albumCovers) {
    dependencies.push({
      kind: "gallery_album_cover",
      label: "کاور آلبوم گالری",
      detail: `آلبوم «${album.title}»`,
      href: `/admin/website/gallery/${album.id}`,
    });
  }

  for (const placement of placements) {
    dependencies.push({
      kind: "media_placement",
      label: "جایگاه رسانه",
      detail: `${placement.placementKey} (ترتیب ${placement.sortOrder})`,
      href: "/admin/website/media/placements",
    });
  }

  for (const member of teamMembers) {
    dependencies.push({
      kind: "team_portrait",
      label: "پرتره عضو تیم",
      detail: member.fullName,
      href: `/admin/website/team/${member.id}`,
    });
  }

  for (const student of students) {
    dependencies.push({
      kind: "student_portrait",
      label: "پرتره دانش‌آموز",
      detail: student.fullName,
      href: `/admin/website/students/${student.id}`,
    });
  }

  for (const achievement of achievementCovers) {
    dependencies.push({
      kind: "achievement_cover",
      label: "کاور افتخار",
      detail: achievement.title,
      href: `/admin/website/achievements/${achievement.id}`,
    });
  }

  for (const achievement of achievementCerts) {
    dependencies.push({
      kind: "achievement_certificate",
      label: "گواهی افتخار",
      detail: achievement.title,
      href: `/admin/website/achievements/${achievement.id}`,
    });
  }

  for (const version of formPosters) {
    dependencies.push({
      kind: "form_poster",
      label: "پوستر فرم",
      detail: `فرم «${version.form.slug}» (نسخه ${version.versionNumber})`,
      href: `/admin/forms/${version.form.id}`,
    });
  }

  for (const card of marketingCards) {
    dependencies.push({
      kind: "website_marketing_card",
      label: "کارت نمایندگی",
      detail: `«${card.title}» (${card.sectionKey})`,
      href: `/admin/website/marketing-cards/${card.id}`,
    });
  }

  for (const link of pageSectionMedia) {
    dependencies.push({
      kind: "website_page_section_media",
      label: "بخش صفحه‌ساز",
      detail: `صفحه «${link.section.page.title}» · بخش ${link.section.type} (${link.role})`,
      href: `/admin/website/pages/${link.section.page.id}`,
    });
  }

  return {
    canDelete: dependencies.length === 0,
    dependencies,
  };
}
