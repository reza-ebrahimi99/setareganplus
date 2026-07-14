import { Container } from "@/components/ui/Container";
import { MediaImage } from "@/components/ui/MediaImage";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  galleryContent,
  galleryImages,
  type GalleryFrame,
} from "@/content/home";
import { hasMediaUrl } from "@/lib/media";
import { toPersianDigits } from "@/lib/persian";

const headingId = "gallery-heading";

const frameAspect: Record<GalleryFrame, string> = {
  feature: "aspect-[4/5] sm:aspect-[5/6] lg:aspect-[4/5]",
  portrait: "aspect-[4/5]",
  landscape: "aspect-[16/11]",
};

const frameSpan: Record<GalleryFrame, string> = {
  feature: "lg:col-span-7 lg:row-span-2",
  portrait: "lg:col-span-5",
  landscape: "sm:col-span-1 lg:col-span-4",
};

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
      className="flex h-full flex-col justify-between bg-primary/[0.04] p-4"
    >
      <span className="text-xs font-medium text-secondary">
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

        <ul className="mt-10 grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-12">
          {galleryImages.map((item, index) => (
            <li
              key={item.mediaKey}
              className={`gallery-reveal ${frameSpan[item.frame]}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <figure className="gallery-tile group relative h-full overflow-hidden rounded-2xl border border-border bg-primary/[0.03] focus-within:ring-2 focus-within:ring-secondary/40 focus-within:ring-offset-2">
                <div
                  className={`relative w-full overflow-hidden ${frameAspect[item.frame]} ${
                    item.frame === "feature" ? "lg:min-h-[34rem]" : ""
                  }`}
                >
                  {hasMediaUrl(item.media) ? (
                    <MediaImage
                      media={item.media}
                      fill
                      className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      sizes={
                        item.frame === "feature"
                          ? "(max-width: 1024px) 100vw, 58vw"
                          : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      }
                    />
                  ) : (
                    <GalleryTileFallback
                      title={item.title}
                      category={item.category}
                    />
                  )}

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent"
                  />
                </div>

                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <p className="text-[0.7rem] font-medium tracking-wide text-secondary sm:text-xs">
                    {toPersianDigits(item.category)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white sm:text-base">
                    {toPersianDigits(item.title)}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-white/80">
                    {toPersianDigits(item.caption)}
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
