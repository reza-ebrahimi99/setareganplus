"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  PORTAL_ACTIVE_THEME,
  PORTAL_ENABLED_THEMES,
  PORTAL_THEME_STORAGE_KEY,
  isPortalThemeId,
  resolveAppliedPortalTheme,
  type PortalThemeId,
} from "@/components/portal/theme/types";

type PortalThemeContextValue = {
  /** Preference stored / requested (may be a future theme). */
  preferredTheme: PortalThemeId;
  /** Theme actually applied on `.portal-os` (Classic-only today). */
  appliedTheme: PortalThemeId;
  enabledThemes: readonly PortalThemeId[];
  setTheme: (theme: PortalThemeId) => void;
};

const PortalThemeContext = createContext<PortalThemeContextValue | null>(null);

type PortalThemeProviderProps = {
  children: React.ReactNode;
  className?: string;
  /** Optional SSR/default preference override (still Classic-applied if disabled). */
  defaultTheme?: PortalThemeId;
};

/**
 * Client theme root: scopes `.portal-os`, persists preference to localStorage,
 * applies only enabled themes (Classic today).
 */
export function PortalThemeProvider({
  children,
  className,
  defaultTheme = PORTAL_ACTIVE_THEME,
}: PortalThemeProviderProps) {
  const [preferredTheme, setPreferredTheme] =
    useState<PortalThemeId>(defaultTheme);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PORTAL_THEME_STORAGE_KEY);
      if (raw && isPortalThemeId(raw)) {
        setPreferredTheme(raw);
      }
    } catch {
      // Private mode / blocked storage — keep default.
    }
    setHydrated(true);
  }, []);

  const setTheme = useCallback((theme: PortalThemeId) => {
    setPreferredTheme(theme);
    try {
      window.localStorage.setItem(PORTAL_THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore quota / privacy errors; in-memory preference still updates.
    }
  }, []);

  const appliedTheme = resolveAppliedPortalTheme(preferredTheme);

  const value = useMemo<PortalThemeContextValue>(
    () => ({
      preferredTheme,
      appliedTheme,
      enabledThemes: PORTAL_ENABLED_THEMES,
      setTheme,
    }),
    [preferredTheme, appliedTheme, setTheme],
  );

  return (
    <PortalThemeContext.Provider value={value}>
      <div
        className={["portal-os", className].filter(Boolean).join(" ")}
        data-portal-theme={appliedTheme}
        data-portal-theme-hydrated={hydrated ? "true" : "false"}
        suppressHydrationWarning
      >
        {children}
      </div>
    </PortalThemeContext.Provider>
  );
}

export function usePortalTheme(): PortalThemeContextValue {
  const ctx = useContext(PortalThemeContext);
  if (!ctx) {
    throw new Error("usePortalTheme must be used within PortalThemeProvider");
  }
  return ctx;
}
