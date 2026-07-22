/**
 * Typed page-level Metadata factory for public routes.
 * Uses absolute titles so root template does not double-suffix.
 */

import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/seo/site-metadata";

export type CreatePageMetadataInput = {
  /** Full unique document title. */
  title: string;
  description: string;
  /** Pathname beginning with `/`, e.g. `/about`. */
  path: string;
  keywords?: readonly string[];
  robots?: Metadata["robots"];
  openGraphType?: "website" | "article" | "profile";
  /** Optional absolute image URL or site-relative path for OG/Twitter. */
  imageUrl?: string | null;
  imageAlt?: string;
};

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function createPageMetadata(
  input: CreatePageMetadataInput,
): Metadata {
  const canonical = normalizePath(input.path);
  const robots = input.robots ?? { index: true, follow: true };

  const images =
    input.imageUrl != null && input.imageUrl.length > 0
      ? [
          {
            url: input.imageUrl,
            alt: input.imageAlt ?? input.title,
          },
        ]
      : undefined;

  return {
    title: { absolute: input.title },
    description: input.description,
    keywords: input.keywords ? [...input.keywords] : undefined,
    alternates: {
      canonical,
    },
    robots,
    openGraph: {
      type: input.openGraphType ?? "website",
      locale: "fa_IR",
      url: canonical,
      siteName: SITE_NAME,
      title: input.title,
      description: input.description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      ...(images ? { images: images.map((image) => image.url) } : {}),
    },
  };
}
