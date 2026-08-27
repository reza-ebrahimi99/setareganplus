import Link from "next/link";
import type { ExperienceQuickAction } from "@/lib/sxp/hub/load-home";

type ExperienceQuickActionsProps = {
  actions: ExperienceQuickAction[];
};

export function ExperienceQuickActions({ actions }: ExperienceQuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <section aria-label="اقدام سریع" className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action.code}
          href={action.href}
          className="min-h-11 rounded-xl border border-secondary/30 bg-secondary/10 px-3.5 py-2 text-sm font-medium text-primary"
        >
          {action.label}
        </Link>
      ))}
    </section>
  );
}
