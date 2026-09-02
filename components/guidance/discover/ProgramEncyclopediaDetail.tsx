import Link from "next/link";
import { DiscoverFaq } from "@/components/guidance/discover/DiscoverFaq";
import { DiscoverInsight } from "@/components/guidance/discover/DiscoverInsight";
import { ProgramAtAGlance } from "@/components/guidance/discover/ProgramAtAGlance";
import { PROGRAM_CATEGORY_LABELS, programCategoryAccent } from "@/lib/guidance/discover/program-catalog-ui";
import { programHref } from "@/lib/guidance/discover/catalog";
import { getDiscoverProgram } from "@/lib/guidance/discover/programs";
import type { DiscoverProgram } from "@/lib/guidance/discover/types";

function ProgramSection({
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

function ProgramList({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="program-encyclopedia-list">
      {items.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

export function ProgramEncyclopediaHero({ item }: { item: DiscoverProgram }) {
  const accent = programCategoryAccent(item.category);
  return (
    <header className="program-encyclopedia-hero">
      <div className="program-encyclopedia-hero__visual" style={{ background: accent.gradient }} aria-hidden="true">
        <span className="program-encyclopedia-hero__glyph">{item.shortTitle.charAt(0)}</span>
      </div>
      <div className="program-encyclopedia-hero__body">
        <p className="program-encyclopedia-hero__meta">
          <span className="program-encyclopedia-hero__badge" style={{ backgroundColor: accent.badge }}>
            {PROGRAM_CATEGORY_LABELS[item.category]}
          </span>
          {item.continuityType ? <span>{item.continuityType}</span> : null}
        </p>
        <h1>{item.title}</h1>
        <p className="program-encyclopedia-hero__lead">{item.description}</p>
      </div>
    </header>
  );
}

export function ProgramEncyclopediaDetail({ item }: { item: DiscoverProgram }) {
  const related = item.relatedPrograms
    .map((slug) => getDiscoverProgram(slug))
    .filter((entry): entry is DiscoverProgram => Boolean(entry));

  return (
    <article className="program-encyclopedia-detail">
      <ProgramEncyclopediaHero item={item} />

      <nav className="program-encyclopedia-toc" aria-label="فهرست بخش‌ها">
        <a href="#intro">معرفی</a>
        <a href="#what">تعریف</a>
        <a href="#admission">پذیرش</a>
        <a href="#compare">مرتبط</a>
      </nav>

      <ProgramAtAGlance data={item.atAGlance} />

      <ProgramSection id="intro" title="معرفی ساده">
        <p>{item.description}</p>
      </ProgramSection>

      <ProgramSection id="what" title="این دوره دقیقاً چیست؟">
        <p>{item.summary}</p>
      </ProgramSection>

      <ProgramSection id="who" title="مناسب چه کسانی است؟">
        <p>{item.suitableFor}</p>
      </ProgramSection>

      <ProgramSection id="structure" title="مدت و ساختار تحصیل">
        <p>{item.structure}</p>
        <p>
          <strong>مدت تقریبی:</strong> {item.duration}
        </p>
      </ProgramSection>

      <ProgramSection id="admission" title="نحوه ورود / پذیرش">
        <p>{item.admissionNotes}</p>
        <p>
          <strong>شیوه پذیرش:</strong> {item.admissionType}
        </p>
      </ProgramSection>

      <ProgramSection id="continuing" title="ادامه تحصیل">
        <p>{item.continuingEducation}</p>
      </ProgramSection>

      <ProgramSection id="tuition" title="هزینه و شهریه">
        <p>{item.tuitionNotes}</p>
        <p className="program-encyclopedia-note">
          مبالغ دقیق و قواعد شهریه هر سال در اطلاعیه دانشگاه و دفترچه انتخاب رشته اعلام می‌شود.
          جزئیات این موضوع ممکن است بر اساس دفترچه انتخاب رشته همان سال تغییر کند و باید با
          دفترچه رسمی سازمان مربوط تطبیق داده شود.
        </p>
      </ProgramSection>

      <ProgramSection id="degree" title="مدرک و وضعیت تحصیلی">
        <p>{item.degreeStatus}</p>
      </ProgramSection>

      <ProgramSection id="career" title="افق شغلی (کلی)">
        <p>{item.careerNotes}</p>
      </ProgramSection>

      <ProgramSection id="advantages" title="مزایا">
        <ProgramList items={item.advantages} />
      </ProgramSection>

      <ProgramSection id="challenges" title="محدودیت‌ها و نکات مهم">
        <ProgramList items={item.challenges} />
        <ProgramList items={item.importantNotes} />
      </ProgramSection>

      <ProgramSection id="mistakes" title="اشتباهات رایج">
        <ProgramList items={item.commonMistakes} />
      </ProgramSection>

      <ProgramSection id="checklist" title="قبل از انتخاب این گزینه بررسی کن">
        <ProgramList items={item.beforeYouChoose} />
      </ProgramSection>

      {related.length > 0 ? (
        <ProgramSection id="compare" title="گزینه‌های مرتبط">
          <p>برای فهم بهتر، این موارد را کنار هم بخوانید:</p>
          <ul className="program-encyclopedia-related">
            {related.map((entry) => (
              <li key={entry.slug}>
                <Link href={programHref(entry.slug)}>{entry.title}</Link>
              </li>
            ))}
          </ul>
        </ProgramSection>
      ) : null}

      <p className="program-encyclopedia-crosslink">
        <Link href="/discover/majors">دانشنامه رشته‌های دانشگاهی</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/discover/programs">بازگشت به فهرست مقاطع و دوره‌ها</Link>
      </p>

      <DiscoverFaq items={item.faq} />
      <DiscoverInsight insight={item.insight} />
    </article>
  );
}
