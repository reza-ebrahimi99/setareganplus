import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { PageTitle, Panel, Field, Area, Check, Flash } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { FIELDS, GRADES } from "@/lib/classes/catalog";
import { saveLesson, deleteLesson, addQuestion, deleteQuestion, saveFile } from "../../actions";

export default async function EditLesson({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; e?: string }> }) {
  await requirePerm("classes.manage");
  const { id } = await params;
  const sp = await searchParams;
  const lesson = await prisma.classLesson.findUnique({
    where: { id },
    include: { course: true, questions: { orderBy: { sortOrder: "asc" }, include: { choices: { orderBy: { sortOrder: "asc" } } } }, files: true },
  });
  if (!lesson) notFound();
  const courses = await prisma.classCourse.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, title: true } });
  return (
    <>
      <PageTitle title={lesson.title} sub={lesson.course.title} action={<Link href={`/admin/classes/${lesson.courseId}`} className="text-sm font-bold">بازگشت به دوره</Link>} />
      <Flash ok={sp.ok} />
      {sp.e === "max" && <p className="mb-3 text-sm text-red-700">هر جلسه حداکثر ۵ سؤال دارد.</p>}
      {sp.e === "quiz" && <p className="mb-3 text-sm text-red-700">سؤال، حداقل دو گزینه و دقیقاً یک پاسخ درست لازم است.</p>}
      <Panel>
        <form action={saveLesson} className="space-y-4">
          <input type="hidden" name="id" value={lesson.id} />
          <Field label="عنوان" name="title" defaultValue={lesson.title} required />
          <Area label="توضیح" name="description" defaultValue={lesson.description} hint="ریاضی را بین $...$ بنویس." />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold">دوره
              <select name="courseId" defaultValue={lesson.courseId} className="input mt-1">{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            </label>
            <Field label="مدت (دقیقه)" name="durationMin" type="number" defaultValue={lesson.durationSec ? Math.round(lesson.durationSec / 60) : ""} />
            <Field label="ترتیب" name="sortOrder" type="number" defaultValue={lesson.sortOrder} />
          </div>
          <p className="text-xs text-muted" dir="ltr">id: {lesson.aparatHash}</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {GRADES.map((g) => <label key={g.id}><input type="checkbox" name="grades" value={g.id} defaultChecked={lesson.grades.includes(g.id)} /> {g.label}</label>)}
            {FIELDS.map((f) => <label key={f.id}><input type="checkbox" name="fields" value={f.id} defaultChecked={lesson.fields.includes(f.id)} /> {f.label}</label>)}
          </div>
          <div className="flex gap-4"><Check label="پیش‌نمایش رایگان" name="freePreview" defaultChecked={lesson.freePreview} /><Check label="منتشر" name="published" defaultChecked={lesson.published} /></div>
          <SubmitButton>ذخیره</SubmitButton>
        </form>
        <form action={deleteLesson} className="mt-3"><input type="hidden" name="id" value={lesson.id} /><SubmitButton className="text-sm text-gc" confirm="جلسه حذف شود؟">حذف جلسه</SubmitButton></form>
      </Panel>
      <Panel title="آزمون کوتاه (حداکثر ۵ سؤال)" className="mt-6">
        {lesson.questions.map((q) => (
          <div key={q.id} className="mb-3 rounded-xl bg-ivory p-3 text-sm">
            <p className="font-bold">{q.prompt}</p>
            <ul>{q.choices.map((c) => <li key={c.id}>{c.correct ? "✓ " : ""}{c.text}</li>)}</ul>
            <form action={deleteQuestion}><input type="hidden" name="id" value={q.id} /><button className="text-xs text-gc">حذف</button></form>
          </div>
        ))}
        <form action={addQuestion} className="space-y-2">
          <input type="hidden" name="lessonId" value={lesson.id} />
          <Area label="صورت سؤال" name="prompt" hint="$x^2$ برای فرمول" />
          <Area label="توضیح بعد از پاسخ" name="explanation" />
          {[0, 1, 2, 3].map((i) => (
            <label key={i} className="flex items-center gap-2 text-sm"><input type="radio" name="correct" value={i} defaultChecked={i === 0} /><input name={`c${i}`} placeholder={`گزینه ${i + 1}`} className="input" /></label>
          ))}
          <SubmitButton>افزودن سؤال</SubmitButton>
        </form>
      </Panel>
      <Panel title="فایل جلسه" className="mt-6">
        <ul className="mb-2 text-sm">{lesson.files.map((f) => <li key={f.id}>{f.title}</li>)}</ul>
        <form action={saveFile} className="space-y-2">
          <input type="hidden" name="lessonId" value={lesson.id} />
          <Field label="عنوان" name="title" />
          <input type="file" name="file" accept="application/pdf" required />
          <SubmitButton>بارگذاری</SubmitButton>
        </form>
      </Panel>
    </>
  );
}
