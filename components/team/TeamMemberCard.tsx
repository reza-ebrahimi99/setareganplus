import Image from "next/image";
import Link from "next/link";
import type { PublicTeamMemberCard } from "@/lib/website/load-team";

type TeamMemberCardProps = {
  member: PublicTeamMemberCard;
  size?: "featured" | "grid";
  /** Only the first above-the-fold featured portrait should set this. */
  priority?: boolean;
};

export function TeamMemberCard({
  member,
  size = "grid",
  priority = false,
}: TeamMemberCardProps) {
  const featured = size === "featured";

  return (
    <Link
      href={`/team/${member.slug}`}
      className={`teacher-card group block overflow-hidden rounded-[1.4rem] border border-border/70 bg-surface/90 transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
        featured
          ? "p-3 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.55)] hover:-translate-y-1 hover:border-secondary/35 hover:shadow-[0_28px_60px_-34px_rgba(15,23,42,0.55)]"
          : "p-4 sm:p-5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] hover:-translate-y-1 hover:border-secondary/40"
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-[1.1rem] bg-gradient-to-br from-primary/10 via-surface to-secondary/15 ${
          featured ? "aspect-[4/5] w-full" : "aspect-[4/5] w-full"
        }`}
      >
        {member.portraitUrl ? (
          <Image
            src={member.portraitUrl}
            alt={member.portraitAlt}
            fill
            unoptimized
            sizes={
              featured
                ? "(max-width: 1024px) 45vw, 240px"
                : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            }
            priority={priority}
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl font-bold text-primary/50">
            {member.fullName.slice(0, 1)}
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary/35 to-transparent"
        />
      </div>
      <div className={`mt-4 ${featured ? "px-1 pb-1 text-start" : "text-center"}`}>
        <h3
          className={`font-bold text-primary ${
            featured ? "text-base sm:text-lg" : "text-lg"
          }`}
        >
          {member.fullName}
        </h3>
        <p className="mt-1.5 text-sm leading-7 text-muted">{member.roleTitle}</p>
        {member.specialty ? (
          <p className="mt-1 text-xs font-medium text-secondary">
            {member.specialty}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
