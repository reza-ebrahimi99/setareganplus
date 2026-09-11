import { redirect } from "next/navigation";
import { loadGuidanceV2Entry } from "@/lib/guidance/journey-v2/guard";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";

export const dynamic = "force-dynamic";

export default async function GuidanceV2StepsIndexPage() {
  const { plan } = await loadGuidanceV2Entry();
  redirect(guidanceJourneyV2StepPath(plan.currentStep));
}
