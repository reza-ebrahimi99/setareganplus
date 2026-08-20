import type { CommerceBranchBadge } from "@/lib/commerce/branches";

type OrderBranchBadgeProps = {
  branch: CommerceBranchBadge | null;
  size?: "sm" | "md";
};

export function OrderBranchBadge({
  branch,
  size = "sm",
}: OrderBranchBadgeProps) {
  if (!branch) {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted">
        بدون شعبه
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 font-medium ${
        size === "sm" ? "py-0.5 text-[11px]" : "py-1 text-xs"
      }`}
      style={{
        borderColor: `${branch.accentColor}33`,
        backgroundColor: `${branch.accentColor}14`,
        color: branch.accentColor,
      }}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full"
        style={{ backgroundColor: branch.accentColor }}
      />
      {branch.name}
    </span>
  );
}
