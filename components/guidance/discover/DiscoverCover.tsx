import Image from "next/image";
import { discoverPhotoForSlug } from "@/lib/guidance/discover/types";

export function DiscoverCover({ slug }: { slug: string; title?: string }) {
  const photo = discoverPhotoForSlug(slug);
  return (
    <figure className="discover-cover">
      <Image
        src={photo.src}
        alt={photo.alt}
        width={1600}
        height={900}
        className="discover-cover__img"
        priority={false}
      />
      <figcaption>
        {photo.alt}. تصویر فضای مجموعه ستارگان است — نه نمای دانشگاه خاص.
      </figcaption>
    </figure>
  );
}
