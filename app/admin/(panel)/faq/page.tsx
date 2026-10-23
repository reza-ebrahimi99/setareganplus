import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { s, b, n } from "@/lib/admin";
import { PageTitle, Panel, Field, Area, Check, Flash } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

async function save(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = s(fd, "id");
  const data = { question: s(fd, "question"), answer: s(fd, "answer"), published: b(fd, "published"), sortOrder: n(fd, "sortOrder") };
  if (!data.question) return;
  if (id) await prisma.faq.update({ where: { id }, data });
  else await prisma.faq.create({ data });
  revalidatePath("/admin/faq");
  redirect("/admin/faq?ok=1");
}
async function remove(fd: FormData) {
  "use server";
  await requireAdmin();
  await prisma.faq.delete({ where: { id: s(fd, "id") } });
  redirect("/admin/faq?ok=1");
}

export default async function FaqAdmin({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const items = await prisma.faq.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageTitle title="سؤالات متداول" />
      <Flash ok={ok} />
      <div className="space-y-3">
        {items.map((f) => (
          <details key={f.id} className="rounded-2xl border border-line bg-paper">
            <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 font-bold text-navy">
              {f.question}
              {!f.published && <span className="chip bg-line text-muted">پنهان</span>}
            </summary>
            <form action={save} className="space-y-4 border-t border-line p-4">
              <input type="hidden" name="id" value={f.id} />
              <Field label="سؤال" name="question" defaultValue={f.question} />
              <Area label="پاسخ" name="answer" defaultValue={f.answer} />
              <div className="flex flex-wrap items-end gap-5"><div className="w-28"><Field label="ترتیب" name="sortOrder" type="number" defaultValue={f.sortOrder} /></div><Check label="منتشر شود" name="published" defaultChecked={f.published} /></div>
              <div className="flex items-center gap-4"><SubmitButton>ذخیره</SubmitButton></div>
            </form>
            <form action={remove} className="px-4 pb-4"><input type="hidden" name="id" value={f.id} /><SubmitButton className="text-sm text-gc" confirm="حذف شود؟">حذف</SubmitButton></form>
          </details>
        ))}
      </div>
      <Panel title="افزودن سؤال" className="mt-6">
        <form action={save} className="space-y-4">
          <Field label="سؤال" name="question" required />
          <Area label="پاسخ" name="answer" />
          <div className="flex items-end gap-5"><div className="w-28"><Field label="ترتیب" name="sortOrder" type="number" defaultValue={items.length} /></div><Check label="منتشر شود" name="published" defaultChecked /></div>
          <SubmitButton>افزودن</SubmitButton>
        </form>
      </Panel>
    </>
  );
}
