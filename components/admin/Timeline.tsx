export type TimelineNodeView = {
  id: string;
  label: string;
  status: "completed" | "current" | "upcoming";
  timestampLabel?: string | null;
  operator?: string | null;
  note?: string | null;
};

type TimelineProps = {
  nodes: readonly TimelineNodeView[];
  orientation?: "vertical" | "horizontal";
  size?: "sm" | "md";
  className?: string;
};

function nodeTone(status: TimelineNodeView["status"]): string {
  if (status === "completed") {
    return "border-success bg-success text-white";
  }
  if (status === "current") {
    return "border-secondary bg-secondary text-primary shadow-[0_0_0_4px_rgb(212_175_55_/_0.22)]";
  }
  return "border-border bg-background text-muted";
}

export function Timeline({
  nodes,
  orientation = "vertical",
  size = "md",
  className = "",
}: TimelineProps) {
  const compact = size === "sm";

  if (orientation === "horizontal") {
    return (
      <ol
        className={`flex items-center gap-1 ${className}`.trim()}
        aria-label="پیشرفت سفارش"
      >
        {nodes.map((node, index) => {
          const filled =
            node.status === "completed" || node.status === "current";
          const mark =
            node.status === "completed" ? "✓" : node.status === "current" ? "●" : "○";
          const hover = [
            node.label,
            node.timestampLabel,
            node.operator,
            node.note,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={node.id} className="flex min-w-0 flex-1 items-center gap-1">
              <span
                title={hover || node.label}
                className={`flex shrink-0 items-center justify-center rounded-full border text-[9px] leading-none ${
                  compact ? "size-4" : "size-5"
                } ${nodeTone(node.status)}`}
              >
                {mark}
              </span>
              {index < nodes.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`h-px min-w-[8px] flex-1 rounded-full ${
                    filled && nodes[index + 1]?.status !== "upcoming"
                      ? "bg-success/70"
                      : node.status === "current"
                        ? "bg-gradient-to-l from-border to-secondary"
                        : "bg-border"
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={`relative space-y-0 ${className}`.trim()} aria-label="خط زمان سفارش">
      {nodes.map((node, index) => {
        const last = index === nodes.length - 1;
        return (
          <li key={node.id} className="relative flex gap-3 pb-5 last:pb-0">
            <div className="relative flex w-4 shrink-0 flex-col items-center">
              <span
                className={`z-[1] mt-0.5 block rounded-full border ${compact ? "size-3" : "size-3.5"} ${nodeTone(node.status)}`}
              />
              {last ? null : (
                <span
                  aria-hidden="true"
                  className={`absolute top-4 bottom-[-4px] w-px ${
                    node.status === "completed" ? "bg-success/50" : "bg-border"
                  }`}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`font-medium leading-6 ${
                  node.status === "current"
                    ? "text-primary"
                    : node.status === "completed"
                      ? "text-foreground"
                      : "text-muted"
                } ${compact ? "text-sm" : "text-[15px]"}`}
              >
                {node.label}
              </p>
              {node.timestampLabel || node.operator ? (
                <p className="mt-0.5 text-xs leading-6 text-muted">
                  {node.timestampLabel}
                  {node.operator ? ` · ${node.operator}` : ""}
                </p>
              ) : null}
              {node.note ? (
                <p className="mt-1 rounded-lg bg-background px-2.5 py-1.5 text-xs leading-6 text-foreground">
                  {node.note}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
