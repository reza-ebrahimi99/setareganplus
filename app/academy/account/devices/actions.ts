"use server";

import { revalidatePath } from "next/cache";
import { requireAcademySession } from "@/lib/academy/auth/session";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { revokeUserDevice } from "@/lib/academy/devices";

export async function revokeAcademyDeviceAction(formData: FormData) {
  const session = await requireAcademySession();
  const deviceId = String(formData.get("deviceId") ?? "").trim();
  if (!deviceId) return;

  await revokeUserDevice({
    organizationId: await getAcademyOrganizationId(),
    userId: session.userId,
    deviceId,
  });

  revalidatePath("/account/devices");
}
