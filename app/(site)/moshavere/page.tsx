import type { Metadata } from "next";
import Link from "next/link";
import { BookWizard } from "@/components/consult/BookWizard";
import { InstagramGlyph } from "@/components/site/SocialLinks";
import { PageHero } from "@/components/site/Star";
import { GHALAMCHI_INSTAGRAM_URL } from "@/lib/social";
import { monthOf } from "@/lib/consult/availability";
import { SPECIAL_PATH } from "@/lib/consult/constants";
import { getConsultSettings } from "@/lib/consult/settings";
import { fa } from "@/lib/format";

export const metadata: Metadata = {
  title: "مشاوره رایگان",
  description: "رزرو مشاورهٔ رایگان ستارگان برای والدین و دانش‌آموزان از پایهٔ دوم تا کنکور؛ آنلاین یا حضوری در نسیم‌شهر، بدون پرداخت.",
  alternates: { canonical: "/moshavere" },
};

export const dynamic = "force-dynamic";

export default async function ConsultPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const sp = await searchParams;
  const settings = await getConsultSettings();
  const month = monthOf();
  const giftCode = typeof sp.code === "string" ? sp.code : "";
  return (
    <>
      <PageHero
        eyebrow="مشاوره رایگان ستارگان"
        title="نیم‌ساعت آرام، برای یک تصمیم روشن"
        text="از پایهٔ دوم تا کنکور، یک گفت‌وگوی رایگان با مشاور ستارگان. آنلاین یا حضوری در نسیم‌شهر. هیچ پرداختی در کار نیست."
        crumbs="مشاوره رایگان"
      />
      <div className="container-x relative z-10 -mt-10 pb-6">
        <ul className="mb-4 grid grid-cols-2 gap-2 text-center text-xs font-bold text-navy sm:grid-cols-4">
          {["رایگان", `${fa(settings.slotMinutes)} دقیقه`, "آنلاین یا حضوری", "از دوم تا کنکور"].map((t) => (
            <li key={t} className="rounded-2xl bg-paper/95 px-3 py-3 shadow-[var(--shadow-soft)] ring-1 ring-white">{t}</li>
          ))}
        </ul>
        <p className="mb-4 text-center">
          <a href={GHALAMCHI_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-paper/95 px-4 py-2 text-sm font-bold text-navy shadow-[var(--shadow-soft)] ring-1 ring-white">
            <InstagramGlyph className="size-5 text-royal" />
            ما را در اینستاگرام دنبال کنید
          </a>
        </p>
        {settings.publicOpen ? (
          <BookWizard audience="PUBLIC" initialMonth={month} slotMinutes={settings.slotMinutes} initialGiftCode={giftCode} />
        ) : (
          <div className="card px-6 py-12 text-center">
            <h2 className="text-xl font-black text-navy">رزرو آنلاین موقتاً بسته است</h2>
            <p className="mt-2 text-sm leading-7 text-muted">ستارگان به‌زودی وقت‌ها را دوباره باز می‌کند. تا آن زمان با آموزشگاه تماس بگیرید.</p>
          </div>
        )}
        <p className="mt-6 text-center text-sm text-muted">
          دانش‌آموز ستارگان هستید و کد جلسهٔ ویژه دارید؟{" "}
          <Link href={SPECIAL_PATH} className="font-bold text-royal">ورود با کد دانش‌آموزی</Link>
        </p>
      </div>
    </>
  );
}
