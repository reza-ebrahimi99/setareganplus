"use server";

import {
  RegistrationDocumentReviewStatus,
  RegistrationStatus,
} from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  addRegistrationNote,
  markRegistrationNeedsCall,
  updateRegistrationStatus,
} from "@/lib/registration/admin-ops";
import { reviewRegistrationDocument } from "@/lib/registration/documents";
import { revalidatePath } from "next/cache";

export async function changeRegistrationStatusAction(formData: FormData) {
  const session = await requirePermission("registrations.manage");
  const id = String(formData.get("registrationId") ?? "");
  const status = String(formData.get("status") ?? "") as RegistrationStatus;
  const reason = String(formData.get("reason") ?? "");
  if (!id || !Object.values(RegistrationStatus).includes(status)) {
    return;
  }
  await updateRegistrationStatus({
    organizationId: session.organization.id,
    registrationId: id,
    status,
    actorUserId: session.user.id,
    reason: reason || null,
  });
  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${id}`);
}

export async function addRegistrationNoteAction(formData: FormData) {
  const session = await requirePermission("registrations.manage");
  const id = String(formData.get("registrationId") ?? "");
  const body = String(formData.get("body") ?? "");
  await addRegistrationNote({
    organizationId: session.organization.id,
    registrationId: id,
    body,
    actorUserId: session.user.id,
  });
  revalidatePath(`/admin/registrations/${id}`);
}

export async function markNeedsCallAction(formData: FormData) {
  const session = await requirePermission("registrations.manage");
  const id = String(formData.get("registrationId") ?? "");
  await markRegistrationNeedsCall({
    organizationId: session.organization.id,
    registrationId: id,
    actorUserId: session.user.id,
  });
  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${id}`);
}

export async function reviewDocumentAction(formData: FormData) {
  const session = await requirePermission("registrations.manage");
  const documentId = String(formData.get("documentId") ?? "");
  const registrationId = String(formData.get("registrationId") ?? "");
  const reviewStatus = String(
    formData.get("reviewStatus") ?? "",
  ) as RegistrationDocumentReviewStatus;
  const reviewNote = String(formData.get("reviewNote") ?? "");
  if (
    !documentId ||
    !Object.values(RegistrationDocumentReviewStatus).includes(reviewStatus)
  ) {
    return;
  }
  await reviewRegistrationDocument({
    organizationId: session.organization.id,
    documentId,
    actorUserId: session.user.id,
    reviewStatus,
    reviewNote: reviewNote || null,
  });
  revalidatePath(`/admin/registrations/${registrationId}`);
}
