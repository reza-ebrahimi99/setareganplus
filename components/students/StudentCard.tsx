import Image from "next/image";
import Link from "next/link";
import type { PublicStudentCard } from "@/lib/website/students";

type StudentCardProps = {
  student: PublicStudentCard;
  size?: "featured" | "grid";
  priority?: boolean;
};

export function StudentCard({
  student,
  size = "grid",
  priority = false,
}: StudentCardProps) {
  const featured = size === "featured";
  const subtitle = [student.gradeName, student.majorName, student.schoolYear]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/students/${student.slug}`}
      className={`group block overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] transition-[transform,opacity,box-shadow,border-color] duration-300 motion-safe:hover:-translate-y-1 hover:border-secondary/40 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
        featured ? "p-4" : "p-4 sm:p-5"
      }`}
    >
      <div
        className={`relative mx-auto overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-secondary/15 ${
          featured ? "aspect-[4/5] w-full max-w-[11rem]" : "aspect-[4/5] w-full"
        }`}
      >
        {student.portraitUrl ? (
          <Image
            src={student.portraitUrl}
            alt={student.portraitAlt}
            fill
            unoptimized
            sizes={
              featured
                ? "176px"
                : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            }
            priority={priority}
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl font-bold text-primary/50">
            {student.fullName.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="mt-4 text-center">
        <h3
          className={`font-bold text-primary ${
            featured ? "text-base" : "text-lg"
          }`}
        >
          {student.fullName}
        </h3>
        {subtitle ? (
          <p className="mt-1 text-sm leading-7 text-muted">{subtitle}</p>
        ) : null}
      </div>
    </Link>
  );
}
