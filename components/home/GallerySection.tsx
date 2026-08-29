import { Container } from "@/components/ui/Container";
import { MediaImage } from "@/components/ui/MediaImage";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { GalleryFit, GallerySlot } from "@/content/home";
import { hasMediaUrl } from "@/lib/media";
import { toPersianDigits } from "@/lib/persian";
import { loadHomepageGalleryImages } from "@/lib/website/gallery-public";

const headingId = "gallery-heading";

const slotClassName: Record<GallerySlot, string> = {
  feature: "lg:col-span-7",
  secondary: "lg:col-span-5",
  tile: "sm:col-span-1 lg:col-span-3",
};

const slotFrameClassName: Record<GallerySlot, string> = {
  feature:
    "aspect-[3/4] max-h-[28rem] sm:aspect-[4/5] lg:aspect-auto lg:h-[28rem] lg:max-h-[28rem]",
  secondary:
    "aspect-[3/4] max-h-[28rem] sm:aspect-[4/5] lg:aspect-auto lg:h-[28rem] lg:max-h-[28rem]",
  tile: "aspect-[3/4] max-h-[20rem] sm:aspect-[4/5] lg:aspect-auto lg:h-[17.5rem] lg:max-h-[20rem]",
};

const fitClassName: Record<GalleryFit, string> = {
  cover: "object-cover",
  contain: "object-contain",
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

export async function GallerySection() {
  const { content, images } = await loadHomepageGalleryImages();

  return (
    <Section
      className="section-muted border-y border-border"
      ariaLabelledby={headingId}
    >
      <Container>
        <SectionHeader
          eyebrow={content.eyebrow}
          heading={content.heading}
          description={content.description}
          headingId={headingId}
        />

        <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-12">
          {images.map((item, index) => (
            <li
              key={item.mediaKey}
              className={`gallery-reveal ${slotClassName[item.slot]}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <figure className="gallery-tile group relative h-full overflow-hidden rounded-2xl border border-border bg-white focus-within:ring-2 focus-within:ring-secondary/40 focus-within:ring-offset-2">
                <div
                  className={`relative w-full overflow-hidden bg-primary/[0.03] ${slotFrameClassName[item.slot]}`}
                >
                  {hasMediaUrl(item.media) ? (
                    <MediaImage
                      media={item.media}
                      fill
                      className={`${fitClassName[item.fit]} ${item.objectPosition} transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100`}
                      sizes={
                        item.slot === "feature"
                          ? "(max-width: 1024px) 100vw, 58vw"
                          : item.slot === "secondary"
                            ? "(max-width: 1024px) 100vw, 42vw"
                            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-primary/75 via-primary/25 to-transparent"
                  />
                </div>

                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
                  <p className="text-[0.7rem] font-medium tracking-wide text-secondary sm:text-xs">
                    {toPersianDigits(item.category)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white sm:text-base">
                    {toPersianDigits(item.title)}
                  </p>
                  {item.caption ? (
                    <p className="mt-1 text-xs leading-6 text-white/85">
                      {toPersianDigits(item.caption)}
                    </p>
                  ) : null}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
