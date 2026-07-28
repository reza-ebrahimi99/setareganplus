import { RichTextSectionRenderer } from "@/components/website/page-builder/sections/RichTextSectionRenderer";
import type { RichTextBlockConfig } from "@/lib/experience/blocks/rich-text";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";

export function RichTextBlockPublic({
  config,
}: ExperiencePublicBlockRendererProps<RichTextBlockConfig>) {
  return <RichTextSectionRenderer config={config} media={{}} />;
}
