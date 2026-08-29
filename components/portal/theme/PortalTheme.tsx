import {
  PORTAL_ACTIVE_THEME,
  type PortalThemeId,
} from "@/components/portal/theme/types";

type PortalThemeProps = {
  children: React.ReactNode;
  /**
   * Theme id applied via data-portal-theme.
   * Defaults to Classic — the only theme activated in product today.
   * Dark / Student / Guidance / Competition / Night are architecture only.
   */
  theme?: PortalThemeId;
  className?: string;
};

/**
 * Scopes portal design tokens under `.portal-os`.
 * Server Component — wrap portal chrome (Phase 1+) so Admin/Marketing stay untouched.
 */
export function PortalTheme({
  children,
  theme = PORTAL_ACTIVE_THEME,
  className,
}: PortalThemeProps) {
  return (
    <div
      className={["portal-os", className].filter(Boolean).join(" ")}
      data-portal-theme={theme}
    >
      {children}
    </div>
  );
}
