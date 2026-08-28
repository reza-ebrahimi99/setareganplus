import Image from "next/image";
import type { MediaAsset } from "@/lib/media";
import { resolveMediaUrl } from "@/lib/media";

type MediaImageProps = {
  media: MediaAsset;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function MediaImage({
  media,
  fill,
  width,
  height,
  className,
  sizes,
  priority,
}: MediaImageProps) {
  const url = resolveMediaUrl(media);

  if (!url) {
    return null;
  }

  const isLocalPath = url.startsWith("/");
  // /media/* is served directly by nginx from STAROS_MEDIA_ROOT (outside
  // public/). Passing it through the Next.js image optimizer causes /_next/image
  // requests that fail on production (Sharp). Serve those URLs unoptimized.
  const isNginxMediaPath = url.startsWith("/media/");
  const unoptimized = !isLocalPath || isNginxMediaPath;

  if (fill) {
    return (
      <Image
        src={url}
        alt={media.alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
      />
    );
  }

  return (
    <Image
      src={url}
      alt={media.alt}
      width={width ?? 400}
      height={height ?? 300}
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
    />
  );
}
