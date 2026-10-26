/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { responsive } from "@/lib/img";
import type { HighlightSettings } from "@/lib/settings";
import { DEFAULT_HIGHLIGHT_IMAGE } from "@/lib/settings";
import { Sparkle, Star, Icon } from "@/components/site/Star";
import { PhotoLightbox } from "@/components/site/PhotoLightbox";

const safeHref = (h: string) => (/^\/(?!\/)[^\s]*$/.test(h) || /^https:\/\/[^\s]+$/.test(h) ? h : "");

/** The very first block of the home page (above the hero): a framed photo + short message. */
export function HomeHighlight({ h }: { h: HighlightSettings }) {
  if (!h.enabled || !h.image) return null;
  const isDefault = h.image === DEFAULT_HIGHLIGHT_IMAGE;
  const full = isDefault ? "/highlight/tajlil-1405.jpg" : h.image;
  const href = safeHref(h.ctaHref);
  // One <img> with a webp srcset (no <picture>): React preloads exactly the candidate the
  // phone needs, instead of also fetching the 136 KB jpg fallback.
  const sizes = "(min-width: 1024px) 500px, 92vw";
  const img = isDefault
    ? { src: "/highlight/tajlil-1405-800.webp", srcSet: "/highlight/tajlil-1405-480.webp 480w, /highlight/tajlil-1405-640.webp 640w, /highlight/tajlil-1405-704.webp 704w, /highlight/tajlil-1405-800.webp 800w, /highlight/tajlil-1405.webp 1000w", sizes }
    : responsive(h.image, sizes, 960);
  const photo = <img {...img} alt={h.imageAlt} width={1000} height={750} fetchPriority="high" decoding="async" className="aspect-[4/3] w-full rounded-[1.1rem] object-cover" />;

  return (
    <section aria-labelledby="hl-title" className="relative overflow-hidden border-b border-gold/30 bg-[radial-gradient(70%_120%_at_100%_0%,rgb(244_178_27/0.16),transparent_60%),radial-gradient(60%_100%_at_0%_100%,rgb(47_91_234/0.10),transparent_60%)] bg-ivory">
      <div className="bg-dots-dark pointer-events-none absolute inset-0" />
      <Sparkle className="animate-twinkle pointer-events-none absolute top-5 right-[42%] hidden size-3 text-gold lg:block" />
      <Star className="pointer-events-none absolute -bottom-16 -right-16 size-56 text-gold/[0.08]" />
      <div className="container-x relative grid items-center gap-4 py-4 sm:py-6 lg:grid-cols-[1fr_minmax(0,500px)] lg:gap-12 lg:py-7">
        <div className="lg:order-2">
          <div className="rounded-[1.4rem] bg-gradient-to-br from-[#ffe08a] via-gold to-[#c98a00] p-[5px] shadow-[0_24px_60px_-28px_rgb(122_86_0/0.65)]">
            <div className="rounded-[1.15rem] bg-white p-[3px]">
              <PhotoLightbox full={full} alt={h.imageAlt} label={`مشاهدهٔ بزرگ‌تر: ${h.title}`}>
                {photo}
              </PhotoLightbox>
            </div>
          </div>
        </div>
        <div className="text-center lg:order-1 lg:text-right">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/15 px-3 py-1 text-xs font-bold text-gold-ink sm:text-sm">
            <Icon name="trophy" className="size-4" /> {h.subtitle || "افتخارات"}
          </span>
          <h2 id="hl-title" className="mt-2 text-balance text-[1.35rem] leading-[1.5] font-black text-navy sm:mt-3 sm:text-3xl lg:text-[2.35rem] lg:leading-[1.4]">
            {h.title}
          </h2>
          <div aria-hidden="true" className="mx-auto mt-2 h-1 w-20 rounded-full bg-gradient-to-l from-[#ffd36b] to-gold lg:mx-0 lg:mt-4" />
          {h.text && <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-ink/75 sm:text-base sm:leading-8 lg:mx-0 lg:mt-4 lg:text-lg lg:leading-9">{h.text}</p>}
          {href && h.ctaLabel && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 lg:mt-6 lg:justify-start">
              <Link href={href} className="btn-navy px-5 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base">
                {h.ctaLabel} <Icon name="arrow" className="size-4" />
              </Link>
              <Link href="/konkur-nasimshahr" className="hidden text-sm font-bold text-royal hover:underline sm:inline">مشاوره و برنامهٔ کنکور ←</Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
