import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { featuredTeachersContent } from "@/content/home";
import { loadFeaturedTeamMembers } from "@/lib/website/load-team";

export async function FeaturedTeamSection() {
  const members = await loadFeaturedTeamMembers();
  if (members.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-team-heading"
      className="border-y border-border/60 bg-gradient-to-b from-background via-surface to-background py-16 sm:py-20"
    >
      <Container>
        <SectionHeader
          eyebrow={featuredTeachersContent.eyebrow}
          heading={featuredTeachersContent.heading}
          description={featuredTeachersContent.description}
          headingId="featured-team-heading"
        />

        <div className="mt-12 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4 lg:gap-7">
          {members.map((member, index) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              size="featured"
              priority={index === 0}
            />
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href={featuredTeachersContent.cta.href}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-surface px-6 py-2.5 text-sm font-medium text-primary transition hover:border-secondary/40 hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            {featuredTeachersContent.cta.label}
          </Link>
        </div>
      </Container>
    </section>
  );
}
