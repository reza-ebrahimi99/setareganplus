import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SkipLink } from "./SkipLink";

type SiteShellProps = {
  children: React.ReactNode;
  activePath?: string;
};

export function SiteShell({ children, activePath }: SiteShellProps) {
  const isHome = activePath === "/";

  return (
    <>
      <SkipLink />
      <SiteHeader activePath={activePath} />
      {!isHome ? (
        <div aria-hidden="true" className="site-header-spacer" />
      ) : null}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
