import { MediaImage } from "@/components/ui/MediaImage";
import { resolveSectionImageAlt } from "@/lib/website/page-builder/image-alt";
import type { SectionMediaMap } from "@/lib/website/page-builder/registry";
import type { HeroSectionConfig } from "@/lib/website/page-builder/types";

type Props = {
  config: HeroSectionConfig;
  media: SectionMediaMap;
};

const overlayClass: Record<HeroSectionConfig["overlay"], string> = {
  none: "",
  soft: "bg-primary/40",
  strong: "bg-primary/70",
};

export function HeroSectionRenderer({ config, media }: Props) {
  const desktop = media.primary;
  const mobile = media.mobile ?? media.primary;
  const alignClass =
    config.align === "center" ? "items-center text-center" : "items-start text-start";

  return (
    <section className="relative isolate min-h-[70vh] overflow-hidden bg-primary text-white">
      {desktop ? (
        <>
          <div className="absolute inset-0 hidden md:block">
            <MediaImage
              media={{
                url: desktop.url,
                alt: resolveSectionImageAlt(desktop),
              }}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          </div>
          {mobile ? (
            <div className="absolute inset-0 md:hidden">
              <MediaImage
                media={{
                  url: mobile.url,
                  alt: resolveSectionImageAlt(mobile),
                }}
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
            </div>
          ) : null}
        </>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary/80"
        />
      )}

      {config.overlay !== "none" ? (
        <div
          aria-hidden
          className={`absolute inset-0 ${overlayClass[config.overlay]}`}
        />
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className={`flex max-w-3xl flex-col gap-4 ${alignClass}`}>
          {config.eyebrow ? (
            <p className="text-sm font-medium tracking-wide text-white/80">
              {config.eyebrow}
            </p>
          ) : null}
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            {config.headline}
          </h1>
          {config.subheadline ? (
            <p className="max-w-2xl text-base leading-8 text-white/90 sm:text-lg">
              {config.subheadline}
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
