import {
  publicStudentPortraitUrl,
  type StudentPortraitVariantSize,
} from "@/lib/media/student-portrait";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { listPublicStudentGrades } from "@/lib/website/student-grades";

export { listPublicStudentGrades };

export const HOMEPAGE_FEATURED_STUDENT_LIMIT = 4;
export const PUBLIC_STUDENT_PAGE_SIZE = 30;

export type PublicStudentCard = {
  id: string;
  slug: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gradeName: string;
  gradeSlug: string;
  majorName: string | null;
  schoolYear: string | null;
  portraitUrl: string | null;
  portraitAlt: string;
};

type PortraitMediaSelect = {
  storageKey: string;
  altText: string | null;
  metadata: unknown;
} | null;

function mapPortrait(
  media: PortraitMediaSelect,
  fullName: string,
  size: StudentPortraitVariantSize,
): { portraitUrl: string | null; portraitAlt: string } {
  return {
    portraitUrl: publicStudentPortraitUrl(media, size),
    portraitAlt: media?.altText?.trim() || fullName,
  };
}

const portraitSelect = {
  storageKey: true,
  altText: true,
  metadata: true,
} as const;

export async function loadFeaturedStudents(): Promise<PublicStudentCard[]> {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) return [];

    const rows = await prisma.student.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        archivedAt: null,
        isActive: true,
        isFeatured: true,
        grade: { deletedAt: null, archivedAt: null, isActive: true },
      },
      orderBy: [
        { featuredPriority: "asc" },
        { displayOrder: "asc" },
        { fullName: "asc" },
      ],
      take: HOMEPAGE_FEATURED_STUDENT_LIMIT,
      select: {
        id: true,
        slug: true,
        fullName: true,
        firstName: true,
        lastName: true,
        schoolYear: true,
        grade: { select: { name: true, slug: true } },
        major: { select: { name: true } },
        portraitMedia: { select: portraitSelect },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      fullName: row.fullName,
      firstName: row.firstName,
      lastName: row.lastName,
      schoolYear: row.schoolYear,
      gradeName: row.grade.name,
      gradeSlug: row.grade.slug,
      majorName: row.major?.name ?? null,
      ...mapPortrait(row.portraitMedia, row.fullName, "w480"),
    }));
  } catch {
    return [];
  }
}

export type PublicStudentPageData = {
  grades: Array<{
    id: string;
    slug: string;
    name: string;
    students: PublicStudentCard[];
  }>;
  students: PublicStudentCard[];
  totalStudents: number;
  page: number;
  pageSize: number;
  pageCount: number;
  gradeCount: number;
};

function publicStudentWhere(
  organizationId: string,
  filters?: { gradeSlug?: string; q?: string },
) {
  const q = filters?.q?.trim() ?? "";
  const gradeSlug = filters?.gradeSlug?.trim() ?? "";

  return {
    organizationId,
    deletedAt: null,
    archivedAt: null,
    isActive: true,
    grade: {
      deletedAt: null,
      archivedAt: null,
      isActive: true,
      ...(gradeSlug ? { slug: gradeSlug } : {}),
    },
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { schoolYear: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function loadPublicStudentPage(filters?: {
  gradeSlug?: string;
  q?: string;
  page?: number;
}): Promise<PublicStudentPageData | null> {
  const organization = await getCurrentOrganization();
  if (!organization) return null;

  const pageSize = PUBLIC_STUDENT_PAGE_SIZE;
  const where = publicStudentWhere(organization.id, filters);

  const [totalStudents, gradeCount] = await Promise.all([
    prisma.student.count({ where }),
    prisma.studentGrade.count({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        archivedAt: null,
        isActive: true,
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(totalStudents / pageSize));
  const requested = filters?.page && filters.page > 0 ? filters.page : 1;
  const page = Math.min(requested, pageCount);

  const rows = await prisma.student.findMany({
    where,
    orderBy: [
      { grade: { sortOrder: "asc" } },
      { displayOrder: "asc" },
      { fullName: "asc" },
    ],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      fullName: true,
      firstName: true,
      lastName: true,
      schoolYear: true,
      grade: { select: { id: true, name: true, slug: true } },
      major: { select: { name: true } },
      portraitMedia: { select: portraitSelect },
    },
  });

  const gradeMap = new Map<
    string,
    {
      id: string;
      slug: string;
      name: string;
      students: PublicStudentCard[];
    }
  >();
  const students: PublicStudentCard[] = [];

  for (const row of rows) {
    const student: PublicStudentCard = {
      id: row.id,
      slug: row.slug,
      fullName: row.fullName,
      firstName: row.firstName,
      lastName: row.lastName,
      schoolYear: row.schoolYear,
      gradeName: row.grade.name,
      gradeSlug: row.grade.slug,
      majorName: row.major?.name ?? null,
      ...mapPortrait(row.portraitMedia, row.fullName, "w480"),
    };
    students.push(student);

    const existing = gradeMap.get(row.grade.id);
    if (existing) {
      existing.students.push(student);
    } else {
      gradeMap.set(row.grade.id, {
        id: row.grade.id,
        slug: row.grade.slug,
        name: row.grade.name,
        students: [student],
      });
    }
  }

  return {
    grades: Array.from(gradeMap.values()),
    students,
    totalStudents,
    page,
    pageSize,
    pageCount,
    gradeCount,
  };
}

export type PublicStudentDetail = PublicStudentCard & {
  biography: string;
  parentName: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export async function loadPublicStudentBySlug(
  slug: string,
): Promise<PublicStudentDetail | null> {
  const organization = await getCurrentOrganization();
  if (!organization) return null;

  const student = await prisma.student.findFirst({
    where: {
      organizationId: organization.id,
      slug,
      deletedAt: null,
      archivedAt: null,
      isActive: true,
      grade: { deletedAt: null, archivedAt: null, isActive: true },
    },
    select: {
      id: true,
      slug: true,
      fullName: true,
      firstName: true,
      lastName: true,
      schoolYear: true,
      biography: true,
      parentName: true,
      seoTitle: true,
      seoDescription: true,
      grade: { select: { name: true, slug: true } },
      major: { select: { name: true } },
      portraitMedia: { select: portraitSelect },
    },
  });

  if (!student) return null;

  return {
    id: student.id,
    slug: student.slug,
    fullName: student.fullName,
    firstName: student.firstName,
    lastName: student.lastName,
    schoolYear: student.schoolYear,
    biography: student.biography,
    parentName: student.parentName,
    seoTitle: student.seoTitle,
    seoDescription: student.seoDescription,
    gradeName: student.grade.name,
    gradeSlug: student.grade.slug,
    majorName: student.major?.name ?? null,
    ...mapPortrait(student.portraitMedia, student.fullName, "w960"),
  };
}
