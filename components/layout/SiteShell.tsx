import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SkipLink } from "./SkipLink";

type SiteShellProps = {
  children: React.ReactNode;
  activePath?: string;
};

export function SiteShell({ children, activePath }: SiteShellProps) {
  return (
    <>
      <SkipLink />
      <SiteHeader activePath={activePath} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
