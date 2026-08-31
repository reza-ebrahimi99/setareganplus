/**
 * Major Selection OS lives at /ms. This route only exists so old links still open the office.
 */

import { redirect } from "next/navigation";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function GuidancePortalServicePage() {
  await requireStudentPortalAccess();
  redirect("/ms");
}
