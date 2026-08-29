import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import {
  guardZibalCallbackFields,
  isSafeInternalPaymentRedirectPath,
} from "@/lib/payment/payment-guards";
import { verifyPaymentCallback } from "@/lib/payment/service";
import { prisma } from "@/lib/prisma";

/**
 * Never statically cache payment callbacks — query params must be evaluated per request.
 * Route handler not required: this page already uses force-dynamic + searchParams + redirects.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

function failRedirect(errorCode: string): never {
  redirect(`/payments/failed?error=${encodeURIComponent(errorCode)}`);
}

/**
 * Zibal IPG callback.
 * Query may include trackId/success/status/orderId from Zibal plus our `token`.
 * Payment is NEVER trusted from query alone — server verify runs inside the service.
 */
export default async function ZibalPaymentCallbackPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const token = firstParam(params.token);
  const trackId = firstParam(params.trackId);
  const success = firstParam(params.success);
  const status = firstParam(params.status);
  const orderId = firstParam(params.orderId);

  if (!token) {
    failRedirect("missing_token");
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    failRedirect("org");
  }

  // Resolve session first so a forged trackId cannot target another registration.
  const session = await prisma.paymentSession.findFirst({
    where: {
      organizationId: organization.id,
      provider: "zibal",
      callbackToken: token,
    },
    select: {
      id: true,
      providerSessionId: true,
      paymentIntentId: true,
    },
  });

  if (!session) {
    failRedirect("session_not_found");
  }

  const guarded = guardZibalCallbackFields({
    token,
    trackId,
    orderId,
    sessionProviderSessionId: session.providerSessionId,
    sessionPaymentIntentId: session.paymentIntentId,
  });

  if (!guarded.ok) {
    if (
      guarded.errorCode === "track_mismatch" ||
      guarded.errorCode === "order_mismatch"
    ) {
      console.error(`[payment.zibal] callback ${guarded.errorCode}`, {
        paymentSessionId: session.id,
        paymentIntentId: session.paymentIntentId,
      });
    }
    failRedirect(guarded.errorCode);
  }

  const verified = await verifyPaymentCallback({
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
    failRedirect(verified.error);
  }

  if (!isSafeInternalPaymentRedirectPath(verified.redirectPath)) {
    console.error("[payment.zibal] rejected unsafe redirectPath");
    failRedirect("unsafe_redirect");
  }

  redirect(verified.redirectPath);
}
