import "katex/dist/katex.min.css";
import "./classes.css";
import { Shell } from "@/components/classes/Shell";
import { getClassStudent } from "@/lib/classes/session";

export const dynamic = "force-dynamic";

export default async function ClassesLayout({ children }: { children: React.ReactNode }) {
  const student = await getClassStudent().catch(() => null);
  return <Shell student={student ? { firstName: student.firstName, points: student.points } : null}>{children}</Shell>;
}
