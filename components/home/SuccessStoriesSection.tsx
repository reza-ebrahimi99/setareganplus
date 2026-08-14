import { Container } from "@/components/ui/Container";
import { successStories, successStoriesContent } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "success-stories-heading";

function EmptyIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 220 140"
      className="mx-auto h-28 w-auto text-secondary"
      fill="none"
    >
      <defs>
        <linearGradient id="testimonial-empty-glow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(212 175 55)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(15 23 42)" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect
        x="24"
        y="22"
        width="172"
        height="96"
        rx="24"
        fill="url(#testimonial-empty-glow)"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
      <path
        d="M58 58c0-8 6.5-14 14.5-14S87 50 87 58c0 10-14.5 18-14.5 18S58 68 58 58z"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.7"
      />
      <path
        d="M112 56h54M112 70h40M112 84h48"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="168" cy="42" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <path
        d="M164 42h8M168 38v8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
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
      <Container className="py-12 sm:py-16">
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
          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <div className="glass-quote-card mx-auto mt-10 max-w-2xl p-8 text-center sm:p-11">
            <EmptyIllustration />
            <p className="mt-6 text-xl font-semibold tracking-tight text-primary">
              {toPersianDigits(successStoriesContent.emptyHeading)}
            </p>
            <p className="mt-3 text-sm leading-8 text-muted sm:text-base sm:leading-9">
              {toPersianDigits(successStoriesContent.emptyBody)}
            </p>
          </div>
        )}
      </Container>
    </section>
  );
}
