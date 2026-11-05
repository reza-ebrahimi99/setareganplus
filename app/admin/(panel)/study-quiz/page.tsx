import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm, logAction } from "@/lib/auth";
import { s, b, sn } from "@/lib/admin";
import { fa, jalaliDateTime, prettyPhone, telHref, toEn } from "@/lib/format";
import { PageTitle, Panel, Field, Area, Check, Flash } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ARCHETYPES, ARCHETYPE_LIST, QUIZ_PATH } from "@/lib/quiz/content";
import { getQuizSettings, saveQuizSettings, type StudyQuizSettings } from "@/lib/quiz/settings";
import { GRADES } from "@/lib/shop/config";

const PER = 40;

async function saveSettings(fd: FormData) {
  "use server";
  const me = await requirePerm("campaign.studyQuiz");
  const otp = Number(s(fd, "otpTemplateId"));
  const rewardTpl = Number(s(fd, "rewardTemplateId"));
  const endsRaw = s(fd, "endsAt");
  let endsAt: string | null = null;
  if (endsRaw) {
    const d = new Date(endsRaw);
    if (!Number.isNaN(d.getTime())) endsAt = d.toISOString();
  }
  const next: StudyQuizSettings = {
    enabled: b(fd, "enabled"),
    title: s(fd, "title") || "درس خوندنت چه مدلیه؟",
    intro: s(fd, "intro"),
    rewardText: s(fd, "rewardText"),
    rewardSms: b(fd, "rewardSms"),
    otpTemplateId: Number.isSafeInteger(otp) && otp > 0 ? otp : null,
    rewardTemplateId: Number.isSafeInteger(rewardTpl) && rewardTpl > 0 ? rewardTpl : null,
    endsAt,
    homeBanner: b(fd, "homeBanner"),
  };
  await saveQuizSettings(next);
  await logAction(me, "quiz.settings", "به‌روزرسانی تنظیمات کمپین تست مطالعه");
  revalidatePath("/admin/study-quiz");
  revalidatePath(QUIZ_PATH);
  revalidatePath("/");
  redirect("/admin/study-quiz?ok=1");
}

async function setContacted(fd: FormData) {
  "use server";
  await requirePerm("campaign.studyQuiz");
  const id = s(fd, "id");
  const contacted = s(fd, "contacted") === "1";
  await prisma.studyQuizLead.update({ where: { id }, data: { contacted } });
  revalidatePath("/admin/study-quiz");
}

async function saveNote(fd: FormData) {
  "use server";
  await requirePerm("campaign.studyQuiz");
  await prisma.studyQuizLead.update({ where: { id: s(fd, "id") }, data: { note: sn(fd, "note") } });
  revalidatePath("/admin/study-quiz");
}

type Filters = { q?: string; archetype?: string; grade?: string; contacted?: string; page?: string; ok?: string };

export default async function StudyQuizAdmin({ searchParams }: { searchParams: Promise<Filters> }) {
  await requirePerm("campaign.studyQuiz");
  const f = await searchParams;
  const page = Math.max(1, Number(f.page) || 1);
  const where: Record<string, unknown> = {};
  if (f.archetype && ARCHETYPES[f.archetype as keyof typeof ARCHETYPES]) where.archetype = f.archetype;
  if (f.grade) where.grade = f.grade;
  if (f.contacted === "1") where.contacted = true;
  if (f.contacted === "0") where.contacted = false;
  if (f.q?.trim()) {
    const q = toEn(f.q.trim());
    where.OR = [
      { firstName: { contains: f.q.trim() } },
      { lastName: { contains: f.q.trim() } },
      { mobile: { contains: q } },
      { rewardCode: { contains: q.toUpperCase() } },
    ];
  }

  const [settings, total, items, byArch, byGrade, verified, last7, contactedN] = await Promise.all([
    getQuizSettings(),
    prisma.studyQuizLead.count({ where }),
    prisma.studyQuizLead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER }),
    prisma.studyQuizLead.groupBy({ by: ["archetype"], _count: true }),
    prisma.studyQuizLead.groupBy({ by: ["grade"], _count: true }),
    prisma.studyQuizLead.count(),
    prisma.studyQuizLead.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
    prisma.studyQuizLead.count({ where: { contacted: true } }),
  ]);

  // per-day last 14 days
  const since = new Date(Date.now() - 14 * 864e5);
  const recent = await prisma.studyQuizLead.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });
  const byDay: Record<string, number> = {};
  for (const r of recent) {
    const k = r.createdAt.toISOString().slice(0, 10);
    byDay[k] = (byDay[k] || 0) + 1;
  }

  const pages = Math.max(1, Math.ceil(total / PER));
  const qs = (extra: Record<string, string>) =>
    new URLSearchParams(Object.fromEntries(Object.entries({ q: f.q || "", archetype: f.archetype || "", grade: f.grade || "", contacted: f.contacted || "", ...extra }).filter(([, v]) => v))).toString();

  const endsLocal = settings.endsAt ? new Date(settings.endsAt).toISOString().slice(0, 16) : "";

  return (
    <>
      <PageTitle
        title="کمپین تست مطالعه"
        sub={`صفحهٔ عمومی: ${QUIZ_PATH} · ${fa(verified)} شرکت‌کننده`}
        action={
          <div className="flex flex-wrap gap-2">
            <a href={`/admin/study-quiz/export?${qs({ format: "xlsx" })}`} className="btn-ghost px-4 py-2 text-sm">Excel</a>
            <a href={`/admin/study-quiz/export?${qs({ format: "csv" })}`} className="btn-ghost px-4 py-2 text-sm">CSV</a>
            <Link href={QUIZ_PATH} target="_blank" className="btn-navy px-4 py-2 text-sm">مشاهدهٔ صفحه ↗</Link>
          </div>
        }
      />
      {f.ok && <Flash ok="1" />}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["کل لیدها", verified],
          ["۷ روز اخیر", last7],
          ["تماس گرفته‌شده", contactedN],
          ["وضعیت", settings.enabled ? 1 : 0],
        ].map(([label, v], i) => (
          <div key={String(label)} className={`rounded-2xl border p-4 ${i === 3 ? (settings.enabled ? "border-emerald-200 bg-emerald-50" : "border-gc/30 bg-gc-soft") : "border-line bg-paper"}`}>
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-extrabold text-navy">
              {i === 3 ? (settings.enabled ? "فعال" : "غیرفعال") : fa(Number(v))}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Panel title="تنظیمات کمپین">
          <form action={saveSettings} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Check label="کمپین فعال باشد" name="enabled" defaultChecked={settings.enabled} />
              <Check label="بنر در صفحهٔ اصلی" name="homeBanner" defaultChecked={settings.homeBanner} />
              <Check label="پیامک کد هدیه بعد از اتمام" name="rewardSms" defaultChecked={settings.rewardSms} />
            </div>
            <Field label="عنوان" name="title" defaultValue={settings.title} required />
            <Area label="متن معرفی" name="intro" defaultValue={settings.intro} rows={3} />
            <Area label="متن هدیه / تخفیف" name="rewardText" defaultValue={settings.rewardText} rows={3} hint="این متن کنار کد هدیه در صفحهٔ نتیجه نشان داده می‌شود." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="شناسه قالب SMS تأیید (CODE)" name="otpTemplateId" defaultValue={settings.otpTemplateId ?? ""} dir="ltr" hint="قالب Verify در SMS.ir با متغیر CODE" />
              <Field label="شناسه قالب SMS هدیه (CODE, FULLNAME)" name="rewardTemplateId" defaultValue={settings.rewardTemplateId ?? ""} dir="ltr" />
            </div>
            <label className="block">
              <span className="label">تاریخ پایان (اختیاری)</span>
              <input type="datetime-local" name="endsAt" defaultValue={endsLocal} className="input" dir="ltr" />
            </label>
            <SubmitButton className="btn-navy px-5 py-2.5 text-sm">ذخیرهٔ تنظیمات</SubmitButton>
          </form>
          <div className="mt-5 rounded-xl bg-ivory p-3 text-xs leading-6 text-muted">
            در SMS.ir یک قالب Verify بسازید که پارامتر <b dir="ltr">CODE</b> داشته باشد و شناسه‌اش را بالا بگذارید.
            اگر قالب تنظیم نشود و SMS فعال باشد، ارسال کد ممکن است ناموفق شود؛ در حالت توسعه با SMS خاموش، کد روی صفحه نشان داده می‌شود.
          </div>
        </Panel>

        <Panel title="آمار سریع">
          <p className="mb-2 text-sm font-bold text-navy">بر اساس الگوی مطالعه</p>
          <ul className="mb-5 space-y-2">
            {ARCHETYPE_LIST.map((a) => {
              const n = byArch.find((x) => x.archetype === a.key)?._count ?? 0;
              return (
                <li key={a.key} className="flex items-center justify-between rounded-xl bg-ivory px-3 py-2 text-sm">
                  <span>{a.emoji} {a.name}</span>
                  <span className="font-extrabold text-navy">{fa(n)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mb-2 text-sm font-bold text-navy">بر اساس پایه</p>
          <ul className="mb-5 space-y-1.5">
            {GRADES.map((g) => {
              const n = byGrade.find((x) => x.grade === g)?._count ?? 0;
              if (!n) return null;
              return (
                <li key={g} className="flex justify-between text-sm">
                  <span>{g}</span><span className="font-bold">{fa(n)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mb-2 text-sm font-bold text-navy">۱۴ روز اخیر</p>
          <ul className="max-h-40 space-y-1 overflow-auto text-xs">
            {Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0])).map(([d, n]) => (
              <li key={d} className="flex justify-between font-mono" dir="ltr">
                <span>{d}</span><span>{n}</span>
              </li>
            ))}
            {Object.keys(byDay).length === 0 && <li className="text-muted">هنوز لیدی در ۱۴ روز اخیر نیست.</li>}
          </ul>
        </Panel>
      </div>

      <Panel title="لیست لیدها" className="mt-6">
        <form className="mb-4 flex flex-wrap gap-2">
          <input name="q" defaultValue={f.q || ""} placeholder="جست‌وجو: نام، موبایل، کد" className="input max-w-xs" />
          <select name="archetype" defaultValue={f.archetype || ""} className="input max-w-[12rem]">
            <option value="">همه الگوها</option>
            {ARCHETYPE_LIST.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
          </select>
          <select name="grade" defaultValue={f.grade || ""} className="input max-w-[10rem]">
            <option value="">همه پایه‌ها</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select name="contacted" defaultValue={f.contacted || ""} className="input max-w-[10rem]">
            <option value="">همه وضعیت‌ها</option>
            <option value="0">تماس نگرفته</option>
            <option value="1">تماس گرفته‌شده</option>
          </select>
          <button className="btn-ghost px-4 py-2 text-sm">اعمال فیلتر</button>
        </form>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">هنوز لیدی ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-right text-xs text-muted">
                  <th className="py-2 font-semibold">نام</th>
                  <th className="py-2 font-semibold">موبایل</th>
                  <th className="py-2 font-semibold">پایه / رشته</th>
                  <th className="py-2 font-semibold">الگو</th>
                  <th className="py-2 font-semibold">کد</th>
                  <th className="py-2 font-semibold">تاریخ</th>
                  <th className="py-2 font-semibold">تماس</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((x) => {
                  const a = ARCHETYPES[x.archetype as keyof typeof ARCHETYPES];
                  return (
                    <tr key={x.id} className="align-top">
                      <td className="py-3 font-semibold text-navy">{x.firstName} {x.lastName}</td>
                      <td className="py-3" dir="ltr"><a className="font-semibold text-edu" href={telHref(x.mobile)}>{prettyPhone(x.mobile)}</a></td>
                      <td className="py-3 text-muted">{[x.grade, x.field].filter(Boolean).join(" · ")}</td>
                      <td className="py-3">{a ? `${a.emoji} ${a.name}` : x.archetype}</td>
                      <td className="py-3 font-mono text-xs" dir="ltr">{x.rewardCode}{x.referral ? <span className="mt-1 block text-[10px] text-muted">ref:{x.referral}</span> : null}</td>
                      <td className="py-3 text-xs text-muted">{jalaliDateTime(x.createdAt)}</td>
                      <td className="py-3">
                        <form action={setContacted}>
                          <input type="hidden" name="id" value={x.id} />
                          <input type="hidden" name="contacted" value={x.contacted ? "0" : "1"} />
                          <button className={`chip ${x.contacted ? "bg-emerald-50 text-emerald-700" : "bg-line text-muted"}`}>
                            {x.contacted ? "تماس گرفته شد" : "ثبت تماس"}
                          </button>
                        </form>
                        <form action={saveNote} className="mt-2">
                          <input type="hidden" name="id" value={x.id} />
                          <input name="note" defaultValue={x.note ?? ""} placeholder="یادداشت" className="input !py-1 text-xs" />
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link key={p} href={`/admin/study-quiz?${qs({ page: String(p) })}`} className={`rounded-lg px-3 py-1 text-sm ${p === page ? "bg-navy text-white" : "bg-ivory text-navy"}`}>
                {fa(p)}
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
