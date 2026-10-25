import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerm, can, logAction } from "@/lib/auth";
import { s } from "@/lib/admin";
import { fa, jalaliDate, slugify, normalizeIranMobile } from "@/lib/format";
import { parseFields, splitSteps } from "@/lib/forms/types";
import { TEMPLATES, withIds } from "@/lib/forms/templates";
import { RESERVED_SLUGS, seatsTaken } from "@/lib/forms/public";
import { getFormsSms, saveFormsSms } from "@/lib/forms/registration";
import { tomanText } from "@/lib/forms/pricing";
import { themeOf } from "@/lib/forms/themes";
import { PageTitle, Panel, Field } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

const ST = { PUBLISHED: ["منتشرشده", "bg-emerald-50 text-emerald-700"], DRAFT: ["پیش‌نویس", "bg-line text-muted"], CLOSED: ["بسته", "bg-gc-soft text-gc"] } as const;
const PAY = { FREE: "رایگان", FIXED: "مبلغ ثابت", OPTIONS: "قیمت با گزینه" } as Record<string, string>;

async function freeSlug(base: string) {
  let slug = slugify(base || "form");
  if (RESERVED_SLUGS.includes(slug)) slug = `${slug}-form`;
  if (await prisma.form.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  return slug;
}

async function create(fd: FormData) {
  "use server";
  const me = await requirePerm("forms.builder");
  const tpl = TEMPLATES.find((t) => t.key === s(fd, "template"));
  const title = s(fd, "title") || tpl?.title || "فرم جدید";
  const slug = await freeSlug(s(fd, "slug") || tpl?.slug || "form");
  const f = await prisma.form.create({
    data: tpl
      ? {
          title, slug, description: tpl.description, theme: tpl.theme, payMode: tpl.payMode, uniqueBy: tpl.uniqueBy,
          submitLabel: tpl.submitLabel, successTitle: tpl.successTitle, successMessage: tpl.successMessage, fields: withIds(tpl.fields),
        }
      : {
          title, slug,
          fields: [
            { id: "full_name", type: "text", label: "نام و نام خانوادگی", required: true, half: true },
            { id: "phone", type: "phone", label: "شماره موبایل", required: true, half: true },
          ],
        },
  });
  await logAction(me, "form.create", `فرم «${title}»${tpl ? ` از الگوی ${tpl.title}` : ""}`, f.id);
  redirect(`/admin/forms/${f.id}`);
}

async function duplicate(fd: FormData) {
  "use server";
  const me = await requirePerm("forms.builder");
  const src = await prisma.form.findUnique({ where: { id: s(fd, "id") }, include: { discounts: true } });
  if (!src) return;
  const { id: _id, createdAt: _c, updatedAt: _u, isSystem: _s, slug, title, fields, discounts, ...rest } = src;
  const f = await prisma.form.create({
    data: {
      ...rest,
      title: `${title} (کپی)`,
      slug: await freeSlug(`${slug}-copy`),
      status: "DRAFT",
      fields: fields ?? [],
      discounts: { create: discounts.map((d) => ({ code: d.code, percent: d.percent, amountRials: d.amountRials, maxUses: d.maxUses, active: d.active, expiresAt: d.expiresAt })) },
    },
  });
  await logAction(me, "form.duplicate", `کپی از «${title}»`, f.id);
  redirect(`/admin/forms/${f.id}`);
}

async function saveSms(fd: FormData) {
  "use server";
  await requirePerm("forms.builder");
  const id = Number(s(fd, "confirmTemplateId"));
  const adminMobiles = [...new Set(s(fd, "adminMobiles").split(/[\s,،]+/).map((m) => normalizeIranMobile(m)).filter((m): m is string => !!m))];
  await saveFormsSms({ confirmTemplateId: Number.isSafeInteger(id) && id > 0 ? id : null, adminMobiles });
  revalidatePath("/admin/forms");
  redirect("/admin/forms?sms=1");
}

export default async function Forms({ searchParams }: { searchParams: Promise<{ sms?: string }> }) {
  const me = await requirePerm("forms.builder");
  const sp = await searchParams;
  const showMoney = can(me, "forms.payments");
  const [forms, news, revenue, sms] = await Promise.all([
    prisma.form.findMany({ orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }], include: { _count: { select: { submissions: true } } } }),
    prisma.submission.groupBy({ by: ["formId"], where: { status: "NEW" }, _count: true }),
    showMoney ? prisma.submission.groupBy({ by: ["formId"], where: { payState: "PAID" }, _sum: { amountRials: true }, _count: true }) : Promise.resolve([]),
    getFormsSms(),
  ]);
  const seats = Object.fromEntries(await Promise.all(forms.filter((f) => f.capacity != null).map(async (f) => [f.id, await seatsTaken(f.id)] as const)));
  return (
    <>
      <PageTitle title="فرم‌ساز" sub="فرم بسازید، منتشر کنید، پرداخت بگیرید و پاسخ‌ها را مدیریت کنید." action={<Link href="/forms" target="_blank" className="btn-ghost px-4 py-2 text-sm">صفحهٔ ثبت‌نام‌ها ↗</Link>} />

      <Panel title="شروع سریع با الگو" className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((t) => (
            <form key={t.key} action={create} className="group flex flex-col rounded-2xl border border-line bg-ivory/50 p-4 transition-colors hover:border-navy/30 hover:bg-paper" style={{ borderTop: `4px solid ${themeOf(t.theme).accent}` }}>
              <input type="hidden" name="template" value={t.key} />
              <span className="text-2xl" aria-hidden>{t.icon}</span>
              <p className="mt-2 font-extrabold text-navy">{t.title}</p>
              <p className="mt-1 flex-1 text-xs leading-6 text-muted">{t.blurb}</p>
              <p className="mt-2 text-[0.7rem] text-muted">{fa(splitSteps(withIds(t.fields)).length)} مرحله · {PAY[t.payMode]}</p>
              <SubmitButton className="btn-ghost mt-3 px-4 py-1.5 text-sm">ساخت از این الگو</SubmitButton>
            </form>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {forms.map((f) => {
          const nw = news.find((x) => x.formId === f.id)?._count ?? 0;
          const rev = (revenue as { formId: string; _sum: { amountRials: number | null }; _count: number }[]).find((x) => x.formId === f.id);
          const th = themeOf(f.theme);
          return (
            <div key={f.id} className="overflow-hidden rounded-2xl border border-line bg-paper" data-admin-form={f.slug}>
              <div className="flex h-20 items-end bg-cover bg-center p-3" style={{ backgroundImage: f.coverImage ? `linear-gradient(to top, ${th.h1}cc, transparent), url(${f.coverImage})` : `linear-gradient(135deg, ${th.h1}, ${th.h2})` }}>
                <span className={`chip ${ST[f.status][1]}`}>{ST[f.status][0]}</span>
                <span className="chip mr-2 bg-white/90 text-navy">{PAY[f.payMode] ?? f.payMode}{f.payMode !== "FREE" && f.basePriceRials > 0 ? ` · ${tomanText(f.basePriceRials)}` : ""}</span>
              </div>
              <div className="p-5">
                <p className="font-extrabold text-navy">{f.title}</p>
                <p className="mt-0.5 text-xs text-muted" dir="ltr">{f.isSystem && f.slug === "pre-registration" ? "/register" : `/f/${f.slug}`}</p>
                <p className="mt-3 text-sm text-muted">
                  {fa(parseFields(f.fields).filter((x) => x.type !== "page").length)} فیلد · {fa(f._count.submissions)} پاسخ{nw > 0 && <b className="text-gold-ink"> ({fa(nw)} جدید)</b>}
                  {f.capacity != null && <> · ظرفیت {fa(seats[f.id] ?? 0)}/{fa(f.capacity)}</>} · {jalaliDate(f.updatedAt)}
                </p>
                {showMoney && rev && <p className="mt-1 text-sm font-bold text-emerald-700" data-revenue>درآمد تأییدشده: {tomanText(rev._sum.amountRials ?? 0)} ({fa(rev._count)} پرداخت)</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/admin/forms/${f.id}`} className="btn-ghost px-4 py-2 text-sm">ویرایش فرم</Link>
                  <Link href={`/admin/submissions?form=${f.id}`} className="btn-ghost px-4 py-2 text-sm">پاسخ‌ها</Link>
                  <form action={duplicate}><input type="hidden" name="id" value={f.id} /><SubmitButton className="btn-ghost px-4 py-2 text-sm">تکثیر</SubmitButton></form>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="فرم خالی">
          <form action={create} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="عنوان فرم" name="title" required placeholder="مثلاً ثبت‌نام همایش" />
            <Field label="نامک (لاتین، در آدرس فرم)" name="slug" dir="ltr" placeholder="seminar-1405" />
            <SubmitButton>ساخت فرم</SubmitButton>
          </form>
        </Panel>
        <Panel title="پیامک فرم‌ها (SMS.ir)">
          {sp.sms && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">ذخیره شد.</p>}
          <form action={saveSms} className="grid gap-4 sm:grid-cols-2">
            <Field label="شناسهٔ قالب تأیید ثبت‌نام" name="confirmTemplateId" dir="ltr" defaultValue={sms.confirmTemplateId ?? ""} hint="قالب Verify در پنل SMS.ir با متغیرهای FULLNAME، TITLE و CODE" />
            <label className="block"><span className="label">شماره‌های مدیر</span>
              <textarea name="adminMobiles" defaultValue={sms.adminMobiles.join("\n")} rows={2} dir="ltr" className="input" />
              <span className="mt-1 block text-xs text-muted">خالی = همان شماره‌های تنظیمات فروشگاه؛ از قالب «مدیر» فروشگاه استفاده می‌شود.</span>
            </label>
            <div className="sm:col-span-2"><SubmitButton className="btn-ghost px-5 py-2 text-sm">ذخیرهٔ تنظیمات پیامک</SubmitButton></div>
          </form>
        </Panel>
      </div>
    </>
  );
}
