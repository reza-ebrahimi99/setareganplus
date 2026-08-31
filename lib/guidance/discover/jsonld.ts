import type { DiscoverFaq } from "@/lib/guidance/discover/types";
import {
  absoluteUrl,
  createJsonLdGraph,
  type JsonLdGraphDocument,
  type JsonLdNode,
} from "@/lib/seo/schema";

export function discoverWebPageJsonLd(input: {
  path: string;
  title: string;
  description: string;
  breadcrumbs: readonly { name: string; path: string }[];
  faq?: readonly DiscoverFaq[];
}): JsonLdGraphDocument {
  const pageUrl = absoluteUrl(input.path);
  const nodes: JsonLdNode[] = [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: input.title,
      description: input.description,
      inLanguage: "fa-IR",
      isPartOf: { "@id": absoluteUrl("/#website") },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement: input.breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
    },
  ];
  if (input.faq && input.faq.length > 0) {
    nodes.push({
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: input.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }
  return createJsonLdGraph(nodes);
}
