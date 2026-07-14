import { Container } from "@/components/ui/Container";
import { MediaImage } from "@/components/ui/MediaImage";
import { hasMediaUrl } from "@/lib/media";
import type { MediaAsset } from "@/lib/media";
import { aboutContent } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "qalamchi-branches-heading";

function BranchImageFallback({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[14rem] flex-col items-center justify-center bg-primary/[0.04] px-6 text-center"
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

function BranchCard({
  title,
  description,
  media,
}: {
  title: string;
  description: string;
  media: MediaAsset;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="relative aspect-[16/11] overflow-hidden bg-slate-50">
        {hasMediaUrl(media) ? (
          <MediaImage
            media={media}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <BranchImageFallback label={media.alt} />
        )}
      </div>
      <div className="flex flex-1 flex-col border-t border-border px-5 py-4 sm:px-6 sm:py-5">
        <p className="text-[0.7rem] font-medium tracking-wide text-secondary sm:text-xs">
          نمایندگی رسمی
        </p>
        <h3 className="mt-1.5 text-lg font-bold text-primary sm:text-xl">
          {toPersianDigits(title)}
        </h3>
        <p className="mt-2 text-sm leading-7 text-muted">
          {toPersianDigits(description)}
        </p>
      </div>
    </article>
  );
}

export function QalamchiBranchesSection() {
  const { branches } = aboutContent;

  return (
    <section
      aria-labelledby={headingId}
      className="relative w-full overflow-hidden border-y border-[#E8C768]/40 bg-[#FFF7DF] py-14 sm:py-20 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.14),transparent_42%)]"
    >
      <div className="relative z-10">
        <Container>
          <header className="max-w-3xl">
            <p className="inline-flex items-center rounded-full border border-[#E8C768]/55 bg-white/70 px-3 py-1 text-xs font-medium tracking-wide text-secondary shadow-sm">
              قلم‌چی
            </p>
            <h2
              id={headingId}
              className="mt-4 text-2xl font-bold text-primary sm:text-3xl"
            >
              {toPersianDigits(branches.heading)}
            </h2>
            <div
              aria-hidden="true"
              className="mt-4 h-1 w-14 rounded-full bg-secondary"
            />
            <p className="mt-4 text-base leading-8 text-muted">
              {toPersianDigits(branches.description)}
            </p>
          </header>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
            {branches.items.map((branch) => (
              <BranchCard
                key={branch.title}
                title={branch.title}
                description={branch.description}
                media={branch.media}
              />
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}
