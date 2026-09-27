import { redirect } from "next/navigation";
import { getAcademyPublicOrigin } from "@/lib/academy/host";
import { verifyAcademyPaymentCallback } from "@/lib/academy/payment";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { guardZibalCallbackFields } from "@/lib/payment/payment-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

export default async function AcademyPaymentCallbackPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const token = firstParam(params.token);
  const trackId = firstParam(params.trackId);
  const success = firstParam(params.success);
  const status = firstParam(params.status);
  const orderId = firstParam(params.orderId);

  const origin = getAcademyPublicOrigin();

  if (!token) {
    redirect(`${origin}/payment/failed?error=missing_token`);
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    redirect(`${origin}/payment/failed?error=org`);
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
    redirect(`${origin}/payment/failed?error=session_not_found`);
  }

  const guarded = guardZibalCallbackFields({
    token,
    trackId,
    orderId,
    sessionProviderSessionId: session.providerSessionId,
    sessionPaymentIntentId: session.paymentIntentId,
  });

  if (!guarded.ok) {
    redirect(`${origin}/payment/failed?error=${encodeURIComponent(guarded.errorCode)}`);
  }

  const verified = await verifyAcademyPaymentCallback({
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
    redirect(`${origin}${verified.redirectPath}`);
  }

  redirect(`${origin}${verified.redirectPath}`);
}
