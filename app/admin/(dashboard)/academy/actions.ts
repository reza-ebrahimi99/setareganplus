"use server";

import { revalidatePath } from "next/cache";
import { AcademyCourseStatus } from "@/generated/prisma/enums";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export async function createAcademyCourseAction(formData: FormData) {
  const session = await requireAdminSession();
  assertPermission(session, "academy.manage");

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const priceRaw = String(formData.get("priceRials") ?? "0").trim();
  const priceRials = Number.parseInt(priceRaw, 10);

  if (!title || !slug) return;

  await prisma.academyCourse.create({
    data: {
      organizationId: session.organization.id,
      title,
      slug,
      status: AcademyCourseStatus.DRAFT,
      priceRials: Number.isFinite(priceRials) ? priceRials : 0,
    },
  });

  revalidatePath("/admin/academy/courses");
}

export async function publishAcademyCourseAction(formData: FormData) {
  const session = await requireAdminSession();
  assertPermission(session, "academy.manage");
  const courseId = String(formData.get("courseId") ?? "").trim();
  if (!courseId) return;

  await prisma.academyCourse.updateMany({
    where: { id: courseId, organizationId: session.organization.id },
    data: {
      status: AcademyCourseStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  revalidatePath("/admin/academy/courses");
}
