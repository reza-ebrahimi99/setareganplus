import { notFound } from "next/navigation";
import { promises as fs } from "node:fs";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadAssignedCounselorForStudent } from "@/lib/guidance/journey-v2/appointments";
import { prisma } from "@/lib/prisma";
import { absolutePathForStorageKey } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) notFound();

  const counselor = await loadAssignedCounselorForStudent({
    organizationId: context.organization.id,
    studentId,
  });
  if (!counselor) notFound();

  const advisor = await prisma.bookingAdvisor.findFirst({
    where: {
      id: counselor.advisorId,
      organizationId: context.organization.id,
      deletedAt: null,
    },
    select: { photoMedia: { select: { storageKey: true, mimeType: true, deletedAt: true } } },
  });
  if (!advisor?.photoMedia || advisor.photoMedia.deletedAt) notFound();

  const absolute = absolutePathForStorageKey(advisor.photoMedia.storageKey);
  let data: Buffer;
  try {
    data = await fs.readFile(absolute);
  } catch {
    notFound();
  }

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": advisor.photoMedia.mimeType || "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
