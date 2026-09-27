import Link from "next/link";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { listIndividualVideoProducts } from "@/lib/academy/catalog";
import { formatTomanFromRials } from "@/lib/academy/money";

export const metadata = { title: "ویدئوها" };

export default async function AcademyVideosPage() {
  const organizationId = await getAcademyOrganizationId();
  const videos = await listIndividualVideoProducts(organizationId);

  return (
    <AcademyShell activePath="/videos">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-bold text-primary">ویدئوهای تکی</h1>
        {videos.length === 0 ? (
          <div className="academy-card mt-10 p-12 text-center text-muted">
            ویدئوی تکی برای فروش منتشر نشده است.
          </div>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {videos.map((v) => (
              <li key={v.id} className="academy-card p-5">
                <Link href={`/videos/${v.slug}`}>
                  <p className="text-xs text-muted">{v.course.title}</p>
                  <p className="mt-1 font-semibold">{v.title}</p>
                  <p className="mt-2 text-secondary" dir="ltr">
                    {formatTomanFromRials(v.individualPriceRials ?? 0)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AcademyShell>
  );
}
