import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SocialIconLinks } from "@/components/ui/ContactIcons";
import { contactContent } from "@/content/home";
import { publicNavItems } from "@/content/public-nav";
import { footerContent, siteConfig } from "@/content/site";
import { toPersianDigits } from "@/lib/persian";

const ENAMAD_TRUST_URL =
  "https://trustseal.enamad.ir/?id=762691&Code=Jm7HRlnpSah7mgppTajp15hMnQLMeXSI";
const ENAMAD_LOGO_URL =
  "https://trustseal.enamad.ir/logo.aspx?id=762691&Code=Jm7HRlnpSah7mgppTajp15hMnQLMeXSI";

function footerGroup(label: string) {
  return publicNavItems.find((item) => item.label === label);
}

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const education = footerGroup("آموزش");
  const tools = footerGroup("ابزارها");
  const achievements = footerGroup("دستاوردها");

  return (
    <footer className="site-footer mt-auto border-t border-white/10 bg-[linear-gradient(180deg,#0f172a_0%,#0b1220_100%)] text-white">
      <Container className="py-16 sm:py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-medium tracking-[0.18em] text-secondary">
            اکوسیستم آموزشی
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight">{siteConfig.name}</p>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            {footerContent.description}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            {footerContent.note}
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-3">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-secondary">
                تماس
              </p>
              <ul className="space-y-1.5">
                {contactContent.phones.slice(0, 3).map((phone) => (
                  <li key={phone.href}>
                    <a
                      href={phone.href}
                      className="text-sm text-slate-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                      dir="ltr"
                    >
                      {toPersianDigits(phone.value)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium tracking-wide text-secondary">
                شبکه‌های اجتماعی
              </p>
              <SocialIconLinks
                items={contactContent.social}
                tone="dark"
                className="mt-3 flex flex-wrap items-center gap-2.5"
              />
            </div>
          </div>

          <nav aria-label="آموزش" className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-secondary">آموزش</h2>
            <ul className="mt-4 space-y-2.5">
              {(education?.children ?? [{ href: "/courses", label: "دوره‌ها" }]).map(
                (link) => (
                  <li key={`${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <nav aria-label="ابزارها" className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-secondary">ابزارها</h2>
            <ul className="mt-4 space-y-2.5">
              {(tools?.children ?? []).map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="دستاوردها" className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-secondary">دستاوردها</h2>
            <ul className="mt-4 space-y-2.5">
              {(achievements?.children ?? []).map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/gallery"
                  className="text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  گالری
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  درباره ما
                </Link>
              </li>
            </ul>
          </nav>

          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-secondary">آدرس‌ها</h2>
            <ul className="mt-4 space-y-4">
              {contactContent.branches.map((branch) => (
                <li key={branch.name}>
                  <p className="text-sm font-medium text-white">{branch.name}</p>
                  <p className="mt-1 text-xs leading-6 text-slate-400">
                    {toPersianDigits(branch.address)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-center text-sm text-slate-400 sm:text-start">
            © {toPersianDigits(String(currentYear))} {siteConfig.name} —{" "}
            {siteConfig.nameEn}
          </p>
          <a
            href={ENAMAD_TRUST_URL}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="origin"
            className="inline-flex shrink-0 rounded-xl border border-white/10 bg-white/95 p-2 transition hover:border-secondary/50 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            aria-label="نماد اعتماد الکترونیکی اینماد"
          >
            {/* Native <img> is required for Enamad trust-seal verification. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ENAMAD_LOGO_URL}
              alt="نماد اعتماد الکترونیکی (اینماد)"
              width={125}
              height={125}
              referrerPolicy="origin"
              className="h-16 w-16 object-contain sm:h-[4.5rem] sm:w-[4.5rem]"
            />
          </a>
        </div>
      </Container>
    </footer>
  );
}
