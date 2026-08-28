import { prisma } from "@/lib/prisma";

/**
 * Resolve-or-create by case-insensitive name, scoped to the organization.
 * Reuses existing school taxonomies (StudentGrade, Subject, StudentMajor) —
 * never a duplicate "book grade"/"book field" master.
 */

function slugifyName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
    .slice(0, 80) || `x-${Date.now()}`;
}

export async function resolveOrCreatePublisher(params: {
  organizationId: string;
  name: string;
  createMissing: boolean;
}): Promise<{ id: string } | null> {
  const name = params.name.trim();
  if (!name) return null;
  const existing = await prisma.bookPublisher.findFirst({
    where: { organizationId: params.organizationId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing;
  if (!params.createMissing) return null;
  return prisma.bookPublisher.create({
    data: { organizationId: params.organizationId, name },
    select: { id: true },
  });
}

export async function resolveBookTypeByCodeOrLabel(params: {
  organizationId: string;
  value: string;
}): Promise<{ id: string } | null> {
  const value = params.value.trim();
  if (!value) return null;
  return prisma.bookType.findFirst({
    where: {
      organizationId: params.organizationId,
      OR: [
        { code: { equals: value, mode: "insensitive" } },
        { label: { equals: value, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
}

export async function resolveGradeByName(params: {
  organizationId: string;
  name: string;
}): Promise<{ id: string } | null> {
  const name = params.name.trim();
  if (!name) return null;
  return prisma.studentGrade.findFirst({
    where: { organizationId: params.organizationId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
}

export async function resolveSubjectByName(params: {
  organizationId: string;
  name: string;
}): Promise<{ id: string } | null> {
  const name = params.name.trim();
  if (!name) return null;
  return prisma.subject.findFirst({
    where: { organizationId: params.organizationId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
}

export async function resolveMajorByName(params: {
  organizationId: string;
  name: string;
}): Promise<{ id: string } | null> {
  const name = params.name.trim();
  if (!name) return null;
  return prisma.studentMajor.findFirst({
    where: { organizationId: params.organizationId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
}

export { slugifyName };
