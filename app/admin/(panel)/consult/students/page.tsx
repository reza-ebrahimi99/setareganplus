import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { fa, prettyPhone } from "@/lib/format";
import { PageTitle, Panel, Empty } from "@/components/admin/ui";
import { GRADES, gradeLabel } from "@/lib/consult/constants";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { NewStudentForm, RotateButton } from "./StudentsPanel";
import { saveStudent } from "./actions";

export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  await requirePerm("consult.students");
  const sp = await searchParams;
  const rows = await prisma.enrolledStudent.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  return (
    <>
      <PageTitle title="دانش‌آموزان جلسهٔ ویژه" sub="کد را خودتان می‌سازید. بدون این فهرست، صفحهٔ ویژه کسی را راه نمی‌دهد." />
      {sp.e === "mobile" && <p className="mb-4 rounded-xl bg-gc-soft px-4 py-3 text-sm font-semibold text-gc">شماره موبایل معتبر نیست.</p>}
      {sp.e === "name" && <p className="mb-4 rounded-xl bg-gc-soft px-4 py-3 text-sm font-semibold text-gc">نام را کامل بنویسید.</p>}
      <Panel title="دانش‌آموز تازه">
        <p className="mb-4 text-sm leading-7 text-muted">کد یک‌بار نشان داده می‌شود و به‌صورت HMAC ذخیره می‌گردد. حدس‌زدن کد از بیرون با محدودیت تلاش بسته شده و فهرست دانش‌آموزان عمومی نیست.</p>
        <NewStudentForm />
      </Panel>
      <div className="mt-6">
        {rows.length === 0 ? <Empty>هنوز دانش‌آموزی اضافه نشده.</Empty> : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl border border-line bg-paper p-4">
                <form action={saveStudent}>
                  <input type="hidden" name="id" value={r.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block"><span className="label">نام</span><input name="fullName" defaultValue={r.fullName} className="input" /></label>
                    <label className="block"><span className="label">موبایل مورد اعتماد</span><input name="mobile" defaultValue={r.mobile ?? ""} dir="ltr" className="input" /></label>
                    <label className="block"><span className="label">پایه</span><select name="grade" defaultValue={r.grade ?? ""} className="input"><option value="">نامشخص</option>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
                    <p className="text-xs leading-6 text-muted">شناسهٔ کد: …{fa(r.codeSuffix)} · {r.grade ? gradeLabel(r.grade) : "پایه نامشخص"} · {r.mobile ? prettyPhone(r.mobile) : "بدون شماره؛ موقع رزرو پیامک می‌خواهد"}</p>
                    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={r.active} className="accent-navy" />فعال</label>
                    <label className="block sm:col-span-2"><span className="label">یادداشت</span><textarea name="note" defaultValue={r.note ?? ""} rows={2} className="input" /></label>
                  </div>
                  <div className="mt-3"><SubmitButton>ذخیره</SubmitButton></div>
                </form>
                <div className="mt-2"><RotateButton id={r.id} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
