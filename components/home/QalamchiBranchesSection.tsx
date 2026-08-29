import { Container } from "@/components/ui/Container";
import { MediaImage } from "@/components/ui/MediaImage";
import { hasMediaUrl } from "@/lib/media";
import { aboutContent } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";
import type { PublicQalamchiCard } from "@/lib/website/marketing-cards-public";

const headingId = "qalamchi-branches-heading";

function BranchImageFallback({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[14rem] flex-col items-center justify-center bg-amber-50 px-6 text-center"
    >
      <p className="text-xs font-medium tracking-wide text-secondary">
        نمایندگی قلم‌چی
      </p>
      <p className="mt-3 text-sm font-medium leading-7 text-primary">
        {toPersianDigits(label)}
      </p>
    </div>
  );
}

function BranchCard({ card }: { card: PublicQalamchiCard }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-amber-200/70 bg-white shadow-sm">
      <div className="relative aspect-[16/11] overflow-hidden bg-amber-50/60">
        {hasMediaUrl(card.media) ? (
          <MediaImage
            media={card.media}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <BranchImageFallback label={card.media.alt || card.title} />
        )}
      </div>
      <div className="flex flex-1 flex-col border-t border-border px-5 py-4 sm:px-6 sm:py-5">
        <p className="text-[0.7rem] font-medium tracking-wide text-secondary sm:text-xs">
          {toPersianDigits(card.badge)}
        </p>
        <h3 className="mt-1.5 text-lg font-bold text-primary sm:text-xl">
          {toPersianDigits(card.title)}
        </h3>
        <p className="mt-2 text-sm leading-7 text-muted">
          {toPersianDigits(card.description)}
        </p>
      </div>
    </article>
  );
}

type QalamchiBranchesSectionProps = {
  cards: PublicQalamchiCard[];
};

export function QalamchiBranchesSection({
  cards,
}: QalamchiBranchesSectionProps) {
  const { branches } = aboutContent;

  return (
    <section
      id="qalamchi-section"
      aria-labelledby={headingId}
      className="relative w-full overflow-hidden border-y border-amber-300/70 border-t-4 border-t-[#D4AF37] bg-[#FEF3C7] py-16 sm:py-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.16),transparent_42%)]"
      />
      <div className="relative z-10">
        <Container>
          <header className="max-w-3xl">
            <p className="inline-flex items-center rounded-full border border-[#D4AF37]/55 bg-white/80 px-3 py-1 text-xs font-medium tracking-wide text-secondary shadow-sm">
              {toPersianDigits(branches.eyebrow)}
            </p>
            <h2
              id={headingId}
              className="mt-4 text-2xl font-bold text-primary sm:text-3xl"
            >
              {toPersianDigits(branches.heading)}
            </h2>
            <div
              aria-hidden="true"
              className="mt-4 h-1 w-14 rounded-full bg-[#D4AF37]"
            />
            <p className="mt-4 text-base leading-8 text-muted">
              {toPersianDigits(branches.description)}
            </p>
          </header>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
            {cards.map((card) => (
              <BranchCard key={card.id} card={card} />
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}
