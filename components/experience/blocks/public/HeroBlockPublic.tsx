import { HeroSectionRenderer } from "@/components/website/page-builder/sections/HeroSectionRenderer";
import type { HeroBlockConfig } from "@/lib/experience/blocks/hero";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";
import type { SectionMediaMap } from "@/lib/website/page-builder/registry";

export function HeroBlockPublic({
  config,
  media,
}: ExperiencePublicBlockRendererProps<HeroBlockConfig>) {
  return (
    <HeroSectionRenderer config={config} media={media as SectionMediaMap} />
  );
}
