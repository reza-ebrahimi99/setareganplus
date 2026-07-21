import { MediaImage } from "@/components/ui/MediaImage";
import { resolveSectionImageAlt } from "@/lib/website/page-builder/image-alt";
import type { SectionMediaMap } from "@/lib/website/page-builder/registry";
import type { CtaSectionConfig } from "@/lib/website/page-builder/types";

type Props = {
  config: CtaSectionConfig;
  media: SectionMediaMap;
};

export function CtaSectionRenderer({ config, media }: Props) {
  const background = media.background;
  const alignClass =
    config.align === "center" ? "items-center text-center" : "items-start text-start";

  return (
    <section className="relative isolate overflow-hidden bg-primary text-white">
      {background ? (
        <>
          <div className="absolute inset-0">
            <MediaImage
              media={{
                url: background.url,
                alt: resolveSectionImageAlt(background),
              }}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
          <div aria-hidden className="absolute inset-0 bg-primary/70" />
        </>
      ) : null}

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-4 py-14 sm:px-6 lg:px-8">
        <div className={`flex max-w-3xl flex-col gap-3 ${alignClass}`}>
          <h2 className="text-2xl font-bold sm:text-3xl">{config.title}</h2>
          {config.description ? (
            <p className="text-base leading-8 text-white/90">
              {config.description}
            </p>
          ) : null}
          {(config.primaryCta || config.secondaryCta) && (
            <div
              className={`mt-4 flex flex-wrap gap-3 ${
                config.align === "center" ? "justify-center" : "justify-start"
              }`}
            >
              {config.primaryCta ? (
                <a
                  href={config.primaryCta.href}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary"
                >
                  {config.primaryCta.label}
                </a>
              ) : null}
              {config.secondaryCta ? (
                <a
                  href={config.secondaryCta.href}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/60 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {config.secondaryCta.label}
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
