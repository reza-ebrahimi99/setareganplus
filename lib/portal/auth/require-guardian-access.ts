import { redirect } from "next/navigation";
import { PortalAccountType } from "@/generated/prisma/enums";
import { requirePortalContext } from "@/lib/portal/auth/require-student-access";
import type { PortalContext } from "@/lib/portal/auth/types";

export async function requireGuardianPortalAccess(): Promise<PortalContext> {
  const context = await requirePortalContext();
  if (context.activeLink.accountType !== PortalAccountType.GUARDIAN) {
    redirect("/portal/select-account");
  }
  return context;
}
