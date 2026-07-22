/**
 * WebSite JSON-LD — site identity for sitelinks / publisher linkage.
 */

import { idRef, schemaId, type JsonLdNode } from "@/lib/seo/schema";
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
} from "@/lib/seo/site-metadata";

export function buildWebSiteSchema(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": schemaId("website"),
    name: SITE_NAME,
    url: SITE_ORIGIN,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "fa-IR",
    publisher: idRef("organization"),
    about: idRef("organization"),
  };
}
