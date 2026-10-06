import { AcademyFooter } from "@/components/academy/AcademyFooter";
import { AcademyHeader } from "@/components/academy/AcademyHeader";
import { resolveAcademySession } from "@/lib/academy/auth/session";

export async function AcademyShell({
  children,
}: {
  children: React.ReactNode;
  activePath?: string;
}) {
  const session = await resolveAcademySession();

  return (
    <div className="academy-root" dir="rtl">
      <AcademyHeader isLoggedIn={Boolean(session)} />
      <main className="academy-main">{children}</main>
      <AcademyFooter />
    </div>
  );
}
