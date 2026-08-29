import Link from "next/link";
import { PortalAccountType } from "@/generated/prisma/enums";
import { Container } from "@/components/ui/Container";
import { PortalNav, type PortalNavItem } from "@/components/portal/PortalNav";
import { PortalTheme } from "@/components/portal/theme/PortalTheme";

const studentNav = [
  { href: "/portal/student", label: "خانه", match: "exact" as const },
  { href: "/portal/student/profile", label: "پروفایل" },
  { href: "/portal/student/assessments", label: "آزمون‌ها" },
  { href: "/portal/student/achievements", label: "افتخارات" },
];

const parentNav = [
  { href: "/portal/parent", label: "خانه", match: "exact" as const },
  { href: "/portal/parent/students", label: "فرزندان" },
  { href: "/portal/parent/assessments", label: "آزمون‌ها" },
  { href: "/portal/parent/achievements", label: "افتخارات" },
];

type PortalShellProps = {
  children: React.ReactNode;
  accountType: PortalAccountType;
  userDisplayName: string;
  organizationName: string;
  showAccountSwitcher?: boolean;
  extraNavItems?: PortalNavItem[];
};

export function PortalShell({
  children,
  accountType,
  userDisplayName,
  organizationName,
  showAccountSwitcher = false,
  extraNavItems = [],
}: PortalShellProps) {
  const navItems =
    accountType === PortalAccountType.STUDENT ? studentNav : parentNav;
  const panelLabel =
    accountType === PortalAccountType.STUDENT ? "پرتال دانش‌آموز" : "پرتال والدین";

  return (
    <PortalTheme>
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-[color:var(--portal-border)] bg-[color:var(--portal-surface)]/95 backdrop-blur-sm">
          <Container className="py-3 sm:py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[color:var(--portal-muted)]">
                  {panelLabel}
                </p>
                <p className="truncate text-sm font-semibold text-[color:var(--portal-foreground)] sm:text-base">
                  {organizationName}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[color:var(--portal-accent-border)] bg-[color:var(--portal-accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--portal-foreground)]">
                  {userDisplayName}
                </span>
                {showAccountSwitcher ? (
                  <Link
                    href="/portal/select-account"
                    className="rounded-full border border-[color:var(--portal-border)] bg-[color:var(--portal-bg)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--portal-foreground)] hover:opacity-90"
                  >
                    تغییر حساب
                  </Link>
                ) : null}
                <form action="/portal/logout" method="post">
                  <button
                    type="submit"
                    className="rounded-full border border-[color:var(--portal-border)] bg-[color:var(--portal-bg)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--portal-foreground)] hover:opacity-90"
                  >
                    خروج
                  </button>
                </form>
              </div>
            </div>
            <div className="mt-3">
              <PortalNav items={[...navItems, ...extraNavItems]} />
            </div>
          </Container>
        </header>
        <main className="flex-1 py-5 sm:py-8">
          <Container>{children}</Container>
        </main>
      </div>
    </PortalTheme>
  );
}
