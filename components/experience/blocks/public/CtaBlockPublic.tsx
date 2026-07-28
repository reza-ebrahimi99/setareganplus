import Link from "next/link";
import { MediaImage } from "@/components/ui/MediaImage";
import type { CtaBlockConfig } from "@/lib/experience/blocks/cta";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";
import { resolveSectionImageAlt } from "@/lib/website/page-builder/image-alt";
import { isSafeHref } from "@/lib/website/page-builder/safe-href";

function CtaLink({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: "primary" | "secondary";
}) {
  if (!isSafeHref(href)) return null;
  const className =
    variant === "primary"
      ? "inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary"
      : "inline-flex min-h-11 items-center justify-center rounded-xl border border-white/60 px-5 py-2.5 text-sm font-semibold text-white";

  const isInternal = href.startsWith("/") || href.startsWith("#") || href.startsWith("?");
  if (isInternal) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}

export function CtaBlockPublic({
  config,
  media,
}: ExperiencePublicBlockRendererProps<CtaBlockConfig>) {
  const background = media.background;
  const alignClass =
    config.align === "center" ? "items-center text-center" : "items-start text-start";

  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-primary text-white">
      {background?.url ? (
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
            <p className="text-base leading-8 text-white/90">{config.description}</p>
          ) : null}
          {(config.primaryCta || config.secondaryCta) && (
            <div
              className={`mt-4 flex flex-wrap gap-3 ${
                config.align === "center" ? "justify-center" : "justify-start"
              }`}
            >
              {config.primaryCta ? (
                <CtaLink
                  href={config.primaryCta.href}
                  label={config.primaryCta.label}
                  variant="primary"
                />
              ) : null}
              {config.secondaryCta ? (
                <CtaLink
                  href={config.secondaryCta.href}
                  label={config.secondaryCta.label}
                  variant="secondary"
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
