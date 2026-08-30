"use server";

import { revalidatePath } from "next/cache";
import { AuditAction } from "@/generated/prisma/enums";
import { requireBookCommerceAccess } from "@/lib/books/require";
import { ensureBookAgencyProfile } from "@/lib/books/agency-profile";
import { prisma } from "@/lib/prisma";

export type BookSettingsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function readInt(formData: FormData, key: string, fallback: number, min: number, max: number): number {
  const raw = formData.get(key);
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function readBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

export async function updateBookAgencyProfileAction(
  _prev: BookSettingsActionState,
  formData: FormData,
): Promise<BookSettingsActionState> {
  const session = await requireBookCommerceAccess("books.settings.manage");
  const organizationId = session.organization.id;

  await ensureBookAgencyProfile(organizationId);

  const legalName = String(formData.get("legalName") ?? "").trim();

  const data = {
    legalName: legalName || null,
    defaultDepositPercent: readInt(formData, "defaultDepositPercent", 30, 0, 100),
    defaultReservationTtlHours: readInt(formData, "defaultReservationTtlHours", 168, 1, 24 * 90),
    allowIssueUnpaid: readBoolean(formData, "allowIssueUnpaid"),
    installmentEnabled: readBoolean(formData, "installmentEnabled"),
    countGiftsInGmv: readBoolean(formData, "countGiftsInGmv"),
    showStudentNamesToTeachers: readBoolean(formData, "showStudentNamesToTeachers"),
  };

  await prisma.bookAgencyProfile.update({
    where: { organizationId },
    data,
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId: session.user.id,
      action: AuditAction.BOOKS_SETTINGS_UPDATED,
      entityType: "BookAgencyProfile",
      entityId: organizationId,
      metadata: data,
    },
  });

  revalidatePath("/admin/books/settings");

  return { status: "success", message: "تنظیمات آژانس کتاب ذخیره شد." };
}
