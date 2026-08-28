import { Container } from "@/components/ui/Container";
import { MediaImage } from "@/components/ui/MediaImage";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutPageContent } from "@/content/about-page";
import { hasMediaUrl } from "@/lib/media";
import { toPersianDigits } from "@/lib/persian";

const slotClassName = {
  feature: "lg:col-span-7",
  secondary: "lg:col-span-5",
  tile: "sm:col-span-1 lg:col-span-3",
} as const;

const slotFrameClassName = {
  feature:
    "aspect-[4/3] max-h-[26rem] lg:aspect-auto lg:h-[26rem] lg:max-h-[26rem]",
  secondary:
    "aspect-[4/3] max-h-[26rem] lg:aspect-auto lg:h-[26rem] lg:max-h-[26rem]",
  tile: "aspect-[4/3] max-h-[18rem] lg:aspect-auto lg:h-[16rem] lg:max-h-[18rem]",
} as const;

export function CampusGallery() {
  const { campus } = aboutPageContent;

  return (
    <Section
      className="section-muted border-y border-border"
      ariaLabelledby="about-campus-heading"
    >
      <Container>
        <SectionHeader
          eyebrow={campus.eyebrow}
          heading={campus.title}
          description={campus.description}
          headingId="about-campus-heading"
        />
        <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-12">
          {campus.images.map((item, index) => (
            <li
              key={`${item.title}-${index}`}
              className={`gallery-reveal ${slotClassName[item.slot]}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <figure className="gallery-tile group relative h-full overflow-hidden rounded-2xl border border-border bg-white">
                <div
                  className={`relative w-full overflow-hidden bg-primary/[0.03] ${slotFrameClassName[item.slot]}`}
                >
                  {hasMediaUrl(item.media) ? (
                    <MediaImage
                      media={item.media}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
                    />
                  ) : null}
                </div>
                <figcaption className="border-t border-border px-4 py-3 text-sm font-medium text-primary">
                  {toPersianDigits(item.title)}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
