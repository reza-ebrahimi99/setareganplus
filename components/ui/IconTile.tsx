type IconTileProps = {
  children: React.ReactNode;
  icon: React.ReactNode;
};

export function IconTile({ children, icon }: IconTileProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-primary shadow-sm">
        {icon}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
