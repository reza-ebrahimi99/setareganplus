"use server";

import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { verifyGuidancePaymentCallback } from "@/lib/guidance/journey/payment";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";

const V2_FAIL_PATH = `${guidanceJourneyV2StepPath(10)}?payment=failed`;

export async function completeMockGuidanceCheckoutAction(
  formData: FormData,
): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim().toLowerCase();
  const trackingCode = String(formData.get("trackingCode") ?? "").trim();
  const providerSessionId = String(formData.get("providerSessionId") ?? "").trim();

  if (!token || !outcome) {
    redirect(`${V2_FAIL_PATH}&paymentError=missing_token`);
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    redirect(`${V2_FAIL_PATH}&paymentError=org`);
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
    const path = verified.continuePath || V2_FAIL_PATH;
    redirect(path.includes("?") ? path : `${path}?payment=failed`);
  }

  redirect(verified.continuePath);
}
