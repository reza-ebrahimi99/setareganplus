import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscoverCover } from "@/components/guidance/discover/DiscoverCover";
import { DiscoverFaq } from "@/components/guidance/discover/DiscoverFaq";
import { DiscoverInsight } from "@/components/guidance/discover/DiscoverInsight";
import { DiscoverRelated } from "@/components/guidance/discover/DiscoverRelated";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { DISCOVER_MAJORS, getDiscoverMajor } from "@/lib/guidance/discover/majors";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import {
  careerHref,
  examGroupLabel,
  majorHref,
  relatedForMajor,
} from "@/lib/guidance/discover/catalog";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DISCOVER_MAJORS.map((item) => ({ slug: item.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getDiscoverMajor(slug);
  if (!item) return {};
  return createPageMetadata({
    path: majorHref(slug),
    title: `${item.title} | رشته ${examGroupLabel(item.examGroup)} | ستارگان پلاس`,
    description: item.lead,
    keywords: [item.title, examGroupLabel(item.examGroup), "انتخاب رشته", "کنکور"],
  });
}

export default async function DiscoverMajorPage({ params }: PageProps) {
  const { slug } = await params;
  const item = getDiscoverMajor(slug);
  if (!item) notFound();
  const visitor = await loadDiscoveryVisitor();
  const path = majorHref(slug);

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "رشته‌ها", href: "/discover/majors" },
        { label: item.title },
      ]}
      activePath="/discover/majors"
      jsonLd={discoverWebPageJsonLd({
        path,
        title: item.title,
        description: item.lead,
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "رشته‌ها", path: "/discover/majors" },
          { name: item.title, path },
        ],
        faq: [...item.faq, ...item.misconceptions],
      })}
      visitor={visitor}
    >
      <article className="discover-article">
        <header className="discover-hero">
          <p>
            {examGroupLabel(item.examGroup)} · {item.kicker}
          </p>
          <h1>{item.title}</h1>
          <p className="discover-hero__lead">{item.lead}</p>
          <Link href={careerHref(item.slug)} className="discover-inline">
            مسیر شغلی این رشته
          </Link>
        </header>
        <DiscoverCover slug={item.slug} title={item.title} />
        <section>
          <h2>تصویر کلی</h2>
          <p>{item.overview}</p>
        </section>
        <section>
          <h2>چه می‌خوانید</h2>
          <p>{item.study}</p>
        </section>
        <section>
          <h2>نمونه‌های رایج درس</h2>
          <p>این فهرست نمونه است نه برنامه رسمی سنجش یا همان دانشکده.</p>
          <ul>
            {item.courses.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>روحیه و ویژگی‌هایی که معمولاً کمک می‌کند</h2>
          <p>این‌ها تیپ روان‌شناختی نیستند؛ مشاهده مشاوره‌ای‌اند.</p>
          <ul>
            {item.traits.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>مهارت‌هایی که مسیر را هموارتر می‌کنند</h2>
          <ul>
            {item.skills.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>ادامه تحصیل</h2>
          <p>{item.continuing}</p>
        </section>
        <section>
          <h2>باورهای رایج که دقیق نیستند</h2>
          <dl>
            {item.misconceptions.map((row) => (
              <div key={row.question}>
                <dt>{row.question}</dt>
                <dd>{row.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
        <DiscoverFaq items={item.faq} />
        <DiscoverInsight insight={item.insight} />
        <DiscoverRelated related={relatedForMajor(item.slug)} />
      </article>
    </DiscoverShell>
  );
}
