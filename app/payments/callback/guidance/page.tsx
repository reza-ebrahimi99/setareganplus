import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { guardZibalCallbackFields } from "@/lib/payment/payment-guards";
import { verifyGuidancePaymentCallback } from "@/lib/guidance/journey/payment";
import { prisma } from "@/lib/prisma";

/**
 * Guidance Journey Engine Step 3 — dedicated Zibal callback.
 * Mirrors app/payments/callback/zibal/page.tsx but delegates verification to
 * verifyGuidancePaymentCallback() instead of the shared Registration/Commerce
 * verifyPaymentCallback(). Never trusts query params for anything except
 * resolving the local PaymentSession by its opaque callback token.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

function failRedirect(step3Path: string, errorCode: string): never {
  redirect(`${step3Path}?paymentError=${encodeURIComponent(errorCode)}`);
}

export default async function GuidancePaymentCallbackPage({
  searchParams,
}: PageProps) {
  const STEP3_PATH = "/portal/student/services/guidance/steps/3";
  const params = await searchParams;
  const token = firstParam(params.token);
  const trackId = firstParam(params.trackId);
  const success = firstParam(params.success);
  const status = firstParam(params.status);
  const orderId = firstParam(params.orderId);

  if (!token) {
    failRedirect(STEP3_PATH, "missing_token");
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    failRedirect(STEP3_PATH, "org");
  }

  const session = await prisma.paymentSession.findFirst({
    where: {
      organizationId: organization.id,
      provider: "zibal",
      callbackToken: token,
    },
    select: { id: true, providerSessionId: true, paymentIntentId: true },
  });

  if (!session) {
    failRedirect(STEP3_PATH, "session_not_found");
  }

  const guarded = guardZibalCallbackFields({
    token,
    trackId,
    orderId,
    sessionProviderSessionId: session.providerSessionId,
    sessionPaymentIntentId: session.paymentIntentId,
  });

  if (!guarded.ok) {
    failRedirect(STEP3_PATH, guarded.errorCode);
  }

  const verified = await verifyGuidancePaymentCallback({
    organizationId: organization.id,
    provider: "zibal",
    callbackToken: token,
    callbackPayload: {
      trackId: guarded.trackId,
      success: success || null,
      status: status || null,
      orderId: guarded.orderId,
    },
  });

  if (!verified.ok) {
    failRedirect(STEP3_PATH, verified.error);
  }

  redirect(STEP3_PATH);
}
