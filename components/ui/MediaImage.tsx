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

  if (fill) {
    return (
      <Image
        src={url}
        alt={media.alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        unoptimized={!isLocalPath}
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
      unoptimized={!isLocalPath}
    />
  );
}
