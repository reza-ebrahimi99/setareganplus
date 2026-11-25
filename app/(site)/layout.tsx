import { Suspense } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AnalyticsBeacon } from "@/components/site/AnalyticsBeacon";
import { getSettings } from "@/lib/settings";
import { getShopSettings } from "@/lib/shop/settings";
import { prettyPhone, telHref } from "@/lib/format";

// Public pages can be cached briefly. Auth and booking routes keep their own force-dynamic.
export const revalidate = 60;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [s, shop] = await Promise.all([getSettings(), getShopSettings().catch(() => ({ open: true }))]);
  const p = s.contact.phones[0];
  return (
    <>
      <Header shopOpen={shop.open} phone={p ? { href: telHref(p), label: prettyPhone(p) } : undefined} />
      <main>{children}</main>
      <Footer contact={s.contact} shopOpen={shop.open} />
      <Suspense fallback={null}>
        <AnalyticsBeacon />
      </Suspense>
    </>
  );
}
