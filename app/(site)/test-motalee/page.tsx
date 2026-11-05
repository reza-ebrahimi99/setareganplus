import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta, ORG_NAME, breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/site/JsonLd";
import { Eyebrow, Sparkle, Star } from "@/components/site/Star";
import { getQuizSettings, quizIsOpen } from "@/lib/quiz/settings";
import { QUIZ_PATH } from "@/lib/quiz/content";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/shop/config";
import { QuizApp } from "@/components/quiz/QuizApp";
import { quizBootstrap } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getQuizSettings();
  return buildMeta({
    title: `${s.title} | تست الگوی مطالعه ستارگان`,
    description: s.intro,
    path: QUIZ_PATH,
    absoluteTitle: true,
    images: [{ url: "/og/quiz", width: 1200, height: 630, alt: s.title }],
  });
}

export default async function StudyQuizPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const [{ ref }, settings, site, boot] = await Promise.all([searchParams, getQuizSettings(), getSettings(), quizBootstrap()]);
  const open = quizIsOpen(settings);
  const phones = site.contact.phones;
  const mobile = phones.find((p) => p.startsWith("09")) || phones[0];
  const wa = mobile?.startsWith("09") ? `https://wa.me/98${mobile.slice(1)}?text=${encodeURIComponent("سلام، تست مطالعه ستارگان را دادم و می‌خواهم مشاوره بگیرم.")}` : undefined;
  const shareUrl = `${siteUrl()}${QUIZ_PATH}`;

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: settings.title, href: QUIZ_PATH }])} />
      <section className="bg-hero relative overflow-hidden text-white">
        <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_80%_at_50%_0%,black,transparent)]" />
        <Star filled={false} className="pointer-events-none absolute -top-24 -left-24 size-[28rem] text-white/[0.06]" />
        <Sparkle className="animate-twinkle pointer-events-none absolute top-14 left-[12%] size-3 text-gold" />
        <Sparkle className="animate-twinkle pointer-events-none absolute top-24 right-[18%] size-2.5 text-white/70 [animation-delay:1s]" />
        <div className="container-x relative max-w-3xl py-12 sm:py-16">
          <Eyebrow tone="light">تست رایگان الگوی مطالعه · {ORG_NAME}</Eyebrow>
          <h1 className="mt-5 text-[2rem] font-black leading-[1.35] tracking-tight sm:text-[2.75rem]">{settings.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">{settings.intro}</p>
          {!open.open && <p className="mt-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm text-gold">{open.reason}</p>}
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/65">
            <span className="inline-flex items-center gap-1.5">⏱ حدود ۳ دقیقه</span>
            <span className="inline-flex items-center gap-1.5">📱 با تأیید پیامکی</span>
            <span className="inline-flex items-center gap-1.5">🎁 هدیه در پایان</span>
          </div>
        </div>
      </section>

      <section className="container-x relative z-10 -mt-8 max-w-3xl pb-16 sm:-mt-10">
        <QuizApp
          boot={{
            ...boot,
            phone: mobile,
            whatsapp: wa,
            shareUrl,
            referral: typeof ref === "string" ? ref.slice(0, 32) : undefined,
          }}
        />
        <p className="mt-8 text-center text-sm text-muted">
          <Link href="/" className="font-semibold text-royal hover:underline">ستارگان پلاس</Link>
          {" · "}نسیم‌شهر
        </p>
      </section>
    </>
  );
}
