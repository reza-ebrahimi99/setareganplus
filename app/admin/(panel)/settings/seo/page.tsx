import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerm, logAction } from "@/lib/auth";
import { s } from "@/lib/admin";
import { toEn } from "@/lib/format";
import { getContact, getSeo, LANDINGS, PAGES, parseOpeningHours, type PageKey, type SeoSettings } from "@/lib/seo";
import { getIndexNowKey } from "@/lib/indexnow";
import { siteUrl } from "@/lib/shop/config";
import { PageTitle, Panel, Field, Area, SaveBar, Flash } from "@/components/admin/ui";

export const metadata = { title: "سئو و گوگل" };

/** Accept either the bare code or the whole <meta ... content="..."> tag. */
function metaCode(v: string) {
  const m = v.match(/content=["']([^"']+)["']/);
  return (m ? m[1] : v).trim().replace(/[^A-Za-z0-9_\-]/g, "").slice(0, 100);
}
const coord = (v: string) => {
  const n = Number.parseFloat(toEn(v));
  return Number.isFinite(n) ? String(n) : "";
};

export default async function SeoSettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("site.settings");
  const { ok } = await searchParams;
  const [seo, contact, key] = await Promise.all([getSeo(), getContact(), getIndexNowKey()]);
  const site = siteUrl();
  const keys = Object.keys(PAGES) as PageKey[];
  const hours = parseOpeningHours(seo.openingHours);

  async function save(fd: FormData) {
    "use server";
    const me = await requirePerm("site.settings");
    const c = await getContact();
    const pages: SeoSettings["pages"] = {};
    for (const k of Object.keys(PAGES) as PageKey[]) {
      const o = { title: s(fd, `${k}_title`), description: s(fd, `${k}_description`), intro: s(fd, `${k}_intro`), faq: s(fd, `${k}_faq`) };
      const clean = Object.fromEntries(Object.entries(o).filter(([, v]) => v));
      if (Object.keys(clean).length) pages[k] = clean;
    }
    const value: SeoSettings = {
      googleVerification: metaCode(s(fd, "googleVerification")) || undefined,
      bingVerification: metaCode(s(fd, "bingVerification")) || undefined,
      geo: c.branches.map((_, i) => ({ lat: coord(s(fd, `lat_${i}`)), lng: coord(s(fd, `lng_${i}`)) })),
      openingHours: s(fd, "openingHours") || undefined,
      examCalendar: s(fd, "examCalendar") || undefined,
      pages,
    };
    await prisma.setting.upsert({ where: { key: "seo" }, create: { key: "seo", value: value as object }, update: { value: value as object } });
    await logAction(me, "settings.seo", "ویرایش تنظیمات سئو و گوگل", null);
    revalidatePath("/", "layout");
    redirect("/admin/settings/seo?ok=1");
  }

  return (
    <>
      <PageTitle title="سئو و گوگل" sub="عنوان و توضیح صفحه‌ها در نتایج گوگل، تأیید Search Console و اطلاعات کسب‌وکار محلی" action={<Link href="/admin/settings" className="btn-ghost px-4 py-2 text-sm">تنظیمات سایت ←</Link>} />
      <Flash ok={ok} />
      <form action={save} className="space-y-6">
        <Panel title="گوگل و موتورهای جست‌وجو">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="کد تأیید Google Search Console" name="googleVerification" defaultValue={seo.googleVerification} dir="ltr" hint="در Search Console روش «HTML tag» را انتخاب کنید و کل تگ یا فقط مقدار content را اینجا بچسبانید." />
            <Field label="کد تأیید Bing Webmaster (اختیاری)" name="bingVerification" defaultValue={seo.bingVerification} dir="ltr" hint="تگ msvalidate.01" />
          </div>
          <ul className="mt-5 space-y-1.5 text-sm text-muted">
            <li>نقشهٔ سایت (برای ثبت در Search Console): <a href="/sitemap.xml" target="_blank" className="font-bold text-edu" dir="ltr">{site}/sitemap.xml</a></li>
            <li>robots.txt: <a href="/robots.txt" target="_blank" className="font-bold text-edu" dir="ltr">{site}/robots.txt</a></li>
            <li>IndexNow (Bing و Yandex): کلید خودکار ساخته شده و با انتشار هر خبر یا جزوه، خبر داده می‌شود — <a href="/indexnow-key.txt" target="_blank" className="font-bold text-edu" dir="ltr">indexnow-key.txt</a> <span className="font-mono text-xs" dir="ltr">({key.slice(0, 6)}…)</span></li>
          </ul>
        </Panel>

        <Panel title="موقعیت شعبه‌ها روی نقشه (برای گوگل)">
          <p className="mb-4 text-sm leading-7 text-muted">مختصات دقیق را از Google Maps بردارید: روی محل شعبه راست‌کلیک کنید و عدد اول (عرض) و دوم (طول) را کپی کنید. اگر مطمئن نیستید خالی بگذارید — چیزی حدسی ثبت نکنید.</p>
          {contact.branches.length === 0 ? (
            <p className="text-sm text-muted">ابتدا شعبه‌ها را در «تنظیمات سایت» وارد کنید.</p>
          ) : (
            <div className="space-y-4">
              {contact.branches.map((b, i) => (
                <div key={i} className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-[1fr_180px_180px] md:items-end">
                  <div><p className="font-bold text-navy">{b.name}</p><p className="text-xs text-muted">{b.address}</p></div>
                  <Field label="عرض جغرافیایی (lat)" name={`lat_${i}`} defaultValue={seo.geo?.[i]?.lat} dir="ltr" placeholder="35.5…" />
                  <Field label="طول جغرافیایی (lng)" name={`lng_${i}`} defaultValue={seo.geo?.[i]?.lng} dir="ltr" placeholder="51.1…" />
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Area
              label="ساعات کاری (قالب ماشینی برای گوگل)"
              name="openingHours"
              defaultValue={seo.openingHours}
              rows={4}
              dir="ltr"
              hint="هر خط یک قانون: روزها (Sa Su Mo Tu We Th Fr) و ساعت. مثال: «Sa-We 12:00-20:30» و «Th 10:00-20:30». فقط ساعات واقعی را وارد کنید."
            />
            <div className="rounded-xl bg-ivory p-4 text-sm leading-7 text-muted">
              <p className="font-bold text-navy">ساعات کاری فعلی سایت (متن فارسی):</p>
              {contact.hours.length ? contact.hours.map((h) => <p key={h}>{h}</p>) : <p>—</p>}
              <p className="mt-3 font-bold text-navy">برداشت گوگل از قالب ماشینی:</p>
              {hours.length ? hours.map((h, i) => <p key={i} dir="ltr" className="text-left">{h.dayOfWeek.join(", ")}: {h.opens}–{h.closes}</p>) : <p>هنوز وارد نشده</p>}
            </div>
          </div>
        </Panel>

        <Panel title="تقویم آزمون‌های قلم‌چی">
          <Area label="هر خط: تاریخ | عنوان | توضیح (اختیاری)" name="examCalendar" defaultValue={seo.examCalendar} rows={5} hint="در صفحهٔ «آزمون‌های قلم‌چی در نسیم‌شهر» نمایش داده می‌شود. خالی = جدول نمایش داده نمی‌شود و اطلاعیه‌های دستهٔ «آزمون» نشان داده می‌شوند." />
        </Panel>

        <Panel title="عنوان و توضیح صفحه‌ها در گوگل">
          <p className="mb-5 text-sm leading-7 text-muted">خالی بگذارید تا متن پیش‌فرض (نمایش داده‌شده به‌صورت کم‌رنگ) استفاده شود. عنوان حدود ۵۰ تا ۶۰ نویسه و توضیح حدود ۱۲۰ تا ۱۶۰ نویسه باشد؛ طبیعی بنویسید و کلمات را تکرار نکنید.</p>
          <div className="space-y-4">
            {keys.map((k) => {
              const d = PAGES[k] as { label: string; path: string; title: string; description: string; intro?: string };
              const o = seo.pages?.[k] ?? {};
              const isLanding = LANDINGS.includes(k);
              return (
                <details key={k} className="rounded-xl border border-line bg-white p-4" open={!!(o.title || o.description || o.intro || o.faq)}>
                  <summary className="cursor-pointer font-bold text-navy">{d.label} <span className="text-xs font-normal text-muted" dir="ltr">{d.path}</span></summary>
                  <div className="mt-4 grid gap-4">
                    <Field label="عنوان (title)" name={`${k}_title`} defaultValue={o.title} placeholder={d.title} />
                    <Area label="توضیح (meta description)" name={`${k}_description`} defaultValue={o.description} rows={2} hint={`پیش‌فرض: ${d.description}`} />
                    {d.intro !== undefined && <Area label="متن معرفی بالای صفحه" name={`${k}_intro`} defaultValue={o.intro} rows={3} hint={d.intro ? `پیش‌فرض: ${d.intro}` : undefined} />}
                    {isLanding && <Area label="پرسش و پاسخ‌های اضافه — هر خط: پرسش | پاسخ" name={`${k}_faq`} defaultValue={o.faq} rows={4} hint="به پرسش‌های خودکار (از نشانی، تلفن و خدمات ثبت‌شده) اضافه می‌شود و در گوگل به‌صورت FAQ معرفی می‌شود. فقط اطلاعات درست و تأییدشده." />}
                  </div>
                </details>
              );
            })}
          </div>
        </Panel>
        <SaveBar />
      </form>
    </>
  );
}
