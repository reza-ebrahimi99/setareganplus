"use client";

import Image from "next/image";

type ShopProductCoverProps = {
  imageUrl: string | null;
  imageAlt: string;
  priority?: boolean;
  sizes?: string;
};

export function ShopProductCover({
  imageUrl,
  imageAlt,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 33vw",
}: ShopProductCoverProps) {
  const unoptimized =
    !imageUrl ||
    imageUrl.startsWith("/media/") ||
    !imageUrl.startsWith("/");

  if (!imageUrl) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 text-sm text-muted">
        بدون تصویر جلد
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={imageAlt}
      fill
      className="object-cover"
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
    />
  );
}
