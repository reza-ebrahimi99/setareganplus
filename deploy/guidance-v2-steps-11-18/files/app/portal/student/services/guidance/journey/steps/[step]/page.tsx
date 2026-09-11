/**
 * GUIDANCE_V2_LATE_DISPATCH
 *
 * Steps 11–18 are rendered here. Steps 1–10 stay on production's original
 * dispatcher, preserved as page.early.tsx by the apply script.
 */

import { notFound } from "next/navigation";
import { parseGuidanceV2StepParam } from "@/lib/guidance/journey-v2/catalog";
import { renderGuidanceV2LateStep } from "@/lib/guidance/journey-v2/render-late-page";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ step: string }>;
  searchParams: Promise<{
    payment?: string | string[];
  }>;
};

export default async function GuidanceV2JourneyStepPage(props: Props) {
  const { step: raw } = await props.params;
  const step = parseGuidanceV2StepParam(raw);
  if (!step) notFound();

  if (step >= 11) {
    return renderGuidanceV2LateStep(step);
  }

  const early = await import("./page.early");
  const node = await early.default(props);
  if (!node) notFound();
  return node;
}
