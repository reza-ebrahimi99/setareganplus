import { Container } from "@/components/ui/Container";
import { MediaImage } from "@/components/ui/MediaImage";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { galleryContent, galleryImages } from "@/content/home";
import { hasMediaUrl } from "@/lib/media";
import { toPersianDigits } from "@/lib/persian";

const headingId = "gallery-heading";

function GalleryTileFallback({
  title,
  category,
}: {
  title: string;
  category: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col justify-between bg-gradient-to-br from-primary/8 via-surface to-secondary/10 p-4"
    >
      <span className="inline-flex w-fit rounded-full border border-secondary/30 bg-surface px-2.5 py-0.5 text-xs font-medium text-secondary">
        {toPersianDigits(category)}
      </span>
      <p className="mt-4 text-sm font-semibold leading-7 text-primary">
        {toPersianDigits(title)}
      </p>
    </div>
  );
}

export function GallerySection() {
  return (
    <Section
      className="section-muted border-y border-border"
      ariaLabelledby={headingId}
    >
      <Container>
        <SectionHeader
          eyebrow={galleryContent.eyebrow}
          heading={galleryContent.heading}
          description={galleryContent.description}
          headingId={headingId}
        />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleryImages.map((item) => (
            <li key={item.mediaKey}>
              <figure className="premium-card overflow-hidden">
                <div className="relative aspect-[3/2] border-b border-border">
                  {hasMediaUrl(item.media) ? (
                    <MediaImage
                      media={item.media}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  ) : (
                    <GalleryTileFallback
                      title={item.title}
                      category={item.category}
                    />
                  )}
                </div>
                <figcaption className="p-4">
                  <p className="text-sm font-semibold text-primary">
                    {toPersianDigits(item.title)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {toPersianDigits(item.media.alt)}
                  </p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
