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
    <article className="academy-card overflow-hidden">
      <Link href={`/courses/${course.slug}`} className="block">
        <div className="academy-course-cover">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-muted">
              بدون تصویر
            </div>
          )}
        </div>
        <div className="academy-course-body">
          <h3 className="academy-course-title">{course.title}</h3>
          {course.subtitle ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted leading-relaxed">
              {course.subtitle}
            </p>
          ) : null}
          <p className="academy-course-meta">
            {course.instructorName ? `${course.instructorName} · ` : ""}
            {course._count.lessons} جلسه
          </p>
          <div className="academy-course-price-row">
            <span className="academy-course-price" dir="ltr">
              {formatTomanFromRials(course.priceRials)}
            </span>
            {course.compareAtPriceRials &&
            course.compareAtPriceRials > course.priceRials ? (
              <span className="text-xs text-muted line-through" dir="ltr">
                {formatTomanFromRials(course.compareAtPriceRials)}
              </span>
            ) : null}
          </div>
          <span className="academy-btn academy-btn-secondary academy-course-cta">
            مشاهده دوره
          </span>
        </div>
      </Link>
    </article>
  );
}
