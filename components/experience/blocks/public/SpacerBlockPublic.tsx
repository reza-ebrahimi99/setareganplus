import { SpacerSectionRenderer } from "@/components/website/page-builder/sections/SpacerSectionRenderer";
import type { SpacerBlockConfig } from "@/lib/experience/blocks/spacer";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";

export function SpacerBlockPublic({
  config,
}: ExperiencePublicBlockRendererProps<SpacerBlockConfig>) {
  return <SpacerSectionRenderer config={config} media={{}} />;
}
