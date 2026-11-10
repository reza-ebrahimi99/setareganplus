import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { PageTitle, Panel, Field, Area, Check, Flash } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { FIELDS, GRADES } from "@/lib/classes/catalog";
import { savePath } from "../actions";

export default async function Paths({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("classes.manage");
  const { ok } = await searchParams;
  const paths = await prisma.classPath.findMany({ include: { steps: { orderBy: { sortOrder: "asc" }, include: { course: true } } }, orderBy: { grade: "asc" } });
  return (
    <>
      <PageTitle title="مسیرهای یادگیری" sub="هر خط یک نامک دوره، به ترتیب «اول این، بعد این»." />
      <Flash ok={ok} />
      {paths.map((p) => (
        <Panel key={p.id} title={p.title} className="mb-4">
          <form action={savePath} className="space-y-3">
            <input type="hidden" name="grade" value={p.grade} />
            <input type="hidden" name="field" value={p.field} />
            <Field label="عنوان" name="title" defaultValue={p.title} />
            <Area label="نامک‌ها" name="slugs" defaultValue={p.steps.map((s) => s.course.slug).join("\n")} rows={8} dir="ltr" />
            <Check label="منتشر" name="published" defaultChecked={p.published} />
            <SubmitButton>ذخیره</SubmitButton>
          </form>
        </Panel>
      ))}
      <Panel title="مسیر تازه">
        <form action={savePath} className="space-y-3">
          <label className="block text-sm">پایه<select name="grade" className="input mt-1">{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
          <label className="block text-sm">رشته<select name="field" className="input mt-1"><option value="">همه</option>{FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
          <Field label="عنوان" name="title" />
          <Area label="نامک‌ها" name="slugs" dir="ltr" hint="tabe سپس had" />
          <Check label="منتشر" name="published" defaultChecked />
          <SubmitButton>ساخت</SubmitButton>
        </form>
      </Panel>
    </>
  );
}
