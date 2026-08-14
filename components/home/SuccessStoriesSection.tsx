import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { successStories, successStoriesContent } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "success-stories-heading";

export function SuccessStoriesSection() {
  const hasStories = successStories.length > 0;

  return (
    <Section
      className="flagship-section border-y border-border/60 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.08),_transparent_55%)]"
      ariaLabelledby={headingId}
    >
      <Container>
        <SectionHeader
          eyebrow={successStoriesContent.eyebrow}
          heading={successStoriesContent.heading}
          description={successStoriesContent.description}
          headingId={headingId}
        />

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
          <div className="glass-quote-card mx-auto mt-12 max-w-2xl p-8 text-center sm:p-10">
            <p className="text-lg font-semibold text-primary">
              {toPersianDigits(successStoriesContent.emptyHeading)}
            </p>
            <p className="mt-3 text-sm leading-8 text-muted sm:text-base">
              {toPersianDigits(successStoriesContent.emptyBody)}
            </p>
          </div>
        )}
      </Container>
    </Section>
  );
}
