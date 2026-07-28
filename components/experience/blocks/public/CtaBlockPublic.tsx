import { CtaSectionRenderer } from "@/components/website/page-builder/sections/CtaSectionRenderer";
import type { CtaBlockConfig } from "@/lib/experience/blocks/cta";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";
import type { SectionMediaMap } from "@/lib/website/page-builder/registry";

export function CtaBlockPublic({
  config,
  media,
}: ExperiencePublicBlockRendererProps<CtaBlockConfig>) {
  return (
    <CtaSectionRenderer config={config} media={media as SectionMediaMap} />
  );
}
