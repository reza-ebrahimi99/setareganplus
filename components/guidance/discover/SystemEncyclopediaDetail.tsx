import Link from "next/link";
import { DiscoverFaq } from "@/components/guidance/discover/DiscoverFaq";
import { DiscoverInsight } from "@/components/guidance/discover/DiscoverInsight";
import { DiscoverRelated } from "@/components/guidance/discover/DiscoverRelated";
import { relatedForSystem, systemHref } from "@/lib/guidance/discover/catalog";
import { getDiscoverSystem } from "@/lib/guidance/discover/systems";
import { programCategoryAccent } from "@/lib/guidance/discover/program-catalog-ui";
import type { DiscoverSystem } from "@/lib/guidance/discover/types";

function SystemMark() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M10 52h44M16 52V26h32v26M22 32h6M36 32h6M22 40h6M36 40h6M28 52V44h8v8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M14 26 32 14l18 12"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SystemSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="program-encyclopedia-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/**
 * University-type detail — content-first, no campus/school photography.
 * Reuses the program encyclopedia visual language and existing system copy.
 */
export function SystemEncyclopediaDetail({ item }: { item: DiscoverSystem }) {
  const accent = programCategoryAccent("INSTITUTION_TYPE");
  const relatedSystems = item.relatedSystems
    .map((slug) => getDiscoverSystem(slug))
    .filter((entry): entry is DiscoverSystem => Boolean(entry));

  return (
    <article className="program-encyclopedia-detail">
      <p className="program-encyclopedia-back">
        <Link href="/discover/systems">بازگشت به معرفی انواع دانشگاه‌ها</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/discover/programs">مقاطع و دوره‌ها</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/portal/student/services/guidance?view=universities">
          داشبورد انتخاب رشته
        </Link>
      </p>

      <header className="program-encyclopedia-hero program-encyclopedia-hero--compact">
        <div
          className="program-encyclopedia-hero__visual"
          style={{ background: accent.gradient }}
          aria-hidden="true"
        >
          <span className="program-encyclopedia-hero__icon">
            <SystemMark />
          </span>
        </div>
        <div className="program-encyclopedia-hero__body">
          <p className="program-encyclopedia-hero__meta">
            <span
              className="program-encyclopedia-hero__badge"
              style={{ backgroundColor: accent.badge }}
            >
              نوع دانشگاه / نظام
            </span>
            <span>{item.kicker}</span>
          </p>
          <h1>{item.title}</h1>
          <p className="program-encyclopedia-hero__lead">{item.lead}</p>
          {relatedSystems.length > 0 ? (
            <ul className="program-encyclopedia-hero__chips">
              {relatedSystems.map((entry) => (
                <li key={entry.slug}>
                  <Link href={systemHref(entry.slug)}>{entry.title}</Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      <nav className="program-encyclopedia-toc" aria-label="فهرست بخش‌ها">
        <a href="#overview">تصویر کلی</a>
        <a href="#admission">پذیرش</a>
        <a href="#tuition">شهریه</a>
        <a href="#life">زندگی دانشجویی</a>
      </nav>

      <SystemSection id="overview" title="تصویر کلی">
        <p>{item.overview}</p>
      </SystemSection>

      <SystemSection id="admission" title="پذیرش">
        <p>{item.admission}</p>
      </SystemSection>

      <SystemSection id="tuition" title="شهریه و هزینه">
        <p>{item.tuition}</p>
      </SystemSection>

      <SystemSection id="life" title="زندگی دانشجویی">
        <p>{item.studentLife}</p>
      </SystemSection>

      <SystemSection id="advantages" title="مزیت‌ها">
        <ul className="program-encyclopedia-list">
          {item.advantages.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </SystemSection>

      <SystemSection id="challenges" title="چالش‌ها">
        <ul className="program-encyclopedia-list">
          {item.challenges.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </SystemSection>

      <DiscoverFaq items={item.faq} />
      <DiscoverInsight insight={item.insight} />
      <DiscoverRelated related={relatedForSystem(item.slug)} />

      <p className="program-encyclopedia-crosslink">
        <Link href="/discover/systems">همه نظام‌های دانشگاهی</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/discover/programs">دانشنامه مقاطع و دوره‌ها</Link>
      </p>
    </article>
  );
}
