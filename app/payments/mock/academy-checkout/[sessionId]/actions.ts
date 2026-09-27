"use server";

import { redirect } from "next/navigation";
import { getAcademyPublicOrigin } from "@/lib/academy/host";
import { verifyAcademyPaymentCallback } from "@/lib/academy/payment";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";

export async function completeMockAcademyCheckoutAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim().toLowerCase();
  const trackingCode = String(formData.get("trackingCode") ?? "").trim();
  const providerSessionId = String(formData.get("providerSessionId") ?? "").trim();
  const origin = getAcademyPublicOrigin();

  if (!token || !outcome) {
    redirect(`${origin}/payment/failed?error=missing_token`);
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    redirect(`${origin}/payment/failed?error=org`);
  }

  const verified = await verifyAcademyPaymentCallback({
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
    redirect(`${origin}${verified.redirectPath}`);
  }
  redirect(`${origin}${verified.redirectPath}`);
}
