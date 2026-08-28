import { prisma } from "@/lib/prisma";

export async function ensureExperienceProfile(params: {
  organizationId: string;
  userId: string;
  displayName: string;
}): Promise<{ id: string; displayName: string | null; interests: string | null }> {
  const existing = await prisma.experienceProfile.findUnique({
    where: {
      organizationId_userId: {
        organizationId: params.organizationId,
        userId: params.userId,
      },
    },
    select: {
      id: true,
      displayName: true,
      interests: true,
      deletedAt: true,
    },
  });

  if (existing && !existing.deletedAt) {
    return {
      id: existing.id,
      displayName: existing.displayName,
      interests: existing.interests,
    };
  }

  if (existing?.deletedAt) {
    const restored = await prisma.experienceProfile.update({
      where: { id: existing.id },
      data: {
        deletedAt: null,
        displayName: existing.displayName ?? params.displayName,
      },
      select: { id: true, displayName: true, interests: true },
    });
    return restored;
  }

  return prisma.experienceProfile.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      displayName: params.displayName,
    },
    select: { id: true, displayName: true, interests: true },
  });
}
