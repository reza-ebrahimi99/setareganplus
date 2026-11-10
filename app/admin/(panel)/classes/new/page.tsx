import { requirePerm } from "@/lib/auth";
import { PageTitle, Panel, Field, Area, Check } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { GRADES, FIELDS } from "@/lib/classes/catalog";
import { saveCourse } from "../actions";

export default async function NewCourse() {
  await requirePerm("classes.manage");
  return (
    <>
      <PageTitle title="دورهٔ جدید" />
      <Panel>
        <form action={saveCourse} className="space-y-4">
          <Field label="عنوان" name="title" required />
          <Field label="نامک انگلیسی" name="slug" dir="ltr" required />
          <Field label="مدرس" name="teacher" defaultValue="مهندس رضا ابراهیمی" />
          <Area label="معرفی" name="intro" />
          <Field label="قیمت اصلی (تومان)" name="priceToman" type="number" defaultValue={250000} />
          <Field label="قیمت با تخفیف (تومان)" name="saleToman" type="number" hint="خالی یعنی بدون تخفیف" />
          <Check label="رایگان (قیمت اصلی خط می‌خورد)" name="isFree" defaultChecked />
          <Check label="پیشنهاد مشاوره" name="suggestConsult" defaultChecked />
          <Check label="منتشر شود" name="published" defaultChecked />
          <GradeFields />
          <SubmitButton>ساخت دوره</SubmitButton>
        </form>
      </Panel>
    </>
  );
}

function GradeFields() {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      {GRADES.map((g) => (
        <label key={g.id} className="inline-flex items-center gap-1"><input type="checkbox" name="grades" value={g.id} className="accent-navy" />{g.label}</label>
      ))}
      {FIELDS.map((f) => (
        <label key={f.id} className="inline-flex items-center gap-1"><input type="checkbox" name="fields" value={f.id} className="accent-navy" />{f.label}</label>
      ))}
    </div>
  );
}
