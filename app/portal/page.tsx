import { redirect } from "next/navigation";
import { PortalAccountType } from "@/generated/prisma/enums";
import {
  readActivePortalLinkCookie,
  requirePortalContext,
} from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const context = await requirePortalContext();
  const preferred = await readActivePortalLinkCookie();

  if (context.links.length > 1 && !preferred) {
    redirect("/portal/select-account");
  }

  if (context.activeLink.accountType === PortalAccountType.STUDENT) {
    redirect("/portal/student");
  }

  redirect("/portal/parent");
}
