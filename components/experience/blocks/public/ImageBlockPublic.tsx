import { ImageSectionRenderer } from "@/components/website/page-builder/sections/ImageSectionRenderer";
import type { ImageBlockConfig } from "@/lib/experience/blocks/image";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";
import type { SectionMediaMap } from "@/lib/website/page-builder/registry";

export function ImageBlockPublic({
  config,
  media,
}: ExperiencePublicBlockRendererProps<ImageBlockConfig>) {
  return (
    <ImageSectionRenderer
      config={config}
      media={media as SectionMediaMap}
    />
  );
}
