import type { MediaAsset } from "@/lib/media";
import { hasMediaUrl } from "@/lib/media";
import { MediaImage } from "@/components/ui/MediaImage";
import { toPersianDigits } from "@/lib/persian";

type ContentCardVariant = "default" | "notice" | "quote";

type ContentCardProps = {
  heading: string;
  body: string;
  variant?: ContentCardVariant;
  /** @deprecated Prefer media — resolved URL from StarOS media library */
  image?: string;
  imageAlt?: string;
  media?: MediaAsset;
  imageFallback?: React.ReactNode;
  author?: string;
  detail?: string;
};

const variantStyles: Record<ContentCardVariant, string> = {
  default: "premium-card p-6",
  notice:
    "rounded-xl border border-dashed border-border bg-background p-6 shadow-sm",
  quote: "premium-card p-6",
};

export function ContentCard({
  heading,
  body,
  variant = "default",
  image,
  imageAlt,
  media,
  imageFallback,
  author,
  detail,
}: ContentCardProps) {
  const resolvedMedia: MediaAsset | undefined = media
    ? media
    : image
      ? { url: image, alt: imageAlt ?? heading }
      : undefined;

  const imageElement =
    resolvedMedia && hasMediaUrl(resolvedMedia) && variant !== "quote" ? (
      <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-xl border border-border">
        <MediaImage
          media={resolvedMedia}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 672px"
        />
      </div>
    ) : imageFallback && variant !== "quote" ? (
      <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-xl border border-border">
        {imageFallback}
      </div>
    ) : null;

  if (variant === "quote") {
    return (
      <article className={variantStyles.quote}>
        <blockquote className="border-s-4 border-secondary/50 ps-4">
          {heading ? (
            <p className="mb-3 text-sm font-semibold text-primary">
              {toPersianDigits(heading)}
            </p>
          ) : null}
          <p className="text-base leading-8 text-muted">{toPersianDigits(body)}</p>
        </blockquote>
        {author || detail ? (
          <footer className="mt-4 border-t border-border pt-4">
            {author ? (
              <cite className="text-sm font-semibold not-italic text-primary">
                {toPersianDigits(author)}
              </cite>
            ) : null}
            {detail ? (
              <p className="mt-1 text-sm leading-7 text-muted">
                {toPersianDigits(detail)}
              </p>
            ) : null}
          </footer>
        ) : null}
      </article>
    );
  }

  return (
    <article className={variantStyles[variant]}>
      {imageElement}
      <h2 className="text-xl font-semibold text-primary">
        {toPersianDigits(heading)}
      </h2>
      <p className="mt-3 text-base leading-8 text-muted">{toPersianDigits(body)}</p>
    </article>
  );
}
