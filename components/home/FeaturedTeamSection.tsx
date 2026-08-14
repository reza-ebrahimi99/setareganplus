import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { featuredTeachersContent } from "@/content/home";
import { loadFeaturedTeamMembers } from "@/lib/website/load-team";
import { toPersianDigits } from "@/lib/persian";

export async function FeaturedTeamSection() {
  const members = await loadFeaturedTeamMembers();
  if (members.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-team-heading"
      className="section-rhythm-light border-y border-border/50"
    >
      <Container className="py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.18em] text-secondary">
            {toPersianDigits(featuredTeachersContent.eyebrow)}
          </p>
          <h2
            id="featured-team-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl"
          >
            {toPersianDigits(featuredTeachersContent.heading)}
          </h2>
          <p className="mt-4 text-base leading-9 text-muted sm:text-lg">
            {toPersianDigits(featuredTeachersContent.description)}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-4 lg:gap-8">
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
