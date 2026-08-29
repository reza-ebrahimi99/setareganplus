"use server";

import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { verifyGuidancePaymentCallback } from "@/lib/guidance/journey/payment";

const STEP3_PATH = "/portal/student/services/guidance/steps/3";

export async function completeMockGuidanceCheckoutAction(
  formData: FormData,
): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim().toLowerCase();
  const trackingCode = String(formData.get("trackingCode") ?? "").trim();
  const providerSessionId = String(formData.get("providerSessionId") ?? "").trim();

  if (!token || !outcome) {
    redirect(`${STEP3_PATH}?paymentError=missing_token`);
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    redirect(`${STEP3_PATH}?paymentError=org`);
  }

  const verified = await verifyGuidancePaymentCallback({
    organizationId: organization.id,
    provider: "mock",
    callbackToken: token,
    callbackPayload: {
      outcome,
      trackingCode: trackingCode || null,
      providerSessionId,
    },
  });

  if (!verified.ok) {
    redirect(`${STEP3_PATH}?paymentError=${encodeURIComponent(verified.error)}`);
  }

  redirect(STEP3_PATH);
}
