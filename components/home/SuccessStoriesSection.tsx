import { Container } from "@/components/ui/Container";
import { successStories, successStoriesContent } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "success-stories-heading";

function EmptyIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 96"
      className="mx-auto h-20 w-auto text-secondary/70"
      fill="none"
    >
      <rect
        x="18"
        y="18"
        width="124"
        height="60"
        rx="16"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.45"
      />
      <path
        d="M40 44h36M40 56h52"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="118" cy="50" r="10" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path
        d="M114 50h8M118 46v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function SuccessStoriesSection() {
  const hasStories = successStories.length > 0;

  return (
    <section
      aria-labelledby={headingId}
      className="section-rhythm-gradient border-y border-border/50"
    >
      <Container className="py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium tracking-[0.18em] text-secondary">
            {toPersianDigits(successStoriesContent.eyebrow)}
          </p>
          <h2
            id={headingId}
            className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl"
          >
            {toPersianDigits(successStoriesContent.heading)}
          </h2>
          <p className="mt-4 text-base leading-9 text-muted sm:text-lg">
            {toPersianDigits(successStoriesContent.description)}
          </p>
        </div>

        {hasStories ? (
          <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {successStories.map((story) => (
              <li key={`${story.author}-${story.quote.slice(0, 24)}`}>
                <figure className="glass-quote-card h-full p-6">
                  <blockquote className="text-base leading-8 text-primary/90">
                    «{toPersianDigits(story.quote)}»
                  </blockquote>
                  <figcaption className="mt-6 border-t border-white/40 pt-4">
                    <p className="text-sm font-semibold text-primary">
                      {toPersianDigits(story.author)}
                    </p>
                    {story.detail ? (
                      <p className="mt-1 text-xs text-muted">
                        {toPersianDigits(story.detail)}
                      </p>
                    ) : null}
                    {story.role ? (
                      <p className="mt-2 text-[0.7rem] font-medium tracking-wide text-secondary">
                        {story.role === "parent" ? "والد" : "دانش‌آموز"}
                      </p>
                    ) : null}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        ) : (
          <div className="glass-quote-card mx-auto mt-12 max-w-2xl p-8 text-center sm:p-12">
            <EmptyIllustration />
            <p className="mt-6 text-lg font-semibold text-primary">
              {toPersianDigits(successStoriesContent.emptyHeading)}
            </p>
            <p className="mt-3 text-sm leading-8 text-muted sm:text-base">
              {toPersianDigits(successStoriesContent.emptyBody)}
            </p>
          </div>
        )}
      </Container>
    </section>
  );
}
