import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SocialIconLinks } from "@/components/ui/ContactIcons";
import { contactContent } from "@/content/home";
import {
  footerContent,
  footerLinks,
  siteConfig,
} from "@/content/site";
import { publicNavLinks as navLinks } from "@/content/public-nav";
import { services } from "@/content/services";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const informationLinks = footerLinks;
  const supportLinks = [
    { href: "/pre-registration", label: "پیش‌ثبت‌نام" },
    { href: "/faq", label: "سوالات متداول" },
    { href: "/contact", label: "تماس" },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-primary text-white">
      <Container className="py-12">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="mb-3 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              وضعیت توسعه
            </p>
            <p className="text-xl font-bold">{siteConfig.name}</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {footerContent.description}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              {footerContent.note}
            </p>
            <div className="mt-5">
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

          <nav aria-label="خدمات" className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-secondary">خدمات</h2>
            <ul className="mt-4 space-y-2">
              {services.map((service) => (
                <li key={service.href}>
                  <Link
                    href={service.href}
                    className="text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="اطلاعات" className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-secondary">اطلاعات</h2>
            <ul className="mt-4 space-y-2">
              {informationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {navLinks
                .filter((link) => link.href === "/")
                .map((link) => (
                  <li key={link.href}>
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

          <nav aria-label="پشتیبانی" className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-secondary">پشتیبانی</h2>
            <ul className="mt-4 space-y-2">
              {supportLinks.map((link) => (
                <li key={link.href}>
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

          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-secondary">توسعه سکو</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              ثبت‌نام آنلاین، پنل‌ها و خدمات عملیاتی هنوز فعال نشده‌اند و پس از
              آماده‌سازی زیرساخت منتشر می‌شوند.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-center text-sm text-slate-400">
            © {currentYear} {siteConfig.name} — {siteConfig.nameEn}
          </p>
        </div>
      </Container>
    </footer>
  );
}
