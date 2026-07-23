import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { verifyPaymentCallback } from "@/lib/payment/service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Provider-agnostic callback entry for mock (and later real PSPs via [provider]).
 * Query: token, outcome (paid|failed|cancelled), optional trackingCode.
 */
export default async function MockPaymentCallbackPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const token = String(params.token ?? "").trim();
  const outcome = String(params.outcome ?? "").trim().toLowerCase();
  const trackingCode = String(params.trackingCode ?? "").trim();

  if (!token) {
    redirect("/payments/failed?error=missing_token");
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    redirect("/payments/failed?error=org");
  }

  const verified = await verifyPaymentCallback({
    organizationId: organization.id,
    provider: "mock",
    callbackToken: token,
    callbackPayload: {
      outcome: outcome || "failed",
      trackingCode: trackingCode || null,
    },
  });

  if (!verified.ok) {
    redirect(`/payments/failed?error=${encodeURIComponent(verified.error)}`);
  }

  redirect(verified.redirectPath);
}
