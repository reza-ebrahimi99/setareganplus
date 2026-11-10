import { TopBar } from "./TopBar";

export function Shell({ student, children }: { student: { firstName: string; points: number } | null; children: React.ReactNode }) {
  return (
    <div className="cl">
      <TopBar student={student} />
      {children}
    </div>
  );
}
