/**
 * Assembles the sitewide JSON-LD @graph for root layout injection.
 */

import { buildEducationalOrganizationSchema } from "@/lib/seo/educational-organization";
import { buildElementarySchoolSchema } from "@/lib/seo/elementary-school";
import { buildLocalBusinessSchema } from "@/lib/seo/local-business";
import { buildOrganizationSchema } from "@/lib/seo/organization";
import {
  createJsonLdGraph,
  type JsonLdGraphDocument,
} from "@/lib/seo/schema";
import { buildWebSiteSchema } from "@/lib/seo/website";

export function buildSiteJsonLdGraph(): JsonLdGraphDocument {
  return createJsonLdGraph([
    buildOrganizationSchema(),
    buildEducationalOrganizationSchema(),
    buildElementarySchoolSchema(),
    buildLocalBusinessSchema(),
    buildWebSiteSchema(),
  ]);
}
