import { getDefaultPublicNavItems } from "@/lib/guidance/nav";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { getPublicOrganizationBySlug } from "@/lib/organizations/get-current-organization";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SkipLink } from "./SkipLink";

type SiteShellProps = {
  children: React.ReactNode;
  activePath?: string;
};

async function resolveGuidanceNavEnabled(): Promise<boolean> {
  try {
    const organization = await getPublicOrganizationBySlug();
    return isGuidanceEnabled(organization.id);
  } catch {
    // Org missing / DB unavailable — treat as off (do not expose Guidance nav).
    return false;
  }
}

export async function SiteShell({ children, activePath }: SiteShellProps) {
  const isHome = activePath === "/";
  const guidanceEnabled = await resolveGuidanceNavEnabled();
  const navItems = getDefaultPublicNavItems(guidanceEnabled);

  return (
    <>
      <SkipLink />
      <SiteHeader activePath={activePath} navItems={navItems} />
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
