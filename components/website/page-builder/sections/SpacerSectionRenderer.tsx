import type { SectionMediaMap } from "@/lib/website/page-builder/registry";
import type { SpacerSectionConfig } from "@/lib/website/page-builder/types";

type Props = {
  config: SpacerSectionConfig;
  media: SectionMediaMap;
};

const sizeClass: Record<SpacerSectionConfig["size"], string> = {
  sm: "h-6 sm:h-8",
  md: "h-10 sm:h-14",
  lg: "h-16 sm:h-24",
  xl: "h-24 sm:h-36",
};

export function SpacerSectionRenderer({ config }: Props) {
  return (
    <div
      aria-hidden
      className={`w-full ${sizeClass[config.size]}`}
    />
  );
}
