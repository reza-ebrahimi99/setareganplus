import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { loadFeaturedTeamMembers } from "@/lib/website/load-team";

export async function FeaturedTeamSection() {
  const members = await loadFeaturedTeamMembers();
  if (members.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-team-heading"
      className="border-y border-border/60 bg-gradient-to-b from-background via-surface to-background py-14 sm:py-16"
    >
      <Container>
        <SectionHeader
          eyebrow="مؤسسه علمی ستارگان"
          heading="تیم مدیریت"
          description="آشنایی با بخشی از همکاران و مدیران مؤسسه که در هدایت آموزشی و اجرایی مجموعه نقش دارند."
          headingId="featured-team-heading"
        />

        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {members.map((member, index) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              size="featured"
              priority={index === 0}
            />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/team"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            مشاهده همه اعضای تیم
          </Link>
        </div>
      </Container>
    </section>
  );
}
