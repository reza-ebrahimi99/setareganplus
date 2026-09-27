"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export async function updateAcademySettingsAction(formData: FormData) {
  const session = await requireAdminSession();
  assertPermission(session, "academy.manage");

  const title = String(formData.get("title") ?? "").trim() || "آکادمی ستارگان";
  const maxDevices = Number.parseInt(String(formData.get("maxDevices") ?? "2"), 10);
  const maxConcurrentStreams = Number.parseInt(
    String(formData.get("maxConcurrentStreams") ?? "1"),
    10,
  );
  const watermarkEnabled = formData.get("watermarkEnabled") === "on";
  const supportPhone = String(formData.get("supportPhone") ?? "").trim() || null;

  await prisma.academySettings.upsert({
    where: { organizationId: session.organization.id },
    create: {
      organizationId: session.organization.id,
      title,
      maxDevices: Number.isFinite(maxDevices) ? maxDevices : 2,
      maxConcurrentStreams: Number.isFinite(maxConcurrentStreams)
        ? maxConcurrentStreams
        : 1,
      watermarkEnabled,
      supportPhone,
    },
    update: {
      title,
      maxDevices: Number.isFinite(maxDevices) ? maxDevices : 2,
      maxConcurrentStreams: Number.isFinite(maxConcurrentStreams)
        ? maxConcurrentStreams
        : 1,
      watermarkEnabled,
      supportPhone,
    },
  });

  revalidatePath("/admin/academy/settings");
}
