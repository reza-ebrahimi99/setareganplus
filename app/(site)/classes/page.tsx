import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fa } from "@/lib/format";
import { buildMeta } from "@/lib/seo";
import { JsonLd } from "@/components/site/JsonLd";
import { breadcrumbLd } from "@/lib/ld";
import { FIELDS, GRADES, fieldsLabel } from "@/lib/classes/catalog";
import { getClassStudent } from "@/lib/classes/session";
import { Cover, EmptyState, MetaLine, PriceTag } from "@/components/classes/ui";

type SP = { q?: string; grade?: string; field?: string; topic?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const extra = [sp.topic, sp.grade, sp.field, sp.q].filter(Boolean).join(" ");
  return buildMeta({
    title: extra ? `کلاس‌های ویدیویی ${extra}` : "کلاس‌های ویدیویی ریاضی",
    description: "دوره‌های ویدیویی ریاضی ستارگان پلاس: تابع، مشتق، حد، مثلثات و بقیهٔ مباحث، با سرفصل، پیشرفت تماشا و آزمون کوتاه هر جلسه.",
    path: "/classes",
  });
}

function keep(sp: SP, patch: Partial<SP>) {
  const n = { ...sp, ...patch };
  const p = new URLSearchParams();
  if (n.q) p.set("q", n.q);
  if (n.grade) p.set("grade", n.grade);
  if (n.field) p.set("field", n.field);
  if (n.topic) p.set("topic", n.topic);
  const s = p.toString();
  return s ? `/classes?${s}` : "/classes";
}

export default async function Catalog({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim().slice(0, 60);
  const grade = GRADES.some((g) => g.id === sp.grade) ? sp.grade! : "";
  const field = FIELDS.some((f) => f.id === sp.field) ? sp.field! : "";
  const topic = (sp.topic || "").slice(0, 40);
  const student = await getClassStudent().catch(() => null);
  const where = {
    published: true,
    ...(grade ? { grades: { has: grade } } : {}),
    ...(field ? { fields: { has: field } } : {}),
    ...(topic ? { slug: topic } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { summary: { contains: q, mode: "insensitive" as const } }, { lessons: { some: { published: true, title: { contains: q, mode: "insensitive" as const } } } }] } : {}),
  };
  const [courses, topics, pathRow, mine] = await Promise.all([
    prisma.classCourse.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: { lessons: { where: { published: true }, select: { durationSec: true } }, _count: { select: { enrollments: true } } },
    }),
    prisma.classCourse.findMany({ where: { published: true, kind: "TOPIC" }, orderBy: { sortOrder: "asc" }, select: { slug: true, title: true } }),
    student ? prisma.classPath.findFirst({ where: { published: true, grade: student.grade, field: student.field || "" }, include: { steps: { orderBy: { sortOrder: "asc" }, include: { course: { select: { slug: true, title: true, published: true } } } } } }) : null,
    student ? prisma.classEnrollment.findMany({ where: { studentId: student.id }, select: { courseId: true } }) : [],
  ]);
  const enrolled = new Set(mine.map((m) => m.courseId));
  const topicsOnly = courses.filter((c) => c.kind === "TOPIC");
  const gradesOnly = courses.filter((c) => c.kind === "GRADE");
  const steps = (pathRow?.steps ?? []).filter((s) => s.course.published);

  return (
    <div className="container-x pb-16">
      <JsonLd data={breadcrumbLd([{ name: "کلاس‌های ویدیویی", href: "/classes" }])} />
      <section className="cl-hero cl-rise px-6 py-10 sm:px-10 sm:py-14">
        <p className="relative text-sm font-bold text-[#f4b21b]">کلاس‌های ویدیویی ستارگان</p>
        <h1 className="cl-display relative mt-3 max-w-3xl text-4xl text-white sm:text-5xl">هر مبحث، یک دوره. از اولین جلسه تا گواهی.</h1>
        <p className="relative mt-4 max-w-2xl text-base leading-8 text-white/75">سرفصل، زمان هر جلسه، پیشرفت تماشا، آزمون کوتاه و مسیر پیشنهادی پایه‌ات. مدرس دوره‌ها مهندس رضا ابراهیمی است.</p>
        <form className="relative mt-6 flex flex-col gap-2 sm:flex-row" action="/classes">
          {grade && <input type="hidden" name="grade" value={grade} />}
          {field && <input type="hidden" name="field" value={field} />}
          <input name="q" defaultValue={q} placeholder="جست‌وجوی دوره یا جلسه" className="cl-input sm:max-w-md" />
          <button className="btn-gold">جست‌وجو</button>
        </form>
      </section>

      {steps.length > 0 && (
        <section className="cl-card mt-6 p-5">
          <p className="font-extrabold">مسیر پیشنهادی تو</p>
          <p className="cl-muted text-sm">اول این دوره، بعد دورهٔ بعدی.</p>
          <ol className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {steps.map((s, i) => (
              <li key={s.id} className="shrink-0">
                <Link href={`/classes/${s.course.slug}`} className="cl-chip">
                  {fa(i + 1)}. {s.course.title}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        <Link href={keep(sp, { grade: "" })} className={`cl-chip ${!grade ? "is-on" : ""}`}>همهٔ پایه‌ها</Link>
        {GRADES.map((g) => <Link key={g.id} href={keep(sp, { grade: g.id })} className={`cl-chip ${grade === g.id ? "is-on" : ""}`}>{g.label}</Link>)}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        <Link href={keep(sp, { field: "", topic: "" })} className={`cl-chip ${!field ? "is-on" : ""}`}>همهٔ رشته‌ها</Link>
        {FIELDS.map((f) => <Link key={f.id} href={keep(sp, { field: f.id })} className={`cl-chip ${field === f.id ? "is-on" : ""}`}>{f.label}</Link>)}
        <span className="mx-1 w-px bg-black/10" />
        {topics.map((t) => <Link key={t.slug} href={keep(sp, { topic: topic === t.slug ? "" : t.slug })} className={`cl-chip ${topic === t.slug ? "is-on" : ""}`}>{t.title}</Link>)}
      </div>

      {courses.length === 0 ? (
        <div className="mt-8"><EmptyState title="دوره‌ای با این فیلتر نیست" text="پایه یا رشته را عوض کن، یا جست‌وجو را پاک کن." href="/classes" action="همهٔ دوره‌ها" /></div>
      ) : (
        <>
          <CourseGrid title="دوره‌های مبحثی" items={topicsOnly} enrolled={enrolled} />
          {gradesOnly.length > 0 && <CourseGrid title="کلاس‌ها بر اساس پایه" items={gradesOnly} enrolled={enrolled} />}
        </>
      )}
      <p className="cl-muted mt-8 text-center text-xs">{fa(courses.length)} دوره · {fieldsLabel(field ? [field] : [])}</p>
    </div>
  );
}

function CourseGrid({ title, items, enrolled }: { title: string; items: { id: string; slug: string; title: string; teacher: string; cover: string | null; grades: string[]; fields: string[]; isFree: boolean; priceRials: number; salePriceRials: number | null; lessons: { durationSec: number | null }[] }[]; enrolled: Set<string> }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="cl-display text-2xl">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => {
          const seconds = c.lessons.reduce((s, l) => s + (l.durationSec || 0), 0);
          return (
            <Link key={c.id} href={`/classes/${c.slug}`} className="cl-card cl-lift overflow-hidden">
              <Cover slug={c.slug} title={c.title} teacher={c.teacher} cover={c.cover} />
              <div className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PriceTag course={c} />
                  {enrolled.has(c.id) && <span className="cl-badge cl-badge-gold">ثبت‌نام شده</span>}
                </div>
                <h3 className="cl-display text-xl">{c.title}</h3>
                <MetaLine lessons={c.lessons.length} seconds={seconds} grades={c.grades} fields={c.fields} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
