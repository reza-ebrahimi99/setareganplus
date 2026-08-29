/**
 * JSON-LD primitives and helpers for public SEO structured data.
 * Future schemas (Person, Course, Event, FAQ, Article) should reuse these types.
 */

import { SITE_ORIGIN } from "@/lib/seo/site-metadata";

export type JsonLdPrimitive = string | number | boolean | null;
export type JsonLdValue =
  | JsonLdPrimitive
  | JsonLdNode
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type JsonLdNode = {
  "@type": string | string[];
  "@id"?: string;
  [key: string]: JsonLdValue | undefined;
};

export type JsonLdGraphDocument = {
  "@context": "https://schema.org";
  "@graph": JsonLdNode[];
};

export type SchemaIdFragment =
  | "organization"
  | "educational-organization"
  | "elementary-school"
  | "local-business"
  | "website"
  | "person"
  | "course"
  | "event"
  | "faq"
  | "article";

/** Stable `@id` under the canonical site origin. */
export function schemaId(fragment: SchemaIdFragment): string {
  return `${SITE_ORIGIN}/#${fragment}`;
}

/** Absolute URL for a site path or passthrough for absolute URLs. */
export function absoluteUrl(pathOrUrl: string): string {
  if (
    pathOrUrl.startsWith("http://") ||
    pathOrUrl.startsWith("https://")
  ) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith("/")) {
    return `${SITE_ORIGIN}${pathOrUrl}`;
  }
  return `${SITE_ORIGIN}/${pathOrUrl}`;
}

export function idRef(fragment: SchemaIdFragment): { "@id": string } {
  return { "@id": schemaId(fragment) };
}

/**
 * Serialize JSON-LD for embedding in HTML.
 * Escapes `<` to reduce XSS risk when stringifying untrusted future fields.
 */
export function serializeJsonLd(document: JsonLdGraphDocument): string {
  return JSON.stringify(document).replace(/</g, "\\u003c");
}

/** Build a `@graph` document from node generators (order preserved). */
export function createJsonLdGraph(
  nodes: readonly JsonLdNode[],
): JsonLdGraphDocument {
  return {
    "@context": "https://schema.org",
    "@graph": [...nodes],
  };
}
