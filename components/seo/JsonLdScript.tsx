import {
  serializeJsonLd,
  type JsonLdGraphDocument,
} from "@/lib/seo/schema";
import { buildSiteJsonLdGraph } from "@/lib/seo/site-graph";

type JsonLdScriptProps = {
  /** Defaults to the sitewide @graph. Pass a custom document for page-level schemas later. */
  document?: JsonLdGraphDocument;
};

/** Server-only JSON-LD injector (no client JS). */
export function JsonLdScript({ document }: JsonLdScriptProps) {
  const payload = serializeJsonLd(document ?? buildSiteJsonLdGraph());

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  );
}
