import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { s } from "@/lib/admin";
import { fa, jalaliDate, slugify } from "@/lib/format";
import { parseFields } from "@/lib/forms/types";
import { PageTitle, Panel, Field } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

const ST = { PUBLISHED: ["منتشرشده", "bg-emerald-50 text-emerald-700"], DRAFT: ["پیش‌نویس", "bg-line text-muted"], CLOSED: ["بسته", "bg-gc-soft text-gc"] } as const;

async function create(fd: FormData) {
  "use server";
  await requireAdmin();
  const title = s(fd, "title") || "فرم جدید";
  let slug = slugify(s(fd, "slug") || "form");
  if (await prisma.form.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const f = await prisma.form.create({
    data: {
      title,
      slug,
      fields: [
        { id: "full_name", type: "text", label: "نام و نام خانوادگی", required: true, half: true },
        { id: "phone", type: "phone", label: "شماره موبایل", required: true, half: true },
      ],
    },
  });
  redirect(`/admin/forms/${f.id}`);
}

export default async function Forms() {
  const forms = await prisma.form.findMany({ orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }], include: { _count: { select: { submissions: true } } } });
  const news = await prisma.submission.groupBy({ by: ["formId"], where: { status: "NEW" }, _count: true });
  return (
    <>
      <PageTitle title="فرم‌ساز" sub="فرم بسازید، منتشر کنید و پاسخ‌ها را مدیریت کنید." />
      <div className="grid gap-4 md:grid-cols-2">
        {forms.map((f) => {
          const nw = news.find((x) => x.formId === f.id)?._count ?? 0;
          return (
            <div key={f.id} className="rounded-2xl border border-line bg-paper p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-navy">{f.title}</p>
                  <p className="mt-0.5 text-xs text-muted" dir="ltr">{f.isSystem && f.slug === "pre-registration" ? "/register" : `/f/${f.slug}`}</p>
                </div>
                <span className={`chip ${ST[f.status][1]}`}>{ST[f.status][0]}</span>
              </div>
              <p className="mt-3 text-sm text-muted">{fa(parseFields(f.fields).length)} فیلد · {fa(f._count.submissions)} پاسخ{nw > 0 && <b className="text-gold-ink"> ({fa(nw)} جدید)</b>} · {jalaliDate(f.updatedAt)}</p>
              <div className="mt-4 flex gap-2">
                <Link href={`/admin/forms/${f.id}`} className="btn-ghost px-4 py-2 text-sm">ویرایش فرم</Link>
                <Link href={`/admin/submissions?form=${f.id}`} className="btn-ghost px-4 py-2 text-sm">پاسخ‌ها</Link>
              </div>
            </div>
          );
        })}
      </div>
      <Panel title="فرم جدید" className="mt-6">
        <form action={create} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="عنوان فرم" name="title" required placeholder="مثلاً ثبت‌نام همایش" />
          <Field label="نامک (لاتین، در آدرس فرم)" name="slug" dir="ltr" placeholder="seminar-1405" />
          <SubmitButton>ساخت فرم</SubmitButton>
        </form>
      </Panel>
    </>
  );
}
