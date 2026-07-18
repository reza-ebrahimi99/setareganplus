"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import { tryUnlinkMediaFile, writeMediaFile } from "@/lib/media/storage";
import {
  buildTeamPortraitMetadata,
  generateTeamPortraitVariantKeys,
  processTeamPortraitUpload,
  teamPortraitMetadataToJson,
  teamPortraitStorageKeysToUnlink,
} from "@/lib/media/team-portrait";
import { prisma } from "@/lib/prisma";
import {
  departmentSlugFromName,
  ensureDefaultTeamDepartments,
} from "@/lib/website/team-departments";
import { normalizeTeamSlug, slugFromFullName } from "@/lib/website/team-slug";

export type TeamActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readOptionalUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value) && !value.startsWith("mailto:")) {
    return `https://${value}`;
  }
  return value.slice(0, 300);
}

function revalidateTeam(slug?: string) {
  revalidatePath("/admin/website/team");
  revalidatePath("/admin/website/team/departments");
  revalidatePath("/");
  revalidatePath("/team");
  if (slug) revalidatePath(`/team/${slug}`);
}

async function uniqueMemberSlug(
  organizationId: string,
  desired: string,
  excludeId?: string,
): Promise<string> {
  let base = normalizeTeamSlug(desired);
  if (base.length < 2) base = `member-${Date.now().toString(36)}`;
  let candidate = base;
  for (let i = 0; i < 20; i += 1) {
    const hit = await prisma.teamMember.findFirst({
      where: {
        organizationId,
        slug: candidate,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!hit) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createTeamMemberAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  await ensureDefaultTeamDepartments(organizationId);

  const fullName = readString(formData, "fullName").trim().slice(0, 120);
  const roleTitle = readString(formData, "roleTitle").trim().slice(0, 160);
  const departmentId = readString(formData, "departmentId").trim();
  const biography = readString(formData, "biography").trim().slice(0, 5000);
  const specialty = readString(formData, "specialty").trim().slice(0, 200) || null;
  const email = readString(formData, "email").trim().slice(0, 160) || null;
  const phone = readString(formData, "phone").trim().slice(0, 40) || null;
  const slugInput = readString(formData, "slug").trim();
  const fieldErrors: Record<string, string> = {};

  if (!fullName) fieldErrors.fullName = "نام کامل الزامی است.";
  if (!roleTitle) fieldErrors.roleTitle = "سمت الزامی است.";
  if (!departmentId) fieldErrors.departmentId = "دپارتمان الزامی است.";

  const department = departmentId
    ? await prisma.teamDepartment.findFirst({
        where: { id: departmentId, organizationId, deletedAt: null },
        select: { id: true },
      })
    : null;
  if (departmentId && !department) {
    fieldErrors.departmentId = "دپارتمان معتبر نیست.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors };
  }

  const slug = await uniqueMemberSlug(
    organizationId,
    slugInput || slugFromFullName(fullName),
  );

  const displayOrder = Number(readString(formData, "displayOrder") || "0");
  const featuredPriority = Number(
    readString(formData, "featuredPriority") || "0",
  );

  await prisma.teamMember.create({
    data: {
      organizationId,
      departmentId: department!.id,
      fullName,
      roleTitle,
      biography,
      specialty,
      email,
      phone,
      instagramUrl: readOptionalUrl(readString(formData, "instagramUrl")),
      linkedinUrl: readOptionalUrl(readString(formData, "linkedinUrl")),
      websiteUrl: readOptionalUrl(readString(formData, "websiteUrl")),
      slug,
      seoTitle: readString(formData, "seoTitle").trim().slice(0, 160) || null,
      seoDescription:
        readString(formData, "seoDescription").trim().slice(0, 320) || null,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      featuredPriority: Number.isFinite(featuredPriority)
        ? featuredPriority
        : 0,
      isActive: readString(formData, "isActive") === "true",
      isFeatured: readString(formData, "isFeatured") === "true",
    },
  });

  revalidateTeam(slug);
  return { successMessage: "عضو تیم با موفقیت ثبت شد." };
}

export async function updateTeamMemberAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const memberId = readString(formData, "memberId").trim();

  const existing = await prisma.teamMember.findFirst({
    where: { id: memberId, organizationId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!existing) return { formError: "عضو تیم یافت نشد." };

  const fullName = readString(formData, "fullName").trim().slice(0, 120);
  const roleTitle = readString(formData, "roleTitle").trim().slice(0, 160);
  const departmentId = readString(formData, "departmentId").trim();
  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.fullName = "نام کامل الزامی است.";
  if (!roleTitle) fieldErrors.roleTitle = "سمت الزامی است.";
  if (!departmentId) fieldErrors.departmentId = "دپارتمان الزامی است.";

  const department = await prisma.teamDepartment.findFirst({
    where: { id: departmentId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!department) fieldErrors.departmentId = "دپارتمان معتبر نیست.";
  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors };
  }

  const slug = await uniqueMemberSlug(
    organizationId,
    readString(formData, "slug").trim() || slugFromFullName(fullName),
    existing.id,
  );
  const displayOrder = Number(readString(formData, "displayOrder") || "0");
  const featuredPriority = Number(
    readString(formData, "featuredPriority") || "0",
  );

  await prisma.teamMember.update({
    where: { id: existing.id },
    data: {
      departmentId: department!.id,
      fullName,
      roleTitle,
      biography: readString(formData, "biography").trim().slice(0, 5000),
      specialty: readString(formData, "specialty").trim().slice(0, 200) || null,
      email: readString(formData, "email").trim().slice(0, 160) || null,
      phone: readString(formData, "phone").trim().slice(0, 40) || null,
      instagramUrl: readOptionalUrl(readString(formData, "instagramUrl")),
      linkedinUrl: readOptionalUrl(readString(formData, "linkedinUrl")),
      websiteUrl: readOptionalUrl(readString(formData, "websiteUrl")),
      slug,
      seoTitle: readString(formData, "seoTitle").trim().slice(0, 160) || null,
      seoDescription:
        readString(formData, "seoDescription").trim().slice(0, 320) || null,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      featuredPriority: Number.isFinite(featuredPriority)
        ? featuredPriority
        : 0,
      isActive: readString(formData, "isActive") === "true",
      isFeatured: readString(formData, "isFeatured") === "true",
      archivedAt:
        readString(formData, "archived") === "true" ? new Date() : null,
    },
  });

  revalidateTeam(slug);
  revalidateTeam(existing.slug);
  return { successMessage: "تغییرات ذخیره شد." };
}

export async function archiveTeamMemberAction(formData: FormData) {
  const session = await requirePermission("website.manage");
  const memberId = readString(formData, "memberId").trim();
  const member = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, slug: true, archivedAt: true },
  });
  if (!member) return;
  await prisma.teamMember.update({
    where: { id: member.id },
    data: {
      archivedAt: member.archivedAt ? null : new Date(),
      isFeatured: member.archivedAt ? undefined : false,
    },
  });
  revalidateTeam(member.slug);
}

export async function deleteTeamMemberAction(formData: FormData) {
  const session = await requirePermission("website.manage");
  const memberId = readString(formData, "memberId").trim();
  const member = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, slug: true },
  });
  if (!member) return;
  await prisma.teamMember.update({
    where: { id: member.id },
    data: {
      deletedAt: new Date(),
      isActive: false,
      isFeatured: false,
      slug: `${member.slug}-deleted-${Date.now().toString(36)}`,
    },
  });
  revalidateTeam(member.slug);
}

export async function uploadTeamPortraitAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const session = await requirePermission("website.manage");
  const memberId = readString(formData, "memberId").trim();
  const member = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, slug: true, portraitMediaId: true, fullName: true },
  });
  if (!member) return { formError: "عضو تیم یافت نشد." };

  const file = formData.get("portrait");
  const processed = await processTeamPortraitUpload(
    file instanceof File ? file : null,
  );
  if (!processed.ok) return { formError: processed.error };

  const altText =
    readString(formData, "altText").trim().slice(0, 200) || member.fullName;
  const keys = generateTeamPortraitVariantKeys();

  let written960;
  try {
    await writeMediaFile({
      storageKey: keys.w480,
      data: processed.variants.w480.buffer,
    });
    written960 = await writeMediaFile({
      storageKey: keys.w960,
      data: processed.variants.w960.buffer,
    });
  } catch {
    await tryUnlinkMediaFile(keys.w480);
    await tryUnlinkMediaFile(keys.w960);
    return {
      formError:
        "ذخیره‌سازی فایل انجام نشد. مسیر رسانه را روی سرور بررسی کنید.",
    };
  }

  const metadata = buildTeamPortraitMetadata({
    w480: {
      storageKey: keys.w480,
      width: processed.variants.w480.width,
      height: processed.variants.w480.height,
      byteSize: processed.variants.w480.buffer.byteLength,
    },
    w960: {
      storageKey: keys.w960,
      width: processed.variants.w960.width,
      height: processed.variants.w960.height,
      byteSize: processed.variants.w960.buffer.byteLength,
    },
  });

  // Canonical asset points at the 960px variant — original upload is never stored.
  const media = await prisma.mediaAsset.create({
    data: {
      organizationId: session.organization.id,
      storageKey: keys.w960,
      originalName: processed.originalName,
      mimeType: processed.mimeType,
      byteSize: written960.byteSize,
      checksum: written960.checksum,
      width: processed.variants.w960.width,
      height: processed.variants.w960.height,
      altText,
      metadata: teamPortraitMetadataToJson(metadata),
      createdByUserId: session.user.id,
    },
    select: { id: true },
  });

  const previousMediaId = member.portraitMediaId;
  await prisma.teamMember.update({
    where: { id: member.id },
    data: { portraitMediaId: media.id },
  });

  if (previousMediaId) {
    const stillUsed = await prisma.teamMember.count({
      where: { portraitMediaId: previousMediaId, deletedAt: null },
    });
    const formUse = await prisma.formVersion.count({
      where: { posterMediaId: previousMediaId },
    });
    if (stillUsed === 0 && formUse === 0) {
      const old = await prisma.mediaAsset.findFirst({
        where: { id: previousMediaId },
        select: { storageKey: true, metadata: true },
      });
      await prisma.mediaAsset.update({
        where: { id: previousMediaId },
        data: { deletedAt: new Date() },
      });
      if (old) {
        for (const key of teamPortraitStorageKeysToUnlink(old)) {
          await tryUnlinkMediaFile(key);
        }
      }
    }
  }

  revalidateTeam(member.slug);
  return {
    successMessage: "تصویر پروفایل ذخیره شد.",
    formError: undefined,
  };
}

export async function createTeamDepartmentAction(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  await ensureDefaultTeamDepartments(organizationId);

  const name = readString(formData, "name").trim().slice(0, 120);
  if (!name) return;

  let slug = departmentSlugFromName(
    readString(formData, "slug").trim() || name,
  );
  const clash = await prisma.teamDepartment.findFirst({
    where: { organizationId, slug, deletedAt: null },
    select: { id: true },
  });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const maxOrder = await prisma.teamDepartment.aggregate({
    where: { organizationId, deletedAt: null },
    _max: { sortOrder: true },
  });

  await prisma.teamDepartment.create({
    data: {
      organizationId,
      name,
      slug,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      isActive: true,
    },
  });
  revalidateTeam();
}

export async function updateTeamDepartmentAction(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const departmentId = readString(formData, "departmentId").trim();
  const name = readString(formData, "name").trim().slice(0, 120);
  if (!name) return;

  const department = await prisma.teamDepartment.findFirst({
    where: { id: departmentId, organizationId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!department) return;

  const sortOrder = Number(readString(formData, "sortOrder") || "0");
  await prisma.teamDepartment.update({
    where: { id: department.id },
    data: {
      name,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive: readString(formData, "isActive") === "true",
      archivedAt:
        readString(formData, "archived") === "true" ? new Date() : null,
    },
  });
  revalidateTeam();
}

export async function deleteTeamDepartmentAction(formData: FormData) {
  const session = await requirePermission("website.manage");
  const departmentId = readString(formData, "departmentId").trim();
  const department = await prisma.teamDepartment.findFirst({
    where: {
      id: departmentId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      _count: { select: { members: { where: { deletedAt: null } } } },
    },
  });
  if (!department) return;
  if (department._count.members > 0) {
    await prisma.teamDepartment.update({
      where: { id: department.id },
      data: { archivedAt: new Date(), isActive: false },
    });
  } else {
    await prisma.teamDepartment.update({
      where: { id: department.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        slug: `${department.slug}-deleted-${Date.now().toString(36)}`,
      },
    });
  }
  revalidateTeam();
}
