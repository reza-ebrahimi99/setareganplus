import type { DiscoverMajor } from "@/lib/guidance/discover/types";
import { DiscoverFaq } from "@/components/guidance/discover/DiscoverFaq";
import { DiscoverInsight } from "@/components/guidance/discover/DiscoverInsight";
import { MajorEncyclopediaHero } from "@/components/guidance/discover/MajorEncyclopediaHero";

function MajorSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="major-encyclopedia-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function MajorList({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="major-encyclopedia-list">
      {items.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

export function MajorEncyclopediaDetail({ item }: { item: DiscoverMajor }) {
  const advantages = [
    item.insight.succeeds,
    item.continuing.split(".")[0]?.trim(),
    item.career.paths[0] ? `مسیرهای شغلی متنوع از جمله ${item.career.paths[0]}` : null,
  ].filter((line): line is string => Boolean(line && line.length > 8));

  const challenges = [item.insight.mistakes, item.insight.families].filter(
    (line) => line.length > 8,
  );

  return (
    <article className="major-encyclopedia-detail">
      <MajorEncyclopediaHero item={item} />

      <nav className="major-encyclopedia-toc" aria-label="فهرست بخش‌های صفحه">
        <a href="#intro">معرفی</a>
        <a href="#who">مناسب چه کسانی</a>
        <a href="#study">درس‌ها</a>
        <a href="#career">بازار کار</a>
        <a href="#faq">پرسش‌ها</a>
      </nav>

      <MajorSection id="intro" title="معرفی رشته">
        <p>{item.overview}</p>
      </MajorSection>

      <MajorSection id="who" title="این رشته مناسب چه کسانی است؟">
        <p>{item.insight.succeeds}</p>
        <MajorList items={item.traits} />
      </MajorSection>

      <MajorSection id="study" title="در دانشگاه چه می‌خوانیم؟">
        <p>{item.study}</p>
      </MajorSection>

      <MajorSection id="courses" title="درس‌های مهم">
        <p className="major-encyclopedia-note">
          این فهرست نمونه است — برنامه دقیق به دانشکده و گرایش بستگی دارد.
        </p>
        <MajorList items={item.courses} />
      </MajorSection>

      <MajorSection id="skills" title="مهارت‌ها و ویژگی‌های لازم">
        <MajorList items={item.skills} />
      </MajorSection>

      <MajorSection id="continuing" title="گرایش‌ها و ادامه تحصیل">
        <p>{item.continuing}</p>
      </MajorSection>

      <MajorSection id="career" title="بازار کار و مسیرهای شغلی">
        <p>{item.career.outlook}</p>
        <MajorList items={item.career.paths} />
        {item.career.responsibilities.length > 0 ? (
          <>
            <h3 className="major-encyclopedia-subtitle">مسئولیت‌های معمول</h3>
            <MajorList items={item.career.responsibilities} />
          </>
        ) : null}
      </MajorSection>

      <MajorSection id="environments" title="محیط‌های کاری">
        <MajorList items={item.career.environments} />
      </MajorSection>

      <MajorSection id="advantages" title="مزایای رشته">
        <MajorList items={advantages} />
      </MajorSection>

      <MajorSection id="challenges" title="چالش‌ها">
        <MajorList items={challenges} />
        {item.misconceptions.length > 0 ? (
          <>
            <h3 className="major-encyclopedia-subtitle">باورهای رایج که دقیق نیستند</h3>
            <dl className="major-encyclopedia-myths">
              {item.misconceptions.map((row) => (
                <div key={row.question}>
                  <dt>{row.question}</dt>
                  <dd>{row.answer}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
      </MajorSection>

      <div id="faq">
        <DiscoverFaq items={item.faq} />
      </div>

      <DiscoverInsight insight={item.insight} />
    </article>
  );
}
