import { redirect } from "next/navigation";
import { GUIDANCE_PLATFORM_HOME } from "@/lib/guidance/portal-nav";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

/** Legacy Major Office entry — forwards to the official guidance dashboard. */
export default async function MajorOfficeHomePage() {
  await requireStudentPortalAccess();
  redirect(GUIDANCE_PLATFORM_HOME);
}
