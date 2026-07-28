import { RichTextSectionRenderer } from "@/components/website/page-builder/sections/RichTextSectionRenderer";
import type { RichTextBlockConfig } from "@/lib/experience/blocks/rich-text";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";

/** Renders plain text via page-builder safe renderer (no raw HTML). */
export function RichTextBlockPublic({
  config,
}: ExperiencePublicBlockRendererProps<RichTextBlockConfig>) {
  return <RichTextSectionRenderer config={config} media={{}} />;
}
