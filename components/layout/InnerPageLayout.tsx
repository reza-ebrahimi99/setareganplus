import { SiteShell } from "@/components/layout/SiteShell";
import type { BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { CtaPanel } from "@/components/ui/CtaPanel";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";

type CtaConfig = {
  heading: string;
  description: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
};

type InnerPageLayoutProps = {
  activePath?: string;
  breadcrumbs?: readonly BreadcrumbItem[];
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
  cta?: CtaConfig;
};

export function InnerPageLayout({
  activePath,
  breadcrumbs,
  title,
  subtitle,
  eyebrow,
  children,
  cta,
}: InnerPageLayoutProps) {
  return (
    <SiteShell activePath={activePath}>
      <Section ariaLabelledby="page-heading">
        <Container>
          <PageHero
            title={title}
            subtitle={subtitle}
            breadcrumbs={breadcrumbs}
            eyebrow={eyebrow}
          />
          {children}
          {cta ? (
            <div className="mt-10">
              <CtaPanel
                heading={cta.heading}
                description={cta.description}
                primary={cta.primary}
                secondary={cta.secondary}
              />
            </div>
          ) : null}
        </Container>
      </Section>
    </SiteShell>
  );
}
