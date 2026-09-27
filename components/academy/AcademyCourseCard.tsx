import Link from "next/link";
import { academyPublicImageUrl } from "@/lib/academy/media";
import { formatTomanFromRials } from "@/lib/academy/money";

type CourseCardProps = {
  course: {
    slug: string;
    title: string;
    subtitle: string | null;
    instructorName: string | null;
    thumbnailStorageKey: string | null;
    coverStorageKey: string | null;
    priceRials: number;
    compareAtPriceRials: number | null;
    _count: { lessons: number };
  };
};

export function AcademyCourseCard({ course }: CourseCardProps) {
  const img =
    academyPublicImageUrl(course.coverStorageKey) ??
    academyPublicImageUrl(course.thumbnailStorageKey);

  return (
    <Link href={`/courses/${course.slug}`} className="academy-card block overflow-hidden">
      <div className="aspect-[16/10] bg-primary/5">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted">
            بدون تصویر
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-primary">{course.title}</h3>
        {course.subtitle ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{course.subtitle}</p>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          {course.instructorName ? `${course.instructorName} · ` : ""}
          {course._count.lessons} جلسه
        </p>
        <div className="mt-4 flex items-center gap-2">
          <span className="font-semibold text-secondary" dir="ltr">
            {formatTomanFromRials(course.priceRials)}
          </span>
          {course.compareAtPriceRials &&
          course.compareAtPriceRials > course.priceRials ? (
            <span className="text-xs text-muted line-through" dir="ltr">
              {formatTomanFromRials(course.compareAtPriceRials)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
