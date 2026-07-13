import { Container } from "@/components/ui/Container";
import { ContentCard } from "@/components/ui/ContentCard";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { successStories, successStoriesContent } from "@/content/home";

const headingId = "success-stories-heading";

export function SuccessStoriesSection() {
  const hasStories = successStories.length > 0;

  return (
    <Section ariaLabelledby={headingId}>
      <Container>
        <SectionHeader
          eyebrow={successStoriesContent.eyebrow}
          heading={successStoriesContent.heading}
          description={successStoriesContent.description}
          headingId={headingId}
        />

        {hasStories ? (
          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {successStories.map((story) => (
              <li key={story.author}>
                <ContentCard
                  variant="quote"
                  heading=""
                  body={story.quote}
                  author={story.author}
                  detail={story.detail}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-10">
            <ContentCard
              variant="notice"
              heading="به‌زودی"
              body="داستان‌های موفقیت دانش‌آموزان پس از ساختاردهی نام‌ها و نتایج دقیق و دریافت رضایت خانواده‌ها در این بخش منتشر می‌شود."
            />
          </div>
        )}
      </Container>
    </Section>
  );
}
