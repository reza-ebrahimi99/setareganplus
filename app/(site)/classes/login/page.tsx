import type { Metadata } from "next";
import { buildMeta } from "@/lib/seo";
import { safeNext } from "@/lib/classes/catalog";
import { LoginForm } from "@/components/classes/LoginForm";

export const metadata: Metadata = buildMeta({ title: "ورود به کلاس‌های ویدیویی", description: "ورود دانش‌آموز با نام، پایه، رشته و کد پیامکی.", path: "/classes/login", noindex: true });

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="container-x pb-16">
      <section className="cl-hero mb-6 px-6 py-8">
        <h1 className="cl-display relative text-3xl text-white">ورود به دوره‌ها</h1>
        <p className="relative mt-2 text-white/75">نام، پایه و رشته‌ات را بنویس. کد تأیید به موبایلت پیامک می‌شود.</p>
      </section>
      <LoginForm next={safeNext(sp.next)} />
    </div>
  );
}
