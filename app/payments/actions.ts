"use server";

import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import {
  startCheckoutForRegistration,
  verifyPaymentCallback,
} from "@/lib/payment/service";

export type RetryPaymentResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string };

export async function retryPaymentAction(
  registrationId: string,
): Promise<RetryPaymentResult> {
  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    return { ok: false, error: "سامانه موقتاً در دسترس نیست." };
  }

  const result = await startCheckoutForRegistration({
    organizationId: organization.id,
    registrationId: registrationId.trim(),
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, checkoutUrl: result.checkoutUrl };
}

export async function completeMockCheckoutAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim().toLowerCase();
  const trackingCode = String(formData.get("trackingCode") ?? "").trim();
  const providerSessionId = String(formData.get("providerSessionId") ?? "").trim();

  if (!token || !outcome) {
    redirect("/payments/failed");
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    redirect("/payments/failed");
  }

  const verified = await verifyPaymentCallback({
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
    redirect(`/payments/failed?error=${encodeURIComponent(verified.error)}`);
  }

  redirect(verified.redirectPath);
}
