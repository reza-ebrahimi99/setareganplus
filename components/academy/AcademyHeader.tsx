"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/courses", label: "دوره‌ها" },
  { href: "/videos", label: "ویدئوها" },
  { href: "/courses", label: "مسیر یادگیری" },
  { href: "/support", label: "پشتیبانی" },
] as const;

export function AcademyHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="academy-nav academy-nav-bar sticky top-0 z-40">
      <div className="academy-container academy-nav-inner">
        <Link href="/" className="academy-brand">
          <Image
            src="/images/brand/logo.png"
            alt="آکادمی ستارگان"
            width={120}
            height={40}
            className="academy-brand-logo"
            priority
          />
          <span className="academy-brand-title">آکادمی ستارگان</span>
        </Link>

        <nav className="academy-nav-desktop" aria-label="ناوبری اصلی">
          {navLinks.map((link) => {
            const active =
              pathname === link.href ||
              Boolean(pathname?.startsWith(`${link.href}/`));
            return (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className={active ? "academy-nav-link is-active" : "academy-nav-link"}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="academy-nav-actions">
          {isLoggedIn ? (
            <Link href="/account/library" className="academy-btn academy-btn-primary academy-btn-sm">
              کتابخانه من
            </Link>
          ) : (
            <>
              <Link href="/login" className="academy-btn academy-btn-secondary academy-btn-sm academy-hide-mobile">
                ورود
              </Link>
              <Link href="/login" className="academy-btn academy-btn-primary academy-btn-sm academy-show-mobile-only">
                ورود
              </Link>
            </>
          )}
          <button
            type="button"
            className="academy-nav-toggle"
            aria-expanded={open}
            aria-controls="academy-mobile-nav"
            aria-label={open ? "بستن منو" : "باز کردن منو"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="academy-nav-toggle-bar" />
            <span className="academy-nav-toggle-bar" />
            <span className="academy-nav-toggle-bar" />
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="academy-mobile-nav"
          className="academy-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="منوی موبایل"
        >
          <div className="academy-mobile-nav-panel">
            {navLinks.map((link) => (
              <Link
                key={`m-${link.href}-${link.label}`}
                href={link.href}
                className="academy-mobile-nav-link"
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={isLoggedIn ? "/account/library" : "/login"}
              className="academy-btn academy-btn-primary"
              onClick={closeMenu}
            >
              {isLoggedIn ? "کتابخانه من" : "ورود به حساب"}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
