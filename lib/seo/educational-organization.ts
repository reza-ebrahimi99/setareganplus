/**
 * EducationalOrganization JSON-LD — مرکز آموزشی ستارگان پلاس.
 */

import { institutionEntities } from "@/content/home";
import { idRef, schemaId, type JsonLdNode } from "@/lib/seo/schema";
import { SITE_ORIGIN } from "@/lib/seo/site-metadata";

export function buildEducationalOrganizationSchema(): JsonLdNode {
  const entity = institutionEntities.setareganPlus;

  return {
    "@type": "EducationalOrganization",
    "@id": schemaId("educational-organization"),
    name: entity.name,
    description: entity.description,
    url: SITE_ORIGIN,
    parentOrganization: idRef("organization"),
    areaServed: {
      "@type": "City",
      name: "نسیم‌شهر",
    },
    knowsAbout: [
      "کلاس‌های تقویتی",
      "آزمون‌های آموزشی",
      "مشاوره تحصیلی",
      "آمادگی تحصیلی",
    ],
  };
}
