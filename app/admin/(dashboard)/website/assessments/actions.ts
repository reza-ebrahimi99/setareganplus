"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  ensureDefaultAssessmentProviders,
  providerSlugFromName,
} from "@/lib/assessment/providers";
import {
  ensureDefaultSubjects,
  subjectSlugFromName,
} from "@/lib/assessment/subjects";
import type { AssessmentType } from "@/generated/prisma/client";
import { isAssessmentType } from "@/lib/assessment/types";
import {
  normalizeAssessmentSlug,
  slugFromAssessmentTitle,
} from "@/lib/assessment/slug";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/observability/server-log";
import { persianPrismaError } from "@/lib/prisma/user-facing-error";

export type AssessmentActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateAssessments(slug?: string) {
  revalidatePath("/admin/website/assessments");
  revalidatePath("/admin/website/assessment-providers");
  revalidatePath("/admin/website/subjects");
  revalidatePath("/admin/website/assessment-results");
  revalidatePath("/assessments");
  if (slug) revalidatePath(`/assessments/${slug}`);
}

async function uniqueAssessmentSlug(
  organizationId: string,
  desired: string,
  excludeId?: string,
): Promise<string> {
  let base = normalizeAssessmentSlug(desired);
  if (base.length < 2) base = `assessment-${Date.now().toString(36)}`;
  let candidate = base;
  for (let i = 0; i < 20; i += 1) {
    const hit = await prisma.assessment.findFirst({
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

function parseAssessmentDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseOptionalFloat(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInt(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createAssessment(
  _prev: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  await ensureDefaultAssessmentProviders(organizationId);

  const title = readString(formData, "title").trim().slice(0, 200);
  const providerId = readString(formData, "providerId").trim();
  const gradeId = readString(formData, "gradeId").trim();
  const assessmentTypeRaw = readString(formData, "assessmentType").trim();
  const fieldErrors: Record<string, string> = {};

  if (!title) fieldErrors.title = "عنوان الزامی است.";
  if (!providerId) fieldErrors.providerId = "ارائه‌دهنده الزامی است.";
  if (!gradeId) fieldErrors.gradeId = "پایه الزامی است.";
  if (!isAssessmentType(assessmentTypeRaw)) {
    fieldErrors.assessmentType = "نوع آزمون معتبر نیست.";
  }

  const [provider, grade] = await Promise.all([
    providerId
      ? prisma.assessmentProvider.findFirst({
          where: { id: providerId, organizationId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
    gradeId
      ? prisma.studentGrade.findFirst({
          where: { id: gradeId, organizationId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (providerId && !provider) fieldErrors.providerId = "ارائه‌دهنده معتبر نیست.";
  if (gradeId && !grade) fieldErrors.gradeId = "پایه معتبر نیست.";
  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors };
  }

  const slug = await uniqueAssessmentSlug(
    organizationId,
    readString(formData, "slug").trim() || slugFromAssessmentTitle(title),
  );

  try {
    await prisma.assessment.create({
      data: {
        organizationId,
        providerId: provider!.id,
        gradeId: grade!.id,
        title,
        slug,
        assessmentType: assessmentTypeRaw as AssessmentType,
        assessmentDate: parseAssessmentDate(
          readString(formData, "assessmentDate"),
        ),
        schoolYear:
          readString(formData, "schoolYear").trim().slice(0, 40) || null,
        participants: parseOptionalInt(readString(formData, "participants")),
        maxScore: parseOptionalFloat(readString(formData, "maxScore")),
        description: readString(formData, "description").trim().slice(0, 8000),
        isPublished: readString(formData, "isPublished") === "true",
      },
    });
  } catch (error) {
    logServerError(
      {
        module: "assessment.admin",
        action: "createAssessment",
        category: "mutation",
        organizationId,
        userId: session.user.id,
      },
      error,
    );
    return { formError: persianPrismaError(error, "ثبت آزمون انجام نشد.") };
  }

  revalidateAssessments(slug);
  return { successMessage: "آزمون با موفقیت ثبت شد." };
}

export async function updateAssessment(
  _prev: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const assessmentId = readString(formData, "assessmentId").trim();

  const existing = await prisma.assessment.findFirst({
    where: { id: assessmentId, organizationId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!existing) return { formError: "آزمون یافت نشد." };

  const title = readString(formData, "title").trim().slice(0, 200);
  const providerId = readString(formData, "providerId").trim();
  const gradeId = readString(formData, "gradeId").trim();
  const assessmentTypeRaw = readString(formData, "assessmentType").trim();
  const fieldErrors: Record<string, string> = {};

  if (!title) fieldErrors.title = "عنوان الزامی است.";
  if (!providerId) fieldErrors.providerId = "ارائه‌دهنده الزامی است.";
  if (!gradeId) fieldErrors.gradeId = "پایه الزامی است.";
  if (!isAssessmentType(assessmentTypeRaw)) {
    fieldErrors.assessmentType = "نوع آزمون معتبر نیست.";
  }

  const [provider, grade] = await Promise.all([
    prisma.assessmentProvider.findFirst({
      where: { id: providerId, organizationId, deletedAt: null },
      select: { id: true },
    }),
    prisma.studentGrade.findFirst({
      where: { id: gradeId, organizationId, deletedAt: null },
      select: { id: true },
    }),
  ]);
  if (!provider) fieldErrors.providerId = "ارائه‌دهنده معتبر نیست.";
  if (!grade) fieldErrors.gradeId = "پایه معتبر نیست.";
  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors };
  }

  const slug = await uniqueAssessmentSlug(
    organizationId,
    readString(formData, "slug").trim() || slugFromAssessmentTitle(title),
    existing.id,
  );

  await prisma.assessment.update({
    where: { id: existing.id },
    data: {
      providerId: provider!.id,
      gradeId: grade!.id,
      title,
      slug,
      assessmentType: assessmentTypeRaw as AssessmentType,
      assessmentDate: parseAssessmentDate(readString(formData, "assessmentDate")),
      schoolYear:
        readString(formData, "schoolYear").trim().slice(0, 40) || null,
      participants: parseOptionalInt(readString(formData, "participants")),
      maxScore: parseOptionalFloat(readString(formData, "maxScore")),
      description: readString(formData, "description").trim().slice(0, 8000),
      isPublished: readString(formData, "isPublished") === "true",
      archivedAt:
        readString(formData, "archived") === "true" ? new Date() : null,
    },
  });

  revalidateAssessments(slug);
  if (slug !== existing.slug) revalidateAssessments(existing.slug);
  return { successMessage: "تغییرات ذخیره شد." };
}

export async function archiveAssessment(formData: FormData) {
  const session = await requirePermission("website.manage");
  const assessmentId = readString(formData, "assessmentId").trim();
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, slug: true, archivedAt: true },
  });
  if (!assessment || assessment.archivedAt) return;
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { archivedAt: new Date(), isPublished: false },
  });
  revalidateAssessments(assessment.slug);
}

export async function restoreAssessment(formData: FormData) {
  const session = await requirePermission("website.manage");
  const assessmentId = readString(formData, "assessmentId").trim();
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, slug: true },
  });
  if (!assessment) return;
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { archivedAt: null },
  });
  revalidateAssessments(assessment.slug);
}

export async function deleteAssessment(formData: FormData) {
  const session = await requirePermission("website.manage");
  const assessmentId = readString(formData, "assessmentId").trim();
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, slug: true },
  });
  if (!assessment) return;

  const suffix = Date.now().toString(36);
  await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      deletedAt: new Date(),
      archivedAt: new Date(),
      isPublished: false,
      slug: `${assessment.slug}-deleted-${suffix}`.slice(0, 120),
    },
  });
  revalidateAssessments(assessment.slug);
}

export async function createAssessmentProvider(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  await ensureDefaultAssessmentProviders(organizationId);

  const name = readString(formData, "name").trim().slice(0, 120);
  if (!name) return;

  let slug = providerSlugFromName(
    readString(formData, "slug").trim() || name,
  );
  const clash = await prisma.assessmentProvider.findFirst({
    where: { organizationId, slug, deletedAt: null },
    select: { id: true },
  });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const maxSort = await prisma.assessmentProvider.aggregate({
    where: { organizationId, deletedAt: null },
    _max: { displayOrder: true },
  });

  await prisma.assessmentProvider.create({
    data: {
      organizationId,
      name,
      slug,
      icon: readString(formData, "icon").trim().slice(0, 40) || null,
      color: readString(formData, "color").trim().slice(0, 20) || null,
      displayOrder: (maxSort._max.displayOrder ?? -1) + 1,
      isActive: true,
    },
  });
  revalidateAssessments();
}

export async function updateAssessmentProvider(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const providerId = readString(formData, "providerId").trim();
  const provider = await prisma.assessmentProvider.findFirst({
    where: { id: providerId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!provider) return;

  const name = readString(formData, "name").trim().slice(0, 120);
  const displayOrder = Number(readString(formData, "displayOrder") || "0");
  if (!name) return;

  await prisma.assessmentProvider.update({
    where: { id: provider.id },
    data: {
      name,
      icon: readString(formData, "icon").trim().slice(0, 40) || null,
      color: readString(formData, "color").trim().slice(0, 20) || null,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      isActive: readString(formData, "isActive") === "true",
      archivedAt:
        readString(formData, "archived") === "true" ? new Date() : null,
    },
  });
  revalidateAssessments();
}

export async function deleteAssessmentProvider(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const providerId = readString(formData, "providerId").trim();
  const provider = await prisma.assessmentProvider.findFirst({
    where: { id: providerId, organizationId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      _count: { select: { assessments: { where: { deletedAt: null } } } },
    },
  });
  if (!provider) return;

  if (provider._count.assessments > 0) {
    await prisma.assessmentProvider.update({
      where: { id: provider.id },
      data: { archivedAt: new Date(), isActive: false },
    });
  } else {
    await prisma.assessmentProvider.update({
      where: { id: provider.id },
      data: {
        deletedAt: new Date(),
        archivedAt: new Date(),
        isActive: false,
        slug: `${provider.slug}-deleted-${Date.now().toString(36)}`.slice(
          0,
          120,
        ),
      },
    });
  }
  revalidateAssessments();
}

export async function createSubject(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  await ensureDefaultSubjects(organizationId);

  const name = readString(formData, "name").trim().slice(0, 120);
  if (!name) return;

  let slug = subjectSlugFromName(readString(formData, "slug").trim() || name);
  const clash = await prisma.subject.findFirst({
    where: { organizationId, slug, deletedAt: null },
    select: { id: true },
  });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const maxSort = await prisma.subject.aggregate({
    where: { organizationId, deletedAt: null },
    _max: { displayOrder: true },
  });

  await prisma.subject.create({
    data: {
      organizationId,
      name,
      slug,
      shortName: readString(formData, "shortName").trim().slice(0, 40) || null,
      displayOrder: (maxSort._max.displayOrder ?? -1) + 1,
      isActive: true,
    },
  });
  revalidateAssessments();
}

export async function updateSubject(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const subjectId = readString(formData, "subjectId").trim();
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!subject) return;

  const name = readString(formData, "name").trim().slice(0, 120);
  const displayOrder = Number(readString(formData, "displayOrder") || "0");
  if (!name) return;

  await prisma.subject.update({
    where: { id: subject.id },
    data: {
      name,
      shortName: readString(formData, "shortName").trim().slice(0, 40) || null,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      isActive: readString(formData, "isActive") === "true",
    },
  });
  revalidateAssessments();
}

export async function deleteSubject(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const subjectId = readString(formData, "subjectId").trim();
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, organizationId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      _count: { select: { subjectResults: true } },
    },
  });
  if (!subject) return;

  if (subject._count.subjectResults > 0) {
    await prisma.subject.update({
      where: { id: subject.id },
      data: { isActive: false },
    });
  } else {
    await prisma.subject.update({
      where: { id: subject.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        slug: `${subject.slug}-deleted-${Date.now().toString(36)}`.slice(
          0,
          120,
        ),
      },
    });
  }
  revalidateAssessments();
}
