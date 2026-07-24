"use client";

import { GalleryMasonry } from "@/components/gallery/GalleryMasonry";
import { ScrollReveal } from "@/components/about/ScrollReveal";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutGalleryContent } from "@/content/about-page";

const headingId = "about-gallery-heading";

export function AboutGallerySection() {
  const { eyebrow, heading, description, items } = aboutGalleryContent;

  return (
    <Section className="section-muted" ariaLabelledby={headingId}>
      <Container>
        <ScrollReveal>
          <SectionHeader
            eyebrow={eyebrow}
            heading={heading}
            description={description}
            headingId={headingId}
          />
        </ScrollReveal>

        <div className="mt-10">
          <ScrollReveal delayMs={80}>
            <GalleryMasonry items={[...items]} />
          </ScrollReveal>
        </div>
      </Container>
    </Section>
  );
}
