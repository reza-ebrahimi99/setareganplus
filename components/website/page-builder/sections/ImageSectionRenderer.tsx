import { MediaImage } from "@/components/ui/MediaImage";
import { resolveSectionImageAlt } from "@/lib/website/page-builder/image-alt";
import type { SectionMediaMap } from "@/lib/website/page-builder/registry";
import type { ImageSectionConfig } from "@/lib/website/page-builder/types";

type Props = {
  config: ImageSectionConfig;
  media: SectionMediaMap;
};

const aspectClass: Record<ImageSectionConfig["aspect"], string> = {
  auto: "",
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
};

export function ImageSectionRenderer({ config, media }: Props) {
  const primary = media.primary;
  if (!primary) return null;

  const alt = resolveSectionImageAlt(primary, config.altOverride);
  const image = (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-primary/[0.03] ${aspectClass[config.aspect]}`}
    >
      <MediaImage
        media={{ url: primary.url, alt }}
        fill={config.aspect !== "auto"}
        width={config.aspect === "auto" ? 1200 : undefined}
        height={config.aspect === "auto" ? 675 : undefined}
        className={
          config.objectFit === "contain" ? "object-contain" : "object-cover"
        }
        sizes="(max-width: 768px) 100vw, 960px"
      />
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {config.linkHref ? (
        <a href={config.linkHref} className="block focus-visible:outline-none">
          {image}
        </a>
      ) : (
        image
      )}
      {config.caption ? (
        <p className="mt-3 text-center text-sm leading-7 text-muted">
          {config.caption}
        </p>
      ) : null}
    </section>
  );
}
