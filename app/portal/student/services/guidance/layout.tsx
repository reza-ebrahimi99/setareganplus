import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function GuidanceOsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await requireStudentPortalAccess();
  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) notFound();

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  if (pathname.startsWith(GUIDANCE_ONBOARDING_PATH)) {
    return children;
  }

  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  // No onboarding gate here either — see app/portal/student/layout.tsx.
  return children;
}
