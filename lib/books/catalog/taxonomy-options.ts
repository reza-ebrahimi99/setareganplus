import { prisma } from "@/lib/prisma";

export type TaxonomyOption = { id: string; label: string };

export type CatalogTaxonomyOptions = {
  bookTypes: TaxonomyOption[];
  grades: TaxonomyOption[];
  subjects: TaxonomyOption[];
  majors: TaxonomyOption[];
  publishers: TaxonomyOption[];
};

export async function loadCatalogTaxonomyOptions(
  organizationId: string,
): Promise<CatalogTaxonomyOptions> {
  const [bookTypes, grades, subjects, majors, publishers] = await Promise.all([
    prisma.bookType.findMany({
      where: { organizationId, isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true },
    }),
    prisma.studentGrade.findMany({
      where: { organizationId, isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.subject.findMany({
      where: { organizationId, isActive: true, deletedAt: null },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.studentMajor.findMany({
      where: { organizationId, isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.bookPublisher.findMany({
      where: { organizationId, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    bookTypes: bookTypes.map((row) => ({ id: row.id, label: row.label })),
    grades: grades.map((row) => ({ id: row.id, label: row.name })),
    subjects: subjects.map((row) => ({ id: row.id, label: row.name })),
    majors: majors.map((row) => ({ id: row.id, label: row.name })),
    publishers: publishers.map((row) => ({ id: row.id, label: row.name })),
  };
}
