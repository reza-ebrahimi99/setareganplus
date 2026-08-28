import { StoryTimeline } from "@/components/about/StoryTimeline";
import { AboutFinalCta } from "@/components/about/AboutFinalCta";
import { SiteShell } from "@/components/layout/SiteShell";
import { PageHero } from "@/components/ui/PageHero";
import { aboutPageContent } from "@/content/about-page";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";

export const metadata = getPublicPageMetadata("aboutStory");

export default function AboutStoryPage() {
  return (
    <SiteShell activePath="/about/story">
      <PageHero
        eyebrow={aboutPageContent.story.eyebrow}
        title={aboutPageContent.story.title}
        subtitle={aboutPageContent.story.description}
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "درباره ما", href: "/about" },
          { label: "داستان ستارگان" },
        ]}
      />
      <StoryTimeline />
      <AboutFinalCta />
    </SiteShell>
  );
}
