import Link from "next/link";
import { notFound } from "next/navigation";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { getIndividualLessonProduct } from "@/lib/academy/catalog";
import { resolveAcademySession } from "@/lib/academy/auth/session";
import { formatTomanFromRials } from "@/lib/academy/money";

type Props = { params: Promise<{ slug: string }> };

export default async function AcademyVideoProductPage({ params }: Props) {
  const { slug } = await params;
  const organizationId = await getAcademyOrganizationId();
  const lesson = await getIndividualLessonProduct(organizationId, slug);
  if (!lesson) notFound();

  const session = await resolveAcademySession();
  const checkoutHref = `/checkout?lesson=${encodeURIComponent(lesson.id)}`;

  return (
    <AcademyShell activePath="/videos">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-muted">{lesson.course.title}</p>
        <h1 className="mt-2 text-2xl font-bold">{lesson.title}</h1>
        {lesson.description ? (
          <p className="mt-4 text-muted leading-relaxed">{lesson.description}</p>
        ) : null}
        <p className="mt-6 text-xl font-bold text-secondary" dir="ltr">
          {formatTomanFromRials(lesson.individualPriceRials ?? 0)}
        </p>
        <Link
          href={session ? checkoutHref : `/login?next=${encodeURIComponent(checkoutHref)}`}
          className="academy-btn-primary mt-8 inline-flex"
        >
          خرید ویدئو
        </Link>
      </div>
    </AcademyShell>
  );
}
