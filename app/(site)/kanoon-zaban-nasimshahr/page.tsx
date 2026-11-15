import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { landingBase } from "@/lib/landing";
import { FaqBlock, LandingHero, RelatedGuides, WhereBlock, phonesSentence } from "@/components/site/Landing";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("kanoonZaban");
}

export default async function KanoonZaban() {
  const { t, contact, phone } = await landingBase("kanoonZaban");
  const faq = [
    { q: "کانون زبان ایران در نسیم‌شهر کجاست؟", a: "نمایندگی کانون زبان ایران در نسیم‌شهر، در مجموعه مؤسسه علمی ستارگان است. محل دقیق کلاس و زمان مراجعه را با پیش‌ثبت‌نام یا تماس با مؤسسه بپرسید." },
    { q: "شهریه و برنامهٔ کلاس زبان چقدر است؟", a: "شهریه، روزها و ساعت کلاس در این صفحه اعلام نشده است. فرم پیش‌ثبت‌نام را پر کنید یا با مؤسسه تماس بگیرید تا همان اطلاعات واقعی را بشنوید." },
    { q: "چطور برای کانون زبان ثبت‌نام کنم؟", a: `فرم پیش‌ثبت‌نام آنلاین را پر کنید تا همکاران برای ادامهٔ مراحل تماس بگیرند.${phone ? ` شمارهٔ تماس: ${phonesSentence(contact)}.` : ""}` },
    ...t.faq,
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <>
      <LandingHero k="kanoonZaban" title="کانون زبان ایران نسیم شهر" intro={t.intro} phone={phone} accent="edu" cta={{ href: "/register", label: "پیش‌ثبت‌نام" }} />
      <section className="container-x py-12 sm:py-16">
        <div className="prose-fa max-w-3xl">
          <p>مؤسسه علمی ستارگان (ستارگان پلاس) در نسیم‌شهر فعالیت می‌کند و نمایندگی کانون زبان ایران در این شهر است. این صفحه فقط همین معرفی را دارد؛ سطح‌ها، شهریه و برنامهٔ هفتگی اینجا نوشته نشده تا چیزی حدسی نباشد.</p>
          <p>برای ثبت‌نام یا پرسیدن محل و زمان کلاس، <Link href="/register" className="font-bold text-royal">پیش‌ثبت‌نام</Link> کنید یا از صفحهٔ <Link href="/contact" className="font-bold text-royal">تماس با ما</Link> شماره و نشانی شعبه‌های مؤسسه را ببینید. آموزشگاه و کلاس‌های دیگر مجموعه در <Link href="/amoozeshgah-taghviati-nasimshahr" className="font-bold text-royal">آموزشگاه نسیم شهر</Link> و <Link href="/kelas-taghviati" className="font-bold text-royal">کلاس تقویتی نسیم شهر</Link> معرفی شده‌اند.</p>
          {contact.branches.length > 0 && <p>شعبه‌های مؤسسه علمی ستارگان برای مراجعه و پرسش: {contact.branches.map((b) => `${b.name}: ${b.address}`).join(" — ")}.</p>}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/register" className="btn-gold px-5 py-2.5 text-sm">پیش‌ثبت‌نام</Link>
          <Link href="/contact" className="btn-ghost px-5 py-2.5 text-sm">تماس با مؤسسه</Link>
        </div>
      </section>
      <WhereBlock contact={contact} title="نشانی شعبه‌های مؤسسه" />
      <FaqBlock items={faq} title="پرسش‌های رایج دربارهٔ کانون زبان ایران در نسیم‌شهر" />
      <RelatedGuides current="kanoonZaban" />
    </>
  );
}
