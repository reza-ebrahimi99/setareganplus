import type { Metadata } from "next";
import Link from "next/link";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { DISCOVER_MAJORS } from "@/lib/guidance/discover/majors";
import { DISCOVER_SYSTEMS } from "@/lib/guidance/discover/systems";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

type PageProps = {
  searchParams: Promise<{ kind?: string; a?: string; b?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { kind, a, b } = await searchParams;
  if (kind === "system") {
    const left = DISCOVER_SYSTEMS.find((item) => item.slug === a);
    const right = DISCOVER_SYSTEMS.find((item) => item.slug === b);
    if (left && right) {
      return createPageMetadata({
        path: `/discover/compare?kind=system&a=${left.slug}&b=${right.slug}`,
        title: `مقایسه ${left.title} و ${right.title} | ستارگان پلاس`,
        description: `مقایسه کیفی ${left.title} با ${right.title} برای انتخاب رشته.`,
      });
    }
  }
  const left = DISCOVER_MAJORS.find((item) => item.slug === a);
  const right = DISCOVER_MAJORS.find((item) => item.slug === b);
  if (left && right) {
    return createPageMetadata({
      path: `/discover/compare?kind=major&a=${left.slug}&b=${right.slug}`,
      title: `مقایسه ${left.title} و ${right.title} | ستارگان پلاس`,
      description: `مقایسه کیفی رشته ${left.title} با ${right.title}.`,
    });
  }
  return createPageMetadata({
    path: "/discover/compare",
    title: "مقایسه رشته و نظام دانشگاهی | کانون کشف ستارگان پلاس",
    description:
      "دو رشته یا دو نظام دانشگاهی را کنار هم بگذارید؛ جدول برای فهمیدن است نه برای حکم قطعی.",
  });
}

export default async function DiscoverComparePage({ searchParams }: PageProps) {
  const { kind: kindRaw, a, b } = await searchParams;
  const kind = kindRaw === "system" ? "system" : "major";
  const visitor = await loadDiscoveryVisitor();

  const systemLeft = DISCOVER_SYSTEMS.find((item) => item.slug === a) ?? null;
  const systemRight = DISCOVER_SYSTEMS.find((item) => item.slug === b) ?? null;
  const majorLeft = DISCOVER_MAJORS.find((item) => item.slug === a) ?? null;
  const majorRight = DISCOVER_MAJORS.find((item) => item.slug === b) ?? null;
  const ready =
    kind === "system"
      ? Boolean(systemLeft && systemRight && systemLeft.slug !== systemRight.slug)
      : Boolean(majorLeft && majorRight && majorLeft.slug !== majorRight.slug);

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "مقایسه" },
      ]}
      jsonLd={discoverWebPageJsonLd({
        path: "/discover/compare",
        title: "مقایسه",
        description: "رشته با رشته، نظام با نظام.",
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "مقایسه", path: "/discover/compare" },
        ],
      })}
      visitor={visitor}
    >
      <header className="discover-hero">
        <p>مقایسه</p>
        <h1>دو گزینه را روی یک میز بگذارید.</h1>
        <p className="discover-hero__lead">
          این جدول حکم انتخاب نیست. فقط تفاوت کیفی را روشن می‌کند تا جلسه مشاوره کوتاه‌تر شود.
        </p>
        <p>
          <Link href="/discover/compare?kind=major">رشته با رشته</Link>
          {" · "}
          <Link href="/discover/compare?kind=system">نظام با نظام</Link>
        </p>
      </header>

      <form className="discover-compare-form" action="/discover/compare" method="get">
        <input type="hidden" name="kind" value={kind} />
        {kind === "system" ? (
          <>
            <label>
              گزینه اول
              <select name="a" defaultValue={systemLeft?.slug ?? ""}>
                <option value="">انتخاب کنید</option>
                {DISCOVER_SYSTEMS.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              گزینه دوم
              <select name="b" defaultValue={systemRight?.slug ?? ""}>
                <option value="">انتخاب کنید</option>
                {DISCOVER_SYSTEMS.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label>
              رشته اول
              <select name="a" defaultValue={majorLeft?.slug ?? ""}>
                <option value="">انتخاب کنید</option>
                {DISCOVER_MAJORS.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              رشته دوم
              <select name="b" defaultValue={majorRight?.slug ?? ""}>
                <option value="">انتخاب کنید</option>
                {DISCOVER_MAJORS.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <button type="submit">نمایش مقایسه</button>
      </form>

      {ready && kind === "system" && systemLeft && systemRight ? (
        <div className="discover-compare-grid">
          {[systemLeft, systemRight].map((item) => (
            <article key={item.slug} className="discover-compare-card">
              <h2>{item.title}</h2>
              <p>{item.lead}</p>
              <h3>مزیت‌ها</h3>
              <ul>
                {item.advantages.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <h3>نکته‌هایی که باید دید</h3>
              <ul>
                {item.challenges.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p>{item.tuition}</p>
            </article>
          ))}
        </div>
      ) : null}

      {ready && kind === "major" && majorLeft && majorRight ? (
        <div className="discover-compare-grid">
          {[majorLeft, majorRight].map((item) => (
            <article key={item.slug} className="discover-compare-card">
              <h2>{item.title}</h2>
              <p>{item.lead}</p>
              <h3>چه می‌خوانید</h3>
              <p>{item.study}</p>
              <h3>روحیه کمک‌کننده</h3>
              <ul>
                {item.traits.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <h3>نمونه مسیر شغلی</h3>
              <ul>
                {item.career.paths.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p>{item.career.outlook}</p>
            </article>
          ))}
        </div>
      ) : null}
    </DiscoverShell>
  );
}
