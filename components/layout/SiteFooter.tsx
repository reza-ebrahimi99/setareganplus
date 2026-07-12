import Link from "next/link";
import { footerContent, navLinks, siteConfig } from "@/content/site";
import { Container } from "@/components/ui/Container";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <Container className="py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-lg font-bold text-primary">{siteConfig.name}</p>
            <p className="mt-2 text-sm leading-7 text-muted">
              {footerContent.description}
            </p>
          </div>

          <nav aria-label="پیوندهای پاورقی">
            <h2 className="text-sm font-semibold text-primary">دسترسی سریع</h2>
            <ul className="mt-3 space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-sm font-semibold text-primary">وضعیت سکو</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              {footerContent.note}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-center text-sm text-muted">
            © {currentYear} {siteConfig.name} — {siteConfig.nameEn}
          </p>
        </div>
      </Container>
    </footer>
  );
}
