import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { PageTitle, Panel, Area, Flash } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { replyThread } from "../actions";

export default async function Threads({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("classes.manage");
  const { ok } = await searchParams;
  const rows = await prisma.classThread.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { student: true, lesson: { include: { course: true } }, replies: true } });
  return (
    <>
      <PageTitle title="پرسش‌های کلاس" sub="تا منتشر نکنی روی سایت دیده نمی‌شود." />
      <Flash ok={ok} />
      <div className="space-y-4">
        {rows.map((t) => (
          <Panel key={t.id}>
            <p className="text-xs text-muted">{t.student.firstName} {t.student.lastName} · {t.lesson.course.title} · {t.status}</p>
            <p className="mt-1 font-bold">{t.body}</p>
            {t.replies.map((r) => <p key={r.id} className="mt-2 text-sm">{r.author}: {r.body}</p>)}
            <form action={replyThread} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={t.id} />
              <Area label="پاسخ" name="body" />
              <select name="status" defaultValue={t.status === "PENDING" ? "PUBLISHED" : t.status} className="input w-auto">
                <option value="PUBLISHED">منتشر شود</option>
                <option value="PENDING">در انتظار</option>
                <option value="HIDDEN">پنهان</option>
              </select>
              <SubmitButton>ثبت</SubmitButton>
            </form>
          </Panel>
        ))}
        {rows.length === 0 && <p className="text-muted">سؤالی نرسیده است.</p>}
      </div>
    </>
  );
}
