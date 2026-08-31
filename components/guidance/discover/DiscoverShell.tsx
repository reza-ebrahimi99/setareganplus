import { SiteShell } from "@/components/layout/SiteShell";
import { Container } from "@/components/ui/Container";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { DiscoverConversion } from "@/components/guidance/discover/DiscoverConversion";
import { DiscoverSearchForm } from "@/components/guidance/discover/DiscoverSearchForm";
import type { DiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import type { JsonLdGraphDocument } from "@/lib/seo/schema";

export function DiscoverShell({
  children,
  breadcrumbs,
  jsonLd,
  visitor,
  activePath = "/discover",
}: {
  children: React.ReactNode;
  breadcrumbs: readonly BreadcrumbItem[];
  jsonLd: JsonLdGraphDocument;
  visitor: DiscoveryVisitor;
  activePath?: string;
}) {
  return (
    <SiteShell activePath={activePath}>
      <JsonLdScript document={jsonLd} />
      <div className="discover" dir="rtl">
        <Container>
          <div className="discover__top">
            <Breadcrumbs items={breadcrumbs} />
            <DiscoverSearchForm />
          </div>
          {children}
          <DiscoverConversion visitor={visitor} />
        </Container>
      </div>
    </SiteShell>
  );
}
