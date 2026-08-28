import type { PageBuilderSectionType } from "@/lib/website/page-builder/constants";
import type { SectionMediaMap } from "@/lib/website/page-builder/registry";
import type {
  AnySectionConfig,
  CtaSectionConfig,
  HeroSectionConfig,
  ImageSectionConfig,
  RichTextSectionConfig,
  SpacerSectionConfig,
} from "@/lib/website/page-builder/types";
import { parseSectionConfig } from "@/lib/website/page-builder/validate-config";
import { CtaSectionRenderer } from "./sections/CtaSectionRenderer";
import { HeroSectionRenderer } from "./sections/HeroSectionRenderer";
import { ImageSectionRenderer } from "./sections/ImageSectionRenderer";
import { RichTextSectionRenderer } from "./sections/RichTextSectionRenderer";
import { SpacerSectionRenderer } from "./sections/SpacerSectionRenderer";

export type SectionRendererInput = {
  id: string;
  type: PageBuilderSectionType;
  config: AnySectionConfig;
  media: SectionMediaMap;
};

function renderTyped(
  type: PageBuilderSectionType,
  config: AnySectionConfig,
  media: SectionMediaMap,
) {
  switch (type) {
    case "HERO":
      return (
        <HeroSectionRenderer
          config={config as HeroSectionConfig}
          media={media}
        />
      );
    case "IMAGE":
      return (
        <ImageSectionRenderer
          config={config as ImageSectionConfig}
          media={media}
        />
      );
    case "RICH_TEXT":
      return (
        <RichTextSectionRenderer
          config={config as RichTextSectionConfig}
          media={media}
        />
      );
    case "CTA":
      return (
        <CtaSectionRenderer
          config={config as CtaSectionConfig}
          media={media}
        />
      );
    case "SPACER":
      return (
        <SpacerSectionRenderer
          config={config as SpacerSectionConfig}
          media={media}
        />
      );
    default:
      return null;
  }
}

/**
 * Centralized section renderer with safe failure boundary.
 * One malformed section must never crash the page.
 */
export function SectionRenderer({
  section,
}: {
  section: SectionRendererInput;
}) {
  try {
    const parsed = parseSectionConfig(section.type, section.config);
    if (!parsed.ok) return null;
    return renderTyped(section.type, parsed.data, section.media);
  } catch {
    return null;
  }
}

export function PageSectionsRenderer({
  sections,
}: {
  sections: SectionRendererInput[];
}) {
  return (
    <>
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
}
