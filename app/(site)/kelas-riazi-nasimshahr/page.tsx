import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { landingBase } from "@/lib/landing";
import { getSettings } from "@/lib/settings";
import { FaqBlock, LandingHero, LocalFacts, RelatedGuides, WhereBlock, phonesSentence } from "@/components/site/Landing";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("riyazi");
}

export default async function KelasRiyazi() {
  const { t, contact, phone } = await landingBase("riyazi");
  const { about } = await getSettings();
  const founder = about.founder;
  const points = founder.points.filter((p) => /ریاضی|امیرکبیر|کنکور|تدریس|قلم/.test(p));

  const faq = [
    { q: "کلاس ریاضی نسیم شهر را چه کسی تدریس می‌کند؟", a: "مهندس رضا ابراهیمی، مدرس و مؤلف ریاضیات مؤسسه علمی ستارگان و مؤلف کتاب ریاضی جامع کنکور." },
    contact.branches.length > 0 && { q: "مؤسسه برای کلاس ریاضی نسیم شهر کجا است؟", a: `نشانی شعبه‌های مؤسسه علمی ستارگان: ${contact.branches.map((b) => `${b.name}: ${b.address}`).join(" — ")}. روز و ساعت هر کلاس را از پیش‌ثبت‌نام یا تماس بپرسید.` },
    { q: "کلاس ویدیویی ریاضی هم دارید؟", a: "بله. دوره‌های ریاضی، جلسه به جلسه، در صفحهٔ کلاس‌های ویدیویی است." },
    { q: "برنامه و شهریهٔ کلاس ریاضی را از کجا بدانم؟", a: `در این صفحه اعلام نشده است. فرم پیش‌ثبت‌نام را پر کنید تا همکاران تماس بگیرند.${phone ? ` شمارهٔ تماس: ${phonesSentence(contact)}.` : ""}` },
    ...t.faq,
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <>
      <LandingHero k="riyazi" title="کلاس ریاضی نسیم شهر" intro={t.intro} phone={phone} accent="edu" />
      <LocalFacts contact={contact} math="here">
        <p>
          کلاس ریاضی نسیم شهر در مؤسسه علمی ستارگان (ستارگان پلاس) برگزار می‌شود. مدرس ریاضی مجموعه <b className="text-navy">مهندس رضا ابراهیمی</b> است؛
          {founder.bio ? ` ${founder.bio}` : " او مدرس و مؤلف ریاضیات مؤسسه و مدیر مجموعه است."}
        </p>
        {points.length > 0 && (
          <ul className="mb-4 list-disc space-y-1 pr-5 leading-8">
            {points.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        <p>
          برای دیدن جلسه‌های ضبط‌شده به <Link href="/classes" className="font-bold text-royal">کلاس‌های ویدیویی</Link> سر بزنید
          و برای تقویت بقیهٔ درس‌ها <Link href="/kelas-taghviati" className="font-bold text-royal">کلاس تقویتی نسیم شهر</Link> را ببینید.
        </p>
      </LocalFacts>
      <WhereBlock contact={contact} title="نشانی شعبه‌های مؤسسه" />
      <FaqBlock items={faq} title="پرسش‌های رایج دربارهٔ کلاس ریاضی نسیم شهر" />
      <RelatedGuides current="riyazi" />
    </>
  );
}
