import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pageMeta } from "@/lib/seo";
import { landingBase } from "@/lib/landing";
import { getSettings } from "@/lib/settings";
import { FaqBlock, LandingHero, RelatedGuides, phonesSentence } from "@/components/site/Landing";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("dabestan");
}

export default async function Dabestan() {
  const { t, contact, phone } = await landingBase("dabestan");
  const [{ about }, principals] = await Promise.all([
    getSettings(),
    prisma.teamMember.findMany({
      where: { published: true, role: { contains: "دبستان" } },
      orderBy: { sortOrder: "asc" },
      select: { name: true, role: true },
    }).catch(() => []),
  ]);
  const milestone = about.timeline.find((item) => item.title.includes("دبستان"));

  const faq = [
    { q: "دبستان غیردولتی ستارگان آینده چیست؟", a: "دبستان غیردولتی ستارگان آینده بخشی از مؤسسه علمی ستارگان در نسیم‌شهر است. جزئیات ثبت‌نام، شهریه و برنامه در این صفحه نیست." },
    milestone && { q: "تأسیس دبستان در سایت چطور آمده است؟", a: `${milestone.year ? `در مسیر مجموعه، سال ${milestone.year}: ` : ""}${milestone.title}${milestone.text ? `. ${milestone.text}` : "."}` },
    principals.length > 0 && { q: "مدیر دبستان در معرفی تیم چه کسی است؟", a: principals.map((p) => `${p.name}، ${p.role}`).join("؛ ") + "." },
    { q: "چطور برای دبستان سؤال یا پیش‌ثبت‌نام کنم؟", a: `فرم پیش‌ثبت‌نام را پر کنید یا با مؤسسه تماس بگیرید.${phone ? ` شماره: ${phonesSentence(contact)}.` : ""} نشانی شعبه‌های اعلام‌شدهٔ مؤسسه در صفحهٔ تماس است.` },
    ...t.faq,
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <>
      <LandingHero k="dabestan" title="دبستان غیردولتی ستارگان آینده" intro={t.intro} phone={phone} accent="edu" />
      <section className="container-x py-12 sm:py-16">
        <div className="prose-fa max-w-3xl">
          {about.intro && <p>{about.intro}</p>}
          <p>دبستان غیردولتی ستارگان آینده در مجموعهٔ مؤسسه علمی ستارگان نسیم‌شهر است. این صفحه همان چیزی را می‌گوید که در <Link href="/about" className="font-bold text-royal">دربارهٔ ما</Link> آمده و عدد، شهریه یا برنامهٔ تازه‌ای به آن اضافه نمی‌کند.</p>
          {milestone && (
            <p>
              در مسیر شکل‌گیری مجموعه آمده است: {milestone.year ? <b className="text-navy">{milestone.year}. </b> : null}
              {milestone.title}
              {milestone.text ? ` ${milestone.text}` : ""}
            </p>
          )}
          {principals.length > 0 && (
            <p>
              در معرفی تیم، {principals.map((p) => `${p.name} با نقش «${p.role}»`).join(" و ")} آمده است.
              {" "}<Link href="/team" className="font-bold text-royal">تیم ما</Link> را ببینید.
            </p>
          )}
          <p>
            برای پرسش دربارهٔ ثبت‌نام <Link href="/register" className="font-bold text-royal">پیش‌ثبت‌نام</Link> کنید یا <Link href="/contact" className="font-bold text-royal">تماس</Link> بگیرید.
            آموزشگاه مجموعه در صفحهٔ <Link href="/amoozeshgah-taghviati-nasimshahr" className="font-bold text-royal">آموزشگاه نسیم شهر</Link> معرفی شده است.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/register" className="btn-gold px-5 py-2.5 text-sm">پیش‌ثبت‌نام</Link>
          <Link href="/about" className="btn-ghost px-5 py-2.5 text-sm">دربارهٔ مؤسسه</Link>
          <Link href="/contact" className="btn-ghost px-5 py-2.5 text-sm">تماس</Link>
        </div>
      </section>
      <FaqBlock items={faq} title="پرسش‌های رایج دربارهٔ دبستان ستارگان آینده" />
      <RelatedGuides current="dabestan" />
    </>
  );
}
